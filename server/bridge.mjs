
import http from "node:http";
import { spawn, execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const PORT = Number(process.env.PORT || 8080);
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = process.env.DIST_DIR || path.join(ROOT, "dist");
const HOME_DIR = process.env.HOME_DIR || process.env.HOME || "/data/home";
const HERMES = process.env.HERMES_BIN || "/data/home/.local/bin/hermes";
const OPENCODE = process.env.OPENCODE_BIN || "/data/home/.opencode/bin/opencode";
const OC_MODEL = process.env.OC_MODEL || "jerouter/deepseek-v4.1-flash-1017";
const WORKSPACE = process.env.WORKSPACE_DIR || path.join(ROOT, "runs");
const STAGING_ROOT = process.env.STAGING_DIR || path.join(ROOT, "staging");
const SKILLS_DIR = process.env.SKILLS_DIR || path.join(ROOT, "skills");
const MANAGER = "manager";
const WORKERS = ["researcher", "developer", "designer", "content", "analyst", "qa"];
const WORKER_LIMIT = 6;
const WORKER_TIMEOUT = Number(process.env.WORKER_TIMEOUT_MS || 900000);
const PLANNER_TIMEOUT = Number(process.env.PLANNER_TIMEOUT_MS || 420000);
const ENV = {
  ...process.env,
  PATH: [
    path.dirname(HERMES),
    path.dirname(OPENCODE),
    process.env.PATH || "/usr/local/bin:/usr/bin:/bin",
  ].join(":"),
  NO_COLOR: "1",
  TERM: "dumb",
  IMAGE_KEY: process.env.IMAGE_KEY || "",
  IMAGE_MODEL: process.env.IMAGE_MODEL || "ig",
  IMAGE_GATEWAY: process.env.IMAGE_GATEWAY || process.env.OC_GATEWAY || "https://je.jerouter.web.id/v1",
};

const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, "data");
const PROJECTS_FILE = path.join(DATA_DIR, "projects.json");
const MAX_MD = 200 * 1024;
const MAX_IMG = 2 * 1024 * 1024;

const AUTH_FILE = path.join(DATA_DIR, "auth.json");
const SESSION_TTL = 30 * 24 * 3600 * 1000; // 30 days
// token -> { exp, role }. Two roles exist: "owner" may run commands, "guest"
// may only read. The role is held on the server, so a guest cannot upgrade
// itself by editing anything in the browser.
const sessions = new Map();

function readAuth() {
  try {
    const a = JSON.parse(fs.readFileSync(AUTH_FILE, "utf8"));
    return a && a.salt && a.hash ? a : null;
  } catch { return null; }
}
function pruneSessions() {
  const now = Date.now();
  for (const [t, s] of sessions) if (!s || s.exp < now) sessions.delete(t);
}
function newSession(role) {
  pruneSessions();
  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, {
    exp: Date.now() + SESSION_TTL,
    role: role === "guest" ? "guest" : "owner",
  });
  return token;
}
function checkPassword(password) {
  const a = readAuth();
  if (!a) return false;
  const test = crypto.scryptSync(String(password), a.salt, 64);
  const want = Buffer.from(a.hash, "hex");
  if (test.length !== want.length) return false;
  return crypto.timingSafeEqual(test, want);
}
function sessionOf(req) {
  if (!readAuth()) return { exp: Infinity, role: "owner" }; // no password set: the bridge stays open
  const live = (t) => {
    const s = t ? sessions.get(t) : null;
    return s && s.exp > Date.now() ? s : null;
  };
  const header = String(req.headers["x-0xyas-token"] || "");
  const direct = live(header);
  if (direct) return direct;
  let q = "";
  try { q = new URL("http://localhost" + req.url).searchParams.get("token") || ""; } catch {}
  return live(q);
}
function authorized(req) {
  return Boolean(sessionOf(req));
}

// Guest tokens are read only. Anything that changes state, starts a run or
// spends gateway credits is refused here, not merely hidden in the UI.
const GUEST_READ = new Set([
  "/api/state",
  "/api/stream",
  "/api/whoami",
  "/api/projects",
  "/api/projects/detail",
  "/api/files",
  "/api/file",
  "/api/skills",
  "/api/knowledge",
  "/api/runtime",
]);

function readProjects() {
  try {
    const parsed = JSON.parse(fs.readFileSync(PROJECTS_FILE, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function writeProjects(list) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = PROJECTS_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(list));
  fs.renameSync(tmp, PROJECTS_FILE);
}

function updateProject(id, patch) {
  if (!id) return;
  const list = readProjects();
  const i = list.findIndex((p) => p.id === id);
  if (i < 0) return;
  list[i] = { ...list[i], ...patch, updatedAt: new Date().toISOString() };
  writeProjects(list);
}

// A run cannot survive a restart: sessions are in memory and the child agents
// die with the process. A project left at "running" would then claim work that
// is not happening, while the Tasks panel correctly shows nothing. Reconcile on
// boot so the two views agree.
function reconcileProjects() {
  const list = readProjects();
  let changed = 0;
  const now = new Date().toISOString();
  for (const p of list) {
    if (p.status === "running" || p.status === "planning") {
      p.status = "interrupted";
      p.updatedAt = now;
      p.finishedAt = p.finishedAt || now;
      changed++;
    }
  }
  if (changed) writeProjects(list);
  return changed;
}

function projectSummary(p) {
  const words = String(p.prompt || "").trim().split(" ").filter(Boolean).length;
  return {
    id: p.id,
    title: p.title,
    createdAt: p.createdAt,
    words: words,
    mdName: p.md ? p.md.name : null,
    mdSize: p.md ? p.md.content.length : 0,
    imageName: p.image ? p.image.name : null,
    hasImage: !!(p.image && p.image.dataUrl),
    folder: "agent-workspace/projects/" + p.id,
    status: p.status || "new",
    progress: typeof p.progress === "number" ? p.progress : 0,
    workersDone: p.workersDone || 0,
    workerCount: p.workerCount || 0,
    lastRunId: p.lastRunId || null,
    lastRunAt: p.lastRunAt || null,
    finishedAt: p.finishedAt || null
  };
}

const clients = new Set();
let state = { runId: null, prompt: "", status: "idle", startedAt: null, finishedAt: null, tasks: [], error: null, mode: "live", projectId: null };

function emit(ev) {
  const payload = JSON.stringify({ ts: Date.now(), runId: state.runId, ...ev });
  for (const res of clients) { try { res.write("data: " + payload + "\n\n"); } catch {} }
  if (ev.kind === "task" || ev.kind === "state") return;
  console.log("[" + (ev.agent || "-") + "] " + ev.kind + ": " + String(ev.text || "").slice(0, 120));
}

function upsertTask(t) {
  const i = state.tasks.findIndex((x) => x.id === t.id);
  if (i >= 0) state.tasks[i] = { ...state.tasks[i], ...t };
  else state.tasks.push(t);
  emit({ kind: "task", task: state.tasks.find((x) => x.id === t.id) });
}

function run(cmd, args, cwd, onLine, timeoutMs) {
  return new Promise((resolve) => {
    const p = spawn(cmd, args, { cwd, env: ENV, stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let err = "";
    const feed = (buf, isErr) => {
      const s = buf.toString();
      if (isErr) err += s; else out += s;
      for (const line of s.split(/\r?\n/)) {
        const t = line.trim();
        if (t && onLine) onLine(t, isErr);
      }
    };
    p.stdout.on("data", (b) => feed(b, false));
    p.stderr.on("data", (b) => feed(b, true));
    const timer = setTimeout(() => { try { p.kill("SIGKILL"); } catch {} }, timeoutMs || WORKER_TIMEOUT);
    p.on("close", (code) => { clearTimeout(timer); resolve({ code, out, err }); });
    p.on("error", (e) => { clearTimeout(timer); resolve({ code: -1, out, err, spawnError: String(e) }); });
  });
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

const TRANSIENT = /database is locked|SQLITE_BUSY|busy|ECONNRESET|ETIMEDOUT|socket hang up|timed out|timeout|rate.?limit|too many requests|\b429\b|\b502\b|\b503\b|overloaded|temporarily unavailable|FreeTierError/i;

// oxlint-disable-next-line no-control-regex -- ANSI escapes are control characters.
const ANSI = /\u001B\[[0-9;?]*[A-Za-z]|\u001B\][^\u0007]*\u0007/g;

function cleanLine(line) {
  return String(line).replace(ANSI, "").replace(/\s+$/, "");
}

function isNoise(line) {
  const t = cleanLine(line).trim();
  if (!t || t.length < 4) return true;
  if (/^[←→↩✗✓✘•·]/.test(t)) return true;
  if (/^[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏⣿⣷⣯⣟⡿⢿⣻⣽]/.test(t)) return true;
  if (/^[d-][rwx-]{9}[.\s]/.test(t)) return true;
  if (/^total \d+$/.test(t)) return true;
  if (/^(assert|print|import |from |def |class |#|\/\/|let |const |var |if |else|elif |except|finally|for |while |return |try|with |yield |raise |del |break|continue|pass|super\(\)|self\.|@)/.test(t)) return true;
  if (/^\$ /.test(t)) return true;
  if (/^[)\]}]+\s*$/.test(t)) return true;
  if (/;[^=]*=/.test(t) && !/\s(?:adalah|and|or|dengan|of|is)\s/.test(t)) return true;
  if (/^[a-zA-Z_]\w*=[a-z_]\w*\(/.test(t)) return true;
  if (/;/.test(t) && /[()[\]{}]/.test(t) && !/\s(?:adalah|and|or|dengan|of|is)\s/.test(t)) return true;
  if (/^[a-z_]+\s*=\s*[({[]/.test(t)) return true;
  return false;
}

let skillsCache = null;
function skillsIndex() {
  if (skillsCache) return skillsCache;
  const base = SKILLS_DIR;
  const out = [];
  try {
    for (const name of fs.readdirSync(base)) {
      const dir = base + "/" + name;
      if (!fs.statSync(dir).isDirectory()) continue;
      let desc = "";
      const md = dir + "/SKILL.md";
      if (fs.existsSync(md)) {
        const txt = fs.readFileSync(md, "utf8");
        const m2 = txt.match(/^description:\s*(.+)$/m);
        if (m2) desc = m2[1].trim();
      }
      out.push({ name, desc });
    }
  } catch {}
  skillsCache = out;
  return out;
}

function matchSkills(text, limit) {
  const words = String(text || "").toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 3);
  const scored = skillsIndex()
    .map((s) => {
      const name = s.name.toLowerCase();
      const desc = s.desc.toLowerCase();
      let score = 0;
      for (const w of words) {
        if (name.includes(w)) score += 3;
        else if (desc.includes(w)) score += 1;
      }
      return { name: s.name, score };
    })
    .filter((s) => s.score >= 6)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, limit || 2);
}

let runtimeCache = null;
let runtimeAt = 0;
let runtimeTtl = 30000;

// A version probe runs a real binary. A transient exec failure must never be
// reported as "not connected", so retry once and keep track of whether the
// probe itself succeeded.
function probeVersion(bin) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const out = execFileSync(bin, ["--version"], {
        timeout: 20000,
        env: ENV,
        stdio: ["ignore", "pipe", "pipe"],
      }).toString().trim();
      return { ok: true, version: out ? out.split(/\r?\n/)[0].slice(0, 120) : null };
    } catch (e) {
      // Missing or non-executable binary is a definitive answer, not a glitch.
      if (e && (e.code === "ENOENT" || e.code === "EACCES")) {
        return { ok: true, version: null };
      }
      // Otherwise retry once: a busy box can refuse a large binary for a moment.
    }
  }
  return { ok: false, version: null };
}

function runtimeInfo() {
  if (runtimeCache && Date.now() - runtimeAt < runtimeTtl) return runtimeCache;
  let memory = null;
  try {
    const db = process.env.ICM_DB || path.join(HOME_DIR, ".local/share/icm/memories.db");
    memory = { path: db, sizeKb: Math.round(fs.statSync(db).size / 1024) };
  } catch {}
  let skills = 0;
  try {
    const base = SKILLS_DIR;
    skills = fs.readdirSync(base).filter((n) => fs.statSync(path.join(base, n)).isDirectory()).length;
  } catch {}
  const hermes = probeVersion(HERMES);
  const opencode = probeVersion(OPENCODE);
  runtimeCache = {
    bridge: "node " + process.version,
    hermes: hermes.version,
    hermesOk: hermes.ok,
    opencode: opencode.version,
    opencodeOk: opencode.ok,
    model: OC_MODEL,
    gateway: process.env.OC_GATEWAY || "https://je.jerouter.web.id/v1",
    workspace: WORKSPACE,
    memory,
    skills,
    updatedAt: new Date().toISOString(),
  };
  runtimeAt = Date.now();
  // A failed probe retries in 5s instead of staying wrong for a full minute.
  runtimeTtl = hermes.ok && opencode.ok ? 30000 : 5000;
  return runtimeCache;
}

function tail2(text, fallback) {
  const lines = String(text || "").split(/\r?\n/).map((l) => cleanLine(l)).filter(Boolean);
  if (lines.length === 0) return fallback;
  return lines.slice(-2).join(" | ").slice(0, 300);
}

async function runRetry(cmd, args, cwd, onLine, timeoutMs) {
  let last = null;
  for (let i = 0; i < 2; i++) {
    if (i > 0) await sleep(4000);
    last = await run(cmd, args, cwd, onLine, timeoutMs);
    if (last.code === 0) return last;
    // A killed worker (code null) is a timeout, not a model failure: retry it once.
    if (last.code === null) {
      console.log("[retry] " + cmd + " hit the wall-clock limit, attempt " + (i + 1));
      continue;
    }
    if (!TRANSIENT.test(tail2(last.err + "\n" + last.out, ""))) return last;
    console.log("[retry] transient failure for " + cmd + ", attempt " + (i + 1));
  }
  return last;
}

function extractJson(text) {
  const src = String(text || "");
  const start = src.indexOf("{");
  const end = src.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try { return JSON.parse(src.slice(start, end + 1)); } catch {}
  // Lenient fallback: scan each {"tasks" ... } block with a brace counter so
  // prose or repeated blocks around the JSON do not break the plan.
  let idx = src.indexOf('{"tasks"');
  while (idx >= 0) {
    let depth = 0;
    for (let i = idx; i < src.length; i++) {
      const c = src[i];
      if (c === "{") depth++;
      else if (c === "}") {
        depth--;
        if (depth === 0) {
          try { return JSON.parse(src.slice(idx, i + 1)); } catch { break; }
        }
      }
    }
    idx = src.indexOf('{"tasks"', idx + 1);
  }
  return null;
}

const PLANNER = (prompt, strict = false) => [
  "You are the office manager. Break this request into 2 to 4 concrete subtasks.",
  "Each subtask must be fully self-contained. The worker has an EMPTY directory and cannot see any project files.",
  "Never reference file paths, folders or code outside the worker directory. Describe the deliverable and let the worker create it.",
  "Each subtask prompt must state the exact file name to create and the content required.",
  "Answer with ONLY compact JSON, no prose, no markdown:",
  '{"tasks":[{"agent":"developer","title":"short title","prompt":"exact instruction for the worker"}]}',
  "Allowed agent values: researcher, developer, designer, content, analyst, qa.",
  "Available skills: " + skillsIndex().map((s) => s.name).join(", ") + ".",
  "If a skill clearly fits a subtask, name it in that subtask prompt as: Use the <skill> skill.",
  strict ? "Keep every subtask prompt under 220 characters. One JSON object, nothing else, no line breaks inside string values." : "",
  "Request: " + prompt,
].filter(Boolean).join("\n");

// A planner answer counts as usable when it carries at least one task, whatever
// the exit code was: hermes sometimes prints the JSON and still exits non-zero.
function pickPlan(res) {
  if (!res) return null;
  for (const text of [res.out, res.err]) {
    const parsed = extractJson(text);
    if (parsed && Array.isArray(parsed.tasks) && parsed.tasks.length > 0) return parsed;
  }
  return null;
}

// Keep the raw planner answer on disk so a failed plan can be diagnosed later
// instead of dumping the model output into the UI.
function logPlanner(label, res, prompt) {
  try {
    const record = {
      at: new Date().toISOString(),
      label,
      code: res ? res.code : null,
      outLen: String((res && res.out) || "").length,
      errLen: String((res && res.err) || "").length,
      tail: String((res && (res.err || res.out)) || "").slice(-800),
      prompt: String(prompt || "").slice(0, 120),
    };
    fs.appendFileSync(path.join(DATA_DIR, "planner-debug.log"), JSON.stringify(record) + "\n");
  } catch {}
}

async function orchestrate(prompt, projectId, workdir) {
  const project = projectId ? readProjects().find((p) => p.id === projectId) : null;
  const rid = "run_" + Date.now().toString(36);
  const runRoot = workdir
    ? path.join(workdir, rid)
    : project
    ? path.join(WORKSPACE, "projects", project.id)
    : path.join(WORKSPACE, rid);
  fs.mkdirSync(runRoot, { recursive: true });
  state = { runId: rid, prompt, status: "planning", startedAt: Date.now(), finishedAt: null, tasks: [], error: null, mode: "live", projectId: project ? project.id : null };
  if (project) {
    updateProject(project.id, {
      status: "planning",
      progress: 0,
      workersDone: 0,
      workerCount: 0,
      lastRunId: state.runId,
      lastRunAt: new Date().toISOString(),
      finishedAt: null
    });
  }
  emit({ kind: "reset" });
  emit({ kind: "run", status: "planning", prompt });
  emit({ agent: MANAGER, kind: "start", text: "Planning: " + prompt.slice(0, 80) });
  upsertTask({ id: "plan", agent: MANAGER, title: "Plan the work", status: "running", progress: 0, output: "" });

  const plan = await runRetry(HERMES, ["-z", PLANNER(prompt)], HOME_DIR, (line) => {
    if (isNoise(line)) return;
    emit({ agent: MANAGER, kind: "log", text: cleanLine(line).slice(0, 200) });
  }, PLANNER_TIMEOUT);

  logPlanner("plan", plan, prompt);
  let parsed = pickPlan(plan);
  if (!parsed) {
    // The usual failure is a truncated or prose-wrapped JSON answer. One stricter
    // attempt is cheaper than failing a run the user already paid a slot for.
    const retry = await runRetry(HERMES, ["-z", PLANNER(prompt, true)], HOME_DIR, (line) => {
      if (isNoise(line)) return;
      emit({ agent: MANAGER, kind: "log", text: cleanLine(line).slice(0, 200) });
    }, PLANNER_TIMEOUT);
    logPlanner("plan-strict-retry", retry, prompt);
    parsed = pickPlan(retry);
  }
  if (!parsed) {
    const reason = "manager returned no usable plan (exit " + (plan.code === null ? "timeout" : plan.code) + ", " + String(plan.out || "").length + " chars, see data/planner-debug.log)";
    state.status = "failed";
    state.error = reason || "manager returned no plan";
    state.finishedAt = Date.now();
    if (project) updateProject(project.id, { status: "failed", finishedAt: new Date().toISOString() });
    upsertTask({ id: "plan", agent: MANAGER, title: "Plan the work", status: "error", progress: 0, output: state.error });
    emit({ agent: MANAGER, kind: "error", text: state.error });
    emit({ kind: "run", status: "failed", error: state.error });
    return;
  }

  const items = parsed.tasks.slice(0, WORKER_LIMIT);
  upsertTask({ id: "plan", agent: MANAGER, title: "Plan the work", status: "done", progress: 100, output: items.length + " subtasks" });
  emit({ agent: MANAGER, kind: "done", text: items.length + " subtasks assigned" });
  state.status = "running";
  if (project) updateProject(project.id, { status: "running", workerCount: items.length, progress: 0, note: null });

  let doneCount = 0;
  const jobs = items.map(async (it, idx) => {
    if (idx > 0) await sleep(5000);
    const agent = WORKERS.includes(it.agent) ? it.agent : WORKERS[idx % WORKERS.length];
    const id = "t" + (idx + 1);
    const cleanPrompt = String(it.prompt || it.title || "").replace(/\/data\/(?!home\/0xyas-office\/bin\/appvm\b)[^\s"\x27]+/g, "the current directory");
    upsertTask({ id, agent, title: it.title || it.prompt, status: "running", progress: 0, output: "" });
    emit({ agent, kind: "start", text: it.title || it.prompt });
    const dir = path.join(runRoot, agent);
    fs.mkdirSync(dir, { recursive: true });
    let last = "";
    const helpersSrc = path.join(ROOT, "helpers");
    if (fs.existsSync(helpersSrc) && fs.statSync(helpersSrc).isDirectory()) {
      const helpersDst = path.join(dir, ".helpers");
      fs.mkdirSync(helpersDst, { recursive: true });
      for (const hn of fs.readdirSync(helpersSrc)) {
        fs.copyFileSync(path.join(helpersSrc, hn), path.join(helpersDst, hn));
      }
    }
    const skills = matchSkills((it.title || "") + " " + cleanPrompt, 2);
    const copied = [];
    for (const sk of skills) {
      try {
        const src = path.join(SKILLS_DIR, sk.name, "SKILL.md");
        if (fs.existsSync(src)) {
          const dst = path.join(dir, ".skills", sk.name);
          fs.mkdirSync(dst, { recursive: true });
          fs.copyFileSync(src, path.join(dst, "SKILL.md"));
          copied.push(sk.name);
        }
      } catch {}
    }
    const skillHint = copied.length
      ? " Skills you may consult if they actually apply: " + copied.map((n) => n + " at .skills/" + n + "/SKILL.md").join("; ") + "."
      : "";
    const verify = agent === "qa"
      ? " You are the QA worker, so verifying is your job: run the checks, tests or scripts you need inside this directory and report the real results, including any failure."
      : " Before you finish, run the checks you need inside this directory (node --check, syntax check, a small test run).";
    const targetRule = "Write every deliverable inside the current directory. Every worker runs in its own separate directory, so a file produced by another worker is not in yours: never report another worker's file as missing, and judge only what you can see here. You may read files elsewhere on the machine for reference, but never modify anything outside the current directory.";
    const bashRule = "Use the bash tool freely for commands that only touch this directory.";
    const imageRule = fs.existsSync(path.join(dir, ".helpers", "image-gen")) ? "If the user asks for a real photo or image, run `bash .helpers/image-gen '<prompt>' [size]` to generate a .jpg, then reference it in your deliverables." : "";
    const workerPrompt = [
      "You are one specialist worker in an agent office. Work autonomously and never ask for confirmation: nobody is present to approve anything.",
      targetRule,
      bashRule,
      imageRule,
      "Do not launch a browser and do not ask questions.",
      verify,
      "When the deliverables exist, reply with one short sentence summarising what you produced, then stop.",
    ].join(" ") + skillHint + " " + cleanPrompt;
    const started = Date.now();
    return runRetry(OPENCODE, ["run", "--auto", "--dir", dir, "-m", OC_MODEL, workerPrompt], dir, (line) => {
      if (isNoise(line)) return;
      last = cleanLine(line);
      emit({ agent, kind: "log", text: last.slice(0, 200) });
    }, WORKER_TIMEOUT).then((r) => {
      console.log("[" + agent + "] worker exit: " + r.code + " in " + Math.round((Date.now() - started) / 1000) + "s");
      const madeFiles = fs.readdirSync(dir).filter((n) => n !== ".skills");
      const hardFail = /^(Error:|FreeTierError|no credentials|database is locked)|rejected permission/m.test(r.out + "\n" + r.err);
      const ok = r.code === 0 && madeFiles.length > 0 && !hardFail;
      const text = (ok ? r.out : r.err || r.out).trim().split("\n").filter(Boolean).slice(-1)[0] || last;
      if (ok) {
        const summary = tail2(r.out, "done");
        upsertTask({ id, agent, title: it.title || it.prompt, status: "done", progress: 100, output: summary.slice(0, 160) });
        emit({ agent, kind: "done", text: summary.slice(0, 160) });
      } else {
        const failure = tail2(r.err + "\n" + r.out, text || "failed");
        upsertTask({ id, agent, title: it.title || it.prompt, status: "error", progress: 0, output: failure });
        emit({ agent, kind: "error", text: failure });
      }
      doneCount += 1;
      if (project) {
        updateProject(project.id, {
          workersDone: doneCount,
          progress: Math.round((doneCount / Math.max(1, items.length)) * 100)
        });
      }
      return ok;
    });
  });

  const results = await Promise.all(jobs);
  const okCount = results.filter(Boolean).length;
  state.status = okCount === results.length ? "done" : "failed";
  state.finishedAt = Date.now();
  const summary = okCount + "/" + results.length + " workers succeeded";
  upsertTask({ id: "review", agent: MANAGER, title: "Review output", status: state.status === "done" ? "done" : "error", progress: state.status === "done" ? 100 : 0, output: summary });
  emit({ agent: MANAGER, kind: "done", text: summary });
  if (project) {
    updateProject(project.id, {
      status: state.status === "done" ? "done" : "failed",
      progress: state.status === "done" ? 100 : Math.round((okCount / Math.max(1, results.length)) * 100),
      workersDone: okCount,
      finishedAt: new Date().toISOString()
    });
  }
  emit({ kind: "run", status: state.status });
}

// --- artifacts -------------------------------------------------------------
// Workers write real files into <WORKSPACE>/projects/<id>/<agent>/ or
// <WORKSPACE>/<runId>/<agent>/. Without a way to list and open them, a finished
// run looks like a claim with nothing behind it.
const ARTIFACT_MAX = 5 * 1024 * 1024;

function scopeDir(q) {
  const id = String(q.get("id") || "");
  if (!/^[A-Za-z0-9_-]{3,48}$/.test(id)) return null;
  const base = q.get("kind") === "run" ? path.join(WORKSPACE, id) : path.join(WORKSPACE, "projects", id);
  const real = path.resolve(base);
  const root = path.resolve(WORKSPACE);
  if (!real.startsWith(root + path.sep)) return null;
  try { return fs.statSync(real).isDirectory() ? real : null; } catch { return null; }
}

function safeFile(dir, agent, name) {
  if (!/^[A-Za-z0-9._-]{1,64}$/.test(agent) || !/^[A-Za-z0-9._-]{1,120}$/.test(name)) return null;
  const full = path.resolve(dir, agent, name);
  if (!full.startsWith(dir + path.sep)) return null;
  try {
    const st = fs.statSync(full);
    return st.isFile() && st.size <= ARTIFACT_MAX ? full : null;
  } catch { return null; }
}

function listArtifacts(dir) {
  const out = [];
  for (const agent of fs.readdirSync(dir)) {
    if (agent.startsWith(".")) continue;
    const sub = path.join(dir, agent);
    let st;
    try { st = fs.statSync(sub); } catch { continue; }
    if (!st.isDirectory()) continue;
    for (const name of fs.readdirSync(sub)) {
      if (name.startsWith(".")) continue;
      const file = safeFile(dir, agent, name);
      if (!file) continue;
      const s = fs.statSync(file);
      out.push({ agent, name, size: s.size, mtime: s.mtimeMs });
    }
  }
  return out.sort((a, b) => b.mtime - a.mtime);
}

const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".json": "application/json", ".ico": "image/x-icon", ".woff2": "font/woff2", ".md": "text/plain; charset=utf-8", ".txt": "text/plain; charset=utf-8", ".csv": "text/plain; charset=utf-8", ".xml": "text/plain; charset=utf-8" };

function serveStatic(req, res) {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p === "/") p = "/index.html";
  const file = path.join(DIST, p);
  const inside = file === DIST || file.startsWith(DIST + path.sep);
  if (!inside || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    // Only page routes fall back to index.html. A missing hashed asset has to
    // 404, otherwise a stale index.html loads HTML as JavaScript and the page
    // goes blank with no useful error.
    const ext = path.extname(p);
    if (inside && ext && ext !== ".html") {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("not found");
      return;
    }
    const idx = path.join(DIST, "index.html");
    if (fs.existsSync(idx)) { res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" }); res.end(fs.readFileSync(idx)); }
    else { res.writeHead(404); res.end("not built"); }
    return;
  }
  const cache = p.startsWith("/assets/") ? "public, max-age=31536000, immutable" : "no-cache";
  res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream", "Cache-Control": cache });
  res.end(fs.readFileSync(file));
}

const server = http.createServer((req, res) => {
  const url = req.url.split("?")[0];
  if (url === "/api/auth" && req.method === "POST") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      let password = "";
      try { password = String(JSON.parse(body).password || ""); } catch {}
      if (!checkPassword(password)) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end('{"error":"wrong password"}');
        return;
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, token: newSession("owner"), role: "owner" }));
    });
    return;
  }
  // A guest link needs no password. It hands out a read only session, which is
  // exactly what someone who just wants to watch the office needs.
  if (url === "/api/guest" && req.method === "POST") {
    if (!readAuth()) {
      // Nothing to protect: the owner session is already open.
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, token: newSession("owner"), role: "owner" }));
      return;
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, token: newSession("guest"), role: "guest" }));
    return;
  }
  if (url.startsWith("/api/") && url !== "/health" && !authorized(req)) {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end('{"error":"unauthorized"}');
    return;
  }
  const session = sessionOf(req);
  if (session && session.role === "guest") {
    const readOnly = (req.method === "GET" || req.method === "HEAD") && GUEST_READ.has(url);
    if (!readOnly) {
      res.writeHead(403, { "Content-Type": "application/json" });
      res.end('{"error":"guest mode is read-only"}');
      return;
    }
  }
  if (url === "/api/whoami") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ role: session ? session.role : "none" }));
    return;
  }
  if (url === "/api/state") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ...state, agents: [MANAGER, ...WORKERS], live: true }));
    return;
  }
  if (url === "/api/stream") {
    res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
    res.write("retry: 2000\n\n");
    res.write("data: " + JSON.stringify({ kind: "hello", ts: Date.now(), ...state }) + "\n\n");
    clients.add(res);
    req.on("close", () => clients.delete(res));
    return;
  }
  if (url === "/api/task" && req.method === "POST") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      let prompt = "";
      let projectId = "";
      let workdir = "";
      try {
        const parsed = JSON.parse(body);
        prompt = (parsed.prompt || "").trim();
        projectId = String(parsed.projectId || "").trim();
        workdir = String(parsed.workdir || "").trim();
      } catch {}
      if (!prompt) { res.writeHead(400, { "Content-Type": "application/json" }); res.end('{"error":"prompt required"}'); return; }
      if (state.status === "planning" || state.status === "running") { res.writeHead(409, { "Content-Type": "application/json" }); res.end('{"error":"a run is already active"}'); return; }
      if (projectId && !readProjects().some((p) => p.id === projectId)) projectId = "";
      if (workdir && (!workdir.startsWith(STAGING_ROOT + "/") || !fs.existsSync(workdir))) workdir = "";
      orchestrate(prompt, projectId, workdir).catch((e) => {
        state.status = "failed";
        state.error = String(e);
        if (projectId) updateProject(projectId, { status: "failed", finishedAt: new Date().toISOString() });
        emit({ kind: "run", status: "failed", error: String(e) });
      });
      res.writeHead(202, { "Content-Type": "application/json" });
      res.end('{"accepted":true}');
    });
    return;
  }
  if (url === "/api/projects" && req.method === "POST") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      let input = {};
      try { input = JSON.parse(body); } catch {}
      const title = String(input.title || "").trim();
      const prompt = String(input.prompt || "").trim();
      const md = input.md && typeof input.md === "object" ? input.md : null;
      const image = input.image && typeof input.image === "object" ? input.image : null;
      if (!title) { res.writeHead(400, { "Content-Type": "application/json" }); res.end('{"error":"title required"}'); return; }
      if (!prompt && !(md && String(md.content || "").trim())) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end('{"error":"a prompt or a .md upload is required"}');
        return;
      }
      if (md) {
        const content = String(md.content || "");
        if (content.length > MAX_MD) { res.writeHead(413, { "Content-Type": "application/json" }); res.end('{"error":"md file too large (max 200 KB)"}'); return; }
      }
      if (image) {
        const dataUrl = String(image.dataUrl || "");
        if (!dataUrl.startsWith("data:image/")) { res.writeHead(400, { "Content-Type": "application/json" }); res.end('{"error":"image must be an image file"}'); return; }
        if (dataUrl.length > MAX_IMG) { res.writeHead(413, { "Content-Type": "application/json" }); res.end('{"error":"image too large (max 2 MB)"}'); return; }
      }
      const list = readProjects();
      if (list.length >= 200) { res.writeHead(409, { "Content-Type": "application/json" }); res.end('{"error":"project limit reached (200)"}'); return; }
      const record = {
        id: "p_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        title: title.slice(0, 120),
        prompt: prompt.slice(0, 20000),
        md: md && String(md.content || "").trim() ? { name: String(md.name || "brief.md").slice(0, 80), content: String(md.content) } : null,
        image: image ? { name: String(image.name || "image").slice(0, 80), dataUrl: String(image.dataUrl) } : null,
        createdAt: new Date().toISOString(),
      };
      list.push(record);
      writeProjects(list);
      try {
        const root = path.join(WORKSPACE, "projects", record.id);
        fs.mkdirSync(root, { recursive: true });
        if (record.md) fs.writeFileSync(path.join(root, "brief.md"), record.md.content);
        if (record.image && record.image.dataUrl) {
          const m = /^data:image\/(\w+);base64,(.+)$/s.exec(record.image.dataUrl);
          if (m) fs.writeFileSync(path.join(root, "brief-image." + m[1]), Buffer.from(m[2], "base64"));
        }
      } catch (e) {
        console.log("[projects] folder setup failed: " + String(e));
      }
      res.writeHead(201, { "Content-Type": "application/json" });
      res.end(JSON.stringify(projectSummary(record)));
    });
    return;
  }
  if (url === "/api/projects" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(readProjects().map(projectSummary)));
    return;
  }
  if (url === "/api/projects/detail") {
    const id = new URL(req.url, "http://x").searchParams.get("id") || "";
    const found = readProjects().find((p) => p.id === id);
    if (!found) { res.writeHead(404, { "Content-Type": "application/json" }); res.end('{"error":"not found"}'); return; }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(Object.assign(projectSummary(found), { prompt: found.prompt, md: found.md || null, image: found.image || null })));
    return;
  }
  if (url === "/api/files") {
    const dir = scopeDir(new URL(req.url, "http://x").searchParams);
    if (!dir) { res.writeHead(404, { "Content-Type": "application/json" }); res.end('{"error":"no such project or run"}'); return; }
    res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    res.end(JSON.stringify({ files: listArtifacts(dir) }));
    return;
  }
  if (url === "/api/file") {
    const q = new URL(req.url, "http://x").searchParams;
    const dir = scopeDir(q);
    const file = dir && safeFile(dir, String(q.get("agent") || ""), String(q.get("name") || ""));
    if (!file) { res.writeHead(404); res.end("not found"); return; }
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, {
      "Content-Type": MIME[ext] || "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    res.end(fs.readFileSync(file));
    return;
  }
  if (url === "/api/image" && req.method === "POST") {
    if (!ENV.IMAGE_KEY) { res.writeHead(503, { "Content-Type": "application/json" }); res.end('{"error":"IMAGE_KEY not configured"}'); return; }
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      let prompt = "";
      let size = "1024x1024";
      try { const p = JSON.parse(body); prompt = String(p.prompt || ""); size = String(p.size || "1024x1024"); } catch {}
      if (!prompt) { res.writeHead(400); res.end('{"error":"missing prompt"}'); return; }
      // The gateway is intermittent: it times out or returns an empty payload at
      // random, and the working size flips between runs. Try the requested size,
      // the other one, then the requested size once more before giving up.
      const alt = size === "512x512" ? "1024x1024" : "512x512";
      const attempts = [size, alt, size];
      let last = "no attempt made";
      try {
        for (let i = 0; i < attempts.length; i++) {
          const useSize = attempts[i];
          let out = "";
          try {
            out = execFileSync("curl", [
              "-s", "-X", "POST",
              ENV.IMAGE_GATEWAY + "/images/generations",
              "-H", "Authorization: Bearer " + ENV.IMAGE_KEY,
              "-H", "Content-Type: application/json",
              "-d", JSON.stringify({ model: ENV.IMAGE_MODEL, prompt, n: 1, size: useSize }),
            ], { timeout: 90000, env: ENV }).toString();
          } catch (e) {
            last = "gateway unreachable: " + String(e).slice(0, 90);
            continue;
          }
          let j = null;
          try { j = JSON.parse(out); } catch { last = "gateway returned non-JSON"; }
          if (j) {
            const b64 = (j.data && j.data[0] && j.data[0].b64_json) || "";
            if (b64) {
              res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
              res.end(JSON.stringify({ ok: true, image: b64, size: useSize }));
              return;
            }
            last = (j.error && (j.error.message || j.error.code)) || "no image data";
          }
          if (i < attempts.length - 1) execFileSync("sleep", ["2"]);
        }
        res.writeHead(504, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "image gateway failed after 3 attempts: " + String(last).slice(0, 160) }));
      } catch (e) {
        res.writeHead(502);
        res.end(JSON.stringify({ error: String(e).slice(0, 200) }));
      }
    });
    return;
  }
  if (url === "/api/projects/delete" && req.method === "POST") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      let id = "";
      try { id = String(JSON.parse(body).id || ""); } catch {}
      const list = readProjects().filter((p) => p.id !== id);
      writeProjects(list);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end('{"ok":true}');
    });
    return;
  }
  if (url === "/api/skills/match") {
    const q = new URL(req.url, "http://x").searchParams.get("q") || "";
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ q, matches: matchSkills(q, 5) }));
    return;
  }
  if (url === "/api/knowledge") {
    let payload = { memories: [], facts: [], topics: 0, dbKb: 0, error: "unavailable" };
    try {
      const out = execFileSync("python3", [path.join(ROOT, "server", "knowledge.py")], { timeout: 15000 }).toString();
      payload = JSON.parse(out);
    } catch (e) {
      payload.error = String(e).slice(0, 200);
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(payload));
    return;
  }
  if (url === "/api/runtime") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(runtimeInfo()));
    return;
  }
  if (url === "/api/skills") {
    let list = [];
    try {
      const base = SKILLS_DIR;
      for (const name of fs.readdirSync(base)) {
        const dir = base + "/" + name;
        if (!fs.statSync(dir).isDirectory()) continue;
        let title = name;
        let desc = "";
        const md = dir + "/SKILL.md";
        if (fs.existsSync(md)) {
          const txt = fs.readFileSync(md, "utf8");
          const m1 = txt.match(/^name:\s*(.+)$/m);
          const m2 = txt.match(/^description:\s*(.+)$/m);
          if (m1) title = m1[1].trim();
          if (m2) desc = m2[1].trim();
        }
        let files = 0;
        try { files = fs.readdirSync(dir).length; } catch {}
        list.push({ folder: name, name: title, description: desc.slice(0, 240), files });
      }
    } catch {}
    list.sort((a, b) => a.folder.localeCompare(b.folder));
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(list));
    return;
  }
  if (url === "/health") { res.writeHead(200, { "Content-Type": "application/json" }); res.end('{"ok":true}'); return; }
  serveStatic(req, res);
});

fs.mkdirSync(WORKSPACE, { recursive: true });
const reconciled = reconcileProjects();
if (reconciled) console.log("[boot] marked " + reconciled + " stale project run(s) as interrupted");
server.listen(PORT, "0.0.0.0", () => console.log("0xyas bridge on :" + PORT));

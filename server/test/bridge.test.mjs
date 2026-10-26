// Smoke tests for the bridge's auth and guest rules. They start the real
// server/bridge.mjs as a child process on a random port with throwaway data
// directories, so no browser, agent binary or network access is needed.
// Run: npm test
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SERVER = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const BRIDGE = path.join(SERVER, "bridge.mjs");
const SET_PASS = path.join(SERVER, "set-pass.mjs");
const children = new Set();
const tmpDirs = new Set();

after(() => {
  for (const c of children) { try { c.kill("SIGKILL"); } catch {} }
  for (const d of tmpDirs) { try { fs.rmSync(d, { recursive: true, force: true }); } catch {} }
});

function sandbox() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bridge-test-"));
  tmpDirs.add(dir);
  return {
    dir,
    env: {
      ...process.env,
      PORT: "0",
      DATA_DIR: path.join(dir, "data"),
      WORKSPACE_DIR: path.join(dir, "runs"),
      STAGING_DIR: path.join(dir, "staging"),
      SKILLS_DIR: path.join(dir, "skills"),
      DIST_DIR: path.join(dir, "dist"),
      HOME_DIR: dir,
      ICM_DB: path.join(dir, "missing.db"),
      HERMES_BIN: path.join(dir, "no-hermes"),
      OPENCODE_BIN: path.join(dir, "no-opencode"),
    },
  };
}

function setPassword(env, pw) {
  const r = spawnSync(process.execPath, [SET_PASS, pw], { env, encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
}

// Start the bridge and resolve with its port once it is listening.
function start(env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [BRIDGE], { env, stdio: ["ignore", "pipe", "pipe"] });
    children.add(child);
    let out = "";
    const onData = (b) => {
      out += b.toString();
      const m = /0xyas bridge on \S+:(\d+)/.exec(out);
      if (m) resolve({ child, port: Number(m[1]) });
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    child.on("exit", (code) => reject(new Error("bridge exited early (" + code + "): " + out)));
  });
}

function request(port, method, urlPath, { token, body, host } = {}) {
  return new Promise((resolve, reject) => {
    const headers = {};
    if (token) headers["x-0xyas-token"] = token;
    if (host) headers.host = host;
    if (body !== undefined) headers["content-type"] = "application/json";
    const req = http.request({ host: "127.0.0.1", port, method, path: urlPath, headers }, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        let json = null;
        try { json = JSON.parse(data); } catch {}
        resolve({ status: res.statusCode, headers: res.headers, body: data, json });
      });
    });
    req.on("error", reject);
    if (body !== undefined) req.write(typeof body === "string" ? body : JSON.stringify(body));
    req.end();
  });
}

test("refuses to start on a public bind without a password", () => {
  const { env } = sandbox();
  const r = spawnSync(process.execPath, [BRIDGE], {
    env: { ...env, BIND_HOST: "0.0.0.0" },
    encoding: "utf8",
    timeout: 15000,
  });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /refusing to start/);
});

test("guest sessions cannot read memory, files, briefs or skills", async () => {
  const { env } = sandbox();
  setPassword(env, "correct-horse");
  const { port } = await start({ ...env, BIND_HOST: "127.0.0.1" });

  const g = await request(port, "POST", "/api/guest");
  assert.equal(g.status, 200);
  assert.equal(g.json.role, "guest");
  const token = g.json.token;

  for (const p of [
    "/api/knowledge",
    "/api/file?id=abc&agent=developer&name=x.txt",
    "/api/files?id=abc",
    "/api/projects/detail?id=abc",
    "/api/skills",
    "/api/skills/match?q=test",
  ]) {
    const r = await request(port, "GET", p, { token });
    assert.equal(r.status, 403, p + " should be 403 for a guest, got " + r.status);
  }
  const task = await request(port, "POST", "/api/task", { token, body: { prompt: "hi" } });
  assert.equal(task.status, 403);

  // What the 3D office needs still works.
  assert.equal((await request(port, "GET", "/api/state", { token })).status, 200);
  assert.equal((await request(port, "GET", "/api/projects", { token })).status, 200);
  const rt = await request(port, "GET", "/api/runtime", { token });
  assert.equal(rt.status, 200);
  assert.equal(rt.json.workspace, undefined, "guest runtime must not expose local paths");
  assert.equal(rt.json.memory, undefined);
  assert.equal(rt.json.gateway, undefined);

  // The owner still has access.
  const o = await request(port, "POST", "/api/auth", { body: { password: "correct-horse" } });
  assert.equal(o.status, 200);
  assert.equal(o.json.role, "owner");
  const files = await request(port, "GET", "/api/files?id=abc", { token: o.json.token });
  assert.equal(files.status, 404); // allowed, the project just does not exist
  const ort = await request(port, "GET", "/api/runtime", { token: o.json.token });
  assert.equal(typeof ort.json.workspace, "string");

  // No token at all is still 401.
  assert.equal((await request(port, "GET", "/api/state")).status, 401);
});

test("/api/auth is rate limited after repeated wrong passwords", async () => {
  const { env } = sandbox();
  setPassword(env, "correct-horse");
  const { port } = await start({ ...env, BIND_HOST: "127.0.0.1" });
  for (let i = 0; i < 10; i++) {
    const r = await request(port, "POST", "/api/auth", { body: { password: "wrong" + i } });
    assert.equal(r.status, 401);
  }
  const blocked = await request(port, "POST", "/api/auth", { body: { password: "correct-horse" } });
  assert.equal(blocked.status, 429);
  assert.ok(Number(blocked.headers["retry-after"]) > 0);
});

test("no-password mode is localhost only and still needs a session token", async () => {
  const { env } = sandbox();
  const { port } = await start({ ...env, BIND_HOST: "127.0.0.1" });

  // No token: refused, so a blind cross-site POST cannot start a run.
  assert.equal((await request(port, "POST", "/api/task", { body: { prompt: "hi" } })).status, 401);
  // A request addressed to another host name (tunnel, DNS rebinding) is refused.
  const remote = await request(port, "POST", "/api/guest", { host: "office.example.com" });
  assert.equal(remote.status, 503);

  const g = await request(port, "POST", "/api/guest", { host: "localhost:" + port });
  assert.equal(g.status, 200);
  assert.equal(g.json.role, "owner");
  const who = await request(port, "GET", "/api/whoami", { token: g.json.token, host: "localhost:" + port });
  assert.equal(who.json.role, "owner");
  const evil = await request(port, "GET", "/api/whoami", { token: g.json.token, host: "office.example.com" });
  assert.equal(evil.status, 401);

  // Once a password is set, tokens issued in open mode stop working.
  setPassword(env, "correct-horse");
  const after = await request(port, "GET", "/api/whoami", { token: g.json.token, host: "localhost:" + port });
  assert.equal(after.status, 401);
});

test("a malformed URL does not crash the bridge", async () => {
  const { env } = sandbox();
  setPassword(env, "correct-horse");
  const { port } = await start({ ...env, BIND_HOST: "127.0.0.1" });
  const bad = await request(port, "GET", "/%E0%A4%A");
  assert.equal(bad.status, 400);
  assert.equal((await request(port, "GET", "/health")).status, 200);
});

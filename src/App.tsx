import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AGENTS, FLOW } from './data/demo';
import type { AgentId, FlowStep, Task, View } from './types';
import { OfficeScene } from './scene/OfficeScene';
import { connectLive, submitLive } from './live';
import {
  AgentRoster,
  CommandCenter,
  ProjectPanel,
  Sidebar,
  StatusBar,
  TaskFlowPanel,
  TaskPanel,
  Toast,
} from './components/Panels';
import { AgentModal, AgentsView, KnowledgeView, ProjectsView, SettingsView, TaskModal, TasksView, ToolsView } from './components/Views';
import { Gate } from './components/Gate';
import { LangProvider, useLang } from './lang';
import { apiFetch, enterGuest, getRole, verifySession } from './api';
import type { Role } from './api';
import './styles.css';

type NavTarget = View | 'knowledge' | 'tools' | 'settings';

function clock() {
  return new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function Office({ role }: { role: Role }) {
  const { t: tr } = useLang();
  // A guest sees the same office but cannot start, stop or spend anything.
  const guest = role === 'guest';
  const [view, setView] = useState<NavTarget>('office');
  // Real rows only: the demo seed is gone, everything here comes from the bridge.
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selected, setSelected] = useState<AgentId | null>(null);
  const [cardAgent, setCardAgent] = useState<AgentId | null>(null);
  const [theme, setTheme] = useState(() => window.localStorage.getItem('0xyas-theme') || 'violet');
  const [uniform, setUniform] = useState(() => window.localStorage.getItem('0xyas-uniform') || 'original');
  const [projectRows, setProjectRows] = useState<
    { id: string; name: string; tag: string; progress: number; status: Task['status'] }[]
  >([]);
  const [openTask, setOpenTask] = useState<string | null>(null);
  const [fps, setFps] = useState(0);
  const [reduced, setReduced] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [panels, setPanels] = useState(true);
  const [glError, setGlError] = useState(false);
  const [live, setLive] = useState(false);

  const handleAgentTask = useCallback(
    (id: AgentId, phase: 'work' | 'done', text: string, progress: number) => {
      setTasks((prev) => {
        const i = prev.findIndex((t) => t.agentId === id);
        if (i < 0) return prev;
        const cur = prev[i];
        const next = [...prev];
        if (phase === 'done') {
          if (cur.status === 'done' && cur.output === text) return prev;
          next[i] = { ...cur, status: 'done', progress: 100, output: text };
          return next;
        }
        const p = Math.round(progress);
        if (cur.status === 'running' && cur.title === text && cur.progress === p) return prev;
        const row: Task = { ...cur, title: text, status: 'running', progress: p };
        delete row.output;
        next[i] = row;
        return next;
      });
    },
    [],
  );

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<OfficeScene | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  const showToast = useCallback((text: string) => {
    setToast(text);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 4200);
  }, []);

  useEffect(() => {
    if (!canvasRef.current || !labelRef.current) return;
    try {
      sceneRef.current = new OfficeScene({
        canvas: canvasRef.current,
        labelLayer: labelRef.current,
        onSelect: (id) => {
          setSelected(id);
          if (!id) setCardAgent(null);
        },
        onArrived: (id) => setCardAgent(id),
        onFps: (v) => setFps(v),
        onAgentTask: handleAgentTask,
      });
    } catch (err) {
      console.error('WebGL unavailable', err);
      setGlError(true);
    }
    return () => {
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    sceneRef.current?.setSelected(selected);
  }, [selected]);

  useEffect(() => {
    sceneRef.current?.setReducedMotion(reduced);
    // The CSS uses this to stop the 2D chrome as well, so "reduced" is honest.
    document.documentElement.dataset.reduced = reduced ? '1' : '0';
  }, [reduced]);

  useEffect(() => {
    const loadProjects = () => {
      apiFetch('/api/projects')
        .then((r) => r.json())
        .then((d) => {
          if (!Array.isArray(d)) return;
          setProjectRows(
            d.slice(0, 4).map((p: { id: string; title: string; status?: string; progress?: number }) => ({
              id: p.id,
              name: p.title,
              // i18n keys, translated where they are rendered so a language
              // switch re-renders them without reloading the project list.
              tag:
                p.status === 'running' || p.status === 'planning'
                  ? 'tagLive'
                  : p.status === 'done'
                    ? 'projDone'
                    : p.status === 'failed'
                      ? 'projFailed'
                      : p.status === 'interrupted'
                        ? 'projInterrupted'
                        : 'tagQueued',
              progress: p.progress || 0,
              status: (p.status === 'done'
                ? 'done'
                : p.status === 'failed'
                  ? 'failed'
                  : p.status === 'running' || p.status === 'planning'
                    ? 'running'
                    : 'queued') as Task['status'],
            })),
          );
        })
        .catch(() => undefined);
    };
    loadProjects();
    const t = window.setInterval(loadProjects, 5000);
    return () => window.clearInterval(t);
  }, []);

  // Real runtime health, not a hardcoded dot.
  const [runtime, setRuntime] = useState<{
    hermes: boolean;
    opencode: boolean;
    hermesOk: boolean;
    opencodeOk: boolean;
    model: string;
  } | null>(null);
  useEffect(() => {
    const poll = () => {
      apiFetch('/api/runtime')
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (!d || typeof d !== 'object') return;
          const r = d as {
            hermes?: string;
            opencode?: string;
            model?: string;
            hermesOk?: boolean;
            opencodeOk?: boolean;
          };
          const hermes = typeof r.hermes === 'string' && r.hermes.trim().length > 0 && !/not found|no such|error|unknown/i.test(r.hermes);
          const opencode = typeof r.opencode === 'string' && /\d/.test(r.opencode.trim());
          setRuntime({
            hermes,
            opencode,
            hermesOk: r.hermesOk !== false,
            opencodeOk: r.opencodeOk !== false,
            model: String(r.model || ''),
          });
        })
        .catch(() => undefined);
    };
    poll();
    const id = window.setInterval(poll, 20000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem('0xyas-theme', theme);
  }, [theme]);

  useEffect(() => {
    sceneRef.current?.setUniform(uniform);
    window.localStorage.setItem('0xyas-uniform', uniform);
  }, [uniform]);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) setReduced(true);
  }, []);

  useEffect(() => {
    const off = connectLive({
      onReady: (s) => {
        setLive(true);
        sceneRef.current?.setLiveMode(true);
        if (s.tasks) {
          setTasks(s.tasks.map((x) => ({
            id: x.id,
            title: x.title,
            agentId: x.agent as AgentId,
            status: (x.status === 'running' ? 'running' : x.status === 'error' ? 'failed' : 'done') as Task['status'],
            progress: x.status === 'running' ? (typeof x.progress === 'number' ? x.progress : 0) : 100,
            output: x.output || undefined,
            tag: x.status === 'error' ? 'tagError' : 'tagLive',
            project: 'Hermes run',
            createdAt: clock(),
          })));
        }
      },
      onEvent: (e) => {
        if (e.kind === 'reset') {
          setTasks([]);
          setCardAgent(null);
          sceneRef.current?.resetAgents();
          return;
        }
        if (e.kind === 'task' && e.task) {
          const row = {
            id: e.task.id,
            title: e.task.title,
            agentId: e.task.agent as AgentId,
            status: (e.task.status === 'running' ? 'running' : e.task.status === 'error' ? 'failed' : 'done') as Task['status'],
            progress: e.task.status === 'running' ? (typeof e.task.progress === 'number' ? e.task.progress : 0) : 100,
            output: e.task.output || undefined,
            tag: e.task.status === 'error' ? 'tagError' : 'tagLive',
            project: 'Hermes run',
            createdAt: clock(),
          };
          setTasks((prev) => {
            const i = prev.findIndex((x) => x.id === row.id);
            if (i < 0) return [...prev, row];
            const next = [...prev];
            next[i] = { ...prev[i], ...row };
            return next;
          });
          return;
        }
        if (e.agent && e.text) {
          sceneRef.current?.setAgentTask(
            e.agent as AgentId,
            e.text,
            e.kind === 'done' || e.kind === 'error',
            e.kind === 'done' ? e.text : undefined,
          );
        }
      },
      onDown: () => {
        setLive(false);
        sceneRef.current?.setLiveMode(false);
      },
    });
    return off;
  }, []);

  const runningTasks = useMemo(
    () => tasks.filter((t) => t.status === 'running' || t.status === 'waiting'),
    [tasks],
  );
  // Live agent roster: status and activity come from the run, never from demo copy.
  const liveAgents = useMemo(
    () =>
      AGENTS.map((a) => {
        const own = tasks.filter((t) => t.agentId === a.id);
        const active = own.find((t) => t.status === 'running' || t.status === 'waiting' || t.status === 'queued');
        if (!active) return { ...a, status: 'idle' as const, activity: tr('idleWaiting') };
        return { ...a, status: 'working' as const, activity: active.title };
      }),
    // `tr` changes identity when the language changes, so the idle line below
    // is retranslated without waiting for a task update.
    [tasks, tr],
  );
  // The flow strip must describe the run that is actually happening. Demo copy
  // stays only when the bridge is unreachable.
  const flowSteps = useMemo<FlowStep[]>(() => {
    if (!live) return FLOW;
    const stage = (agentId: AgentId, label: string, icon: string, id: string): FlowStep => {
      const own = tasks.filter((t) => t.agentId === agentId);
      const active = own.some((t) => t.status === 'running' || t.status === 'queued' || t.status === 'waiting');
      const failed = own.some((t) => t.status === 'failed');
      const finished = own.length > 0 && own.every((t) => t.status === 'done');
      return {
        id,
        label,
        icon,
        state: active ? 'active' : finished ? 'done' : 'waiting',
        meta: failed ? tr('stFailed') : active ? tr('metaInProgress') : finished ? tr('stDone') : own.length ? tr('stQueued') : tr('metaNotRun'),
      };
    };
    return [
      stage('researcher', tr('flowResearch'), 'search', 'f1'),
      stage('designer', tr('flowDesign'), 'palette', 'f2'),
      stage('developer', tr('flowDevelop'), 'code', 'f3'),
      stage('qa', tr('flowTest'), 'shield', 'f4'),
      { id: 'f5', label: tr('flowDeploy'), state: 'waiting' as const, meta: tr('metaNoAgent'), icon: 'bolt' },
    ];
  }, [live, tasks, tr]);

  const panelTasks = useMemo(() => {
    const rank = (s: Task['status']) =>
      s === 'running' ? 0 : s === 'waiting' ? 1 : s === 'queued' ? 2 : s === 'done' ? 3 : 4;
    return [...tasks].sort((a, b) => rank(a.status) - rank(b.status)).slice(0, 6);
  }, [tasks]);
  const agent = useMemo(() => liveAgents.find((a) => a.id === cardAgent), [cardAgent, liveAgents]);
  const task = useMemo(() => tasks.find((t) => t.id === openTask), [openTask, tasks]);

  const submitTask = (text: string, projectId?: string) => {
    if (guest) {
      showToast(tr('guestReadOnly'));
      return;
    }
    if (live) {
      submitLive(text, projectId).then((r) => showToast(r.ok ? tr('toastSent') : tr('toastBridgeErr') + (r.error || 'unknown')));
      return;
    }
    const next: Task = {
      id: `t-${Math.floor(Math.random() * 9000 + 1000)}`,
      title: text.length > 68 ? `${text.slice(0, 65)}...` : text,
      agentId: 'manager',
      status: 'queued',
      progress: 0,
      tag: 'tagNew',
      project: 'Inbox',
      createdAt: clock(),
    };
    setTasks((prev) => [next, ...prev]);
    showToast(tr('toastBridgeOff'));
  };

  const focusAgent = (id: AgentId) => {
    sceneRef.current?.focusAgent(id);
    setSelected(null);
  };

  return (
    <div className={`app${panels ? '' : ' no-panels'}`}>
      <div className="stage">
        <canvas ref={canvasRef} className="scene-canvas" />
        <div ref={labelRef} className="label-layer" />
        <div className="vignette" />

        {glError && (
          <div className="gl-fallback">
            <h2>{tr('glTitle')}</h2>
            <p>{tr('glHint')}</p>
            <ul>
              {AGENTS.map((a) => (
                <li key={a.id}>
                  <b>{a.name}</b> - {a.activity}
                </li>
              ))}
            </ul>
          </div>
        )}

        <StatusBar
          fps={fps}
          reduced={reduced}
          live={live}
          onToggleReduced={() => setReduced((v) => !v)}
          onReset={() => sceneRef.current?.resetCamera()}
          onTogglePanels={() => setPanels((v) => !v)}
        />
      </div>

      <Sidebar
        view={view === 'knowledge' || view === 'tools' || view === 'settings' ? 'office' : view}
        onNavigate={setView}
        agentCount={AGENTS.length}
        runningCount={runningTasks.length}
        runtime={runtime}
        guest={guest}
      />

      {view === 'office' && (
        <div className="rightcol">
          <AgentRoster
            agents={liveAgents}
            selected={selected}
            onSelect={(id) => {
              setSelected(id);
              setCardAgent(id);
            }}
            onViewAll={() => setView('agents')}
          />
          <TaskPanel
            tasks={panelTasks}
            onViewAll={() => setView('tasks')}
            onOpen={(id) => setOpenTask(id)}
          />
          <ProjectPanel projects={projectRows} />
        </div>
      )}

      {view === 'office' && (
        <div className="bottom">
          <CommandCenter onSubmit={submitTask} live={live} guest={guest} />
          <TaskFlowPanel steps={flowSteps} />
        </div>
      )}

      {view !== 'office' && (
        <div className="view-layer">
          {view === 'agents' && (
            <AgentsView agents={liveAgents} tasks={tasks} live={live} onSelect={(id) => setSelected(id)} />
          )}
          {view === 'tasks' && <TasksView tasks={tasks} live={live} onOpen={(id) => setOpenTask(id)} />}
          {view === 'projects' && <ProjectsView live={live} guest={guest} onRun={(p, id) => submitTask(p, id)} />}
          {view === 'knowledge' && <KnowledgeView />}
          {view === 'tools' && <ToolsView />}
          {view === 'settings' && (
            <SettingsView
              theme={theme}
              uniform={uniform}
              reduced={reduced}
              onTheme={setTheme}
              onUniform={setUniform}
              onToggleReduced={() => setReduced((v) => !v)}
            />
          )}
        </div>
      )}

      {agent && (
        <AgentModal
          agent={agent}
          tasks={tasks}
          live={live}
          onClose={() => {
            setSelected(null);
            setCardAgent(null);
          }}
          onFocus={() => focusAgent(agent.id)}
        />
      )}

      {task && (
        <TaskModal
          task={task}
          agent={liveAgents.find((a) => a.id === task.agentId)}
          onClose={() => setOpenTask(null)}
        />
      )}

      {toast && <Toast text={toast} />}
    </div>
  );
}

export default function App() {
  // undefined = still checking, null = not signed in, otherwise owner or guest.
  const [role, setRole] = useState<Role | null | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    // A guest link needs no password and no click: /?guest=1 drops straight
    // into the read only office. An existing owner session is never downgraded.
    const wantsGuest = new URLSearchParams(window.location.search).get('guest') === '1';
    verifySession().then(async (r) => {
      if (!alive) return;
      if (r) { setRole(r); return; }
      if (!wantsGuest) { setRole(null); return; }
      const ok = await enterGuest();
      if (alive) setRole(ok ? 'guest' : null);
    });
    const onLogout = () => setRole(null);
    window.addEventListener('0xyas-logout', onLogout);
    return () => { alive = false; window.removeEventListener('0xyas-logout', onLogout); };
  }, []);

  if (role === undefined) {
    return (
      <div className="gate">
        <div className="gate-card gate-loading">Memeriksa akses... / Checking access...</div>
      </div>
    );
  }
  if (role === null) {
    return (
      <LangProvider>
        <Gate onDone={() => setRole(getRole())} />
      </LangProvider>
    );
  }
  return (
    <LangProvider>
      <Office role={role} />
    </LangProvider>
  );
}

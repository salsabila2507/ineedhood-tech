import type { Agent, AgentId, Task } from '../types';
import { useCallback, useEffect, useState } from 'react';

type SkillRecord = {
  folder: string;
  name: string;
  description: string;
  files: number;
};
import { apiFetch, tokenQuery } from '../api';
import { Icon } from './Icon';
import { statusText, useLang } from '../lang';

const ROLE_ICON: Record<string, string> = {
  manager: 'compass',
  researcher: 'search',
  developer: 'code',
  designer: 'palette',
  content: 'pen',
  analyst: 'chart',
  qa: 'shield',
};

export function AgentsView({
  agents,
  tasks,
  live,
  onSelect,
}: {
  agents: Agent[];
  tasks: Task[];
  live: boolean;
  onSelect: (id: AgentId) => void;
}) {
  const { t: tr } = useLang();
  return (
    <div className="view">
      <header className="view-head">
        <div>
          <h2>{tr('agentsTitle')}</h2>
          <p>
            {live ? tr('agentsSubLive') : tr('agentsSubDemo')}
          </p>
        </div>
        <span className={`chip ${live ? 'chip-live' : 'chip-demo'}`}>
          <span className="pulse" /> {live ? tr('liveData') : tr('demoData')}
        </span>
      </header>
      <div className="card-grid">
        {agents.map((a) => {
          const own = tasks.filter((t) => t.agentId === a.id);
          return (
            <button
              key={a.id}
              type="button"
              className="agent-card"
              style={{ ['--accent' as string]: a.accent }}
              onClick={() => onSelect(a.id)}
            >
              <div className="agent-card-top">
                <span className="agent-av lg">
                  <Icon name={ROLE_ICON[a.id]} size={16} />
                </span>
                <div>
                  <b>{a.name}</b>
                  <i>{a.codename}</i>
                </div>
                <span className={`status st-${a.status}`}>
                  <span className="dot" />
                  {statusText(a.status, tr)}
                </span>
              </div>
              <p className="agent-card-role">{a.role}</p>
              <p className="agent-card-act">{a.activity}</p>
              {live ? (
                <div className="agent-card-stats">
                  <span>
                    <b>{own.length}</b>
                    <i>{tr('inThisRun')}</i>
                  </span>
                  <span>
                    <b>{own.filter((t) => t.status === 'done').length}</b>
                    <i>{tr('stDone')}</i>
                  </span>
                  <span>
                    <b>{own.filter((t) => t.status === 'failed').length}</b>
                    <i>{tr('stFailed')}</i>
                  </span>
                </div>
              ) : (
                <div className="agent-card-stats">
                  <span>
                    <b>{a.stats.done}</b>
                    <i>{tr('tasksDone')}</i>
                  </span>
                  <span>
                    <b>{a.stats.success}%</b>
                    <i>{tr('success')}</i>
                  </span>
                  <span>
                    <b>{a.stats.avg}</b>
                    <i>{tr('avgTime')}</i>
                  </span>
                </div>
              )}
              <div className="agent-card-foot">
                <Icon name="tasks" size={12} />
                {own.length} {tr('activeTask')}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function TasksView({ tasks, onOpen, live }: { tasks: Task[]; onOpen: (id: string) => void; live: boolean }) {
  const { t: tr } = useLang();
  const groups: { key: string; label: string }[] = [
    { key: 'running', label: tr('gRunning') },
    { key: 'waiting', label: tr('gWaiting') },
    { key: 'queued', label: tr('gQueued') },
    { key: 'done', label: tr('gDone') },
  ];
  return (
    <div className="view">
      <header className="view-head">
        <div>
          <h2>{tr('tasksTitle')}</h2>
          <p>{live ? tr('tasksSubLive') : tr('tasksSubDemo')}</p>
        </div>
        <span className={`chip ${live ? 'chip-live' : 'chip-demo'}`}>
          <span className="pulse" /> {live ? tr('liveData') : tr('demoData')}
        </span>
      </header>
      <div className="task-board">
        {groups.map((g) => {
          const list = tasks.filter((t) => t.status === g.key);
          return (
            <div className="board-col" key={g.key}>
              <div className="board-head">
                <span className={`dot d-${g.key}`} />
                {g.label}
                <em>{list.length}</em>
              </div>
              {list.map((t) => (
                <button key={t.id} type="button" className="board-card" onClick={() => onOpen(t.id)}>
                  <b>{t.title}</b>
                  <i>
                    {t.project} · {tr(t.tag)}
                  </i>
                  <span className={`bar b-${t.status}`}>
                    <i style={{ width: `${t.progress}%` }} />
                  </span>
                  <span className="board-foot">
                    <span>{t.agentId}</span>
                    <span>{t.progress}%</span>
                  </span>
                </button>
              ))}
              {list.length === 0 && <p className="board-empty">{tr('nothingHere')}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

type ProjectRecord = {
  id: string;
  title: string;
  createdAt: string;
  words: number;
  mdName: string | null;
  mdSize: number | null;
  imageName: string | null;
  hasImage: boolean;
  folder?: string;
  status?: string;
  progress?: number;
  workerCount?: number;
  workersDone?: number;
  lastRunAt?: string | null;
  prompt?: string;
  md?: { name: string; content: string } | null;
  image?: { name: string; dataUrl: string } | null;
};

function statusLabel(status: string | undefined, tr: (k: string) => string) {
  if (status === 'done') return tr('projDone');
  if (status === 'failed') return tr('projFailed');
  if (status === 'interrupted') return tr('projInterrupted');
  if (status === 'running') return tr('projRunning');
  if (status === 'planning') return tr('projRunning');
  return tr('projNew');
}

function formatSize(bytes: number) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

function ProjectFiles({ id }: { id: string }) {
  const { t, tc } = useLang();
  const [files, setFiles] = useState<{ agent: string; name: string; size: number }[]>([]);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = () => {
      apiFetch('/api/files?id=' + encodeURIComponent(id))
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (!alive) return;
          setChecked(true);
          if (d && Array.isArray(d.files)) setFiles(d.files);
        })
        .catch(() => undefined);
    };
    load();
    const t = window.setInterval(load, 5000);
    return () => {
      alive = false;
      window.clearInterval(t);
    };
  }, [id]);

  return (
    <div className="proj-files">
      <div className="pf-head">
        <b>{t('projFiles')}</b>
        <span>
          {files.length === 0
            ? checked
              ? t('projFilesNone')
              : t('projFilesChecking')
            : files.length + ' ' + tc('projFilesCount', files.length)}
        </span>
      </div>
      {files.length === 0 ? (
        <p className="proj-meta">{t('projFilesEmpty')}</p>
      ) : (
        <ul>
          {files.map((f) => (
            <li key={f.agent + '/' + f.name}>
              <span className="pf-agent">{f.agent}</span>
              <span className="pf-name">{f.name}</span>
              <span className="pf-size">{formatSize(f.size)}</span>
              <a
                className="pf-open"
                href={tokenQuery(
                  '/api/file?id=' +
                    encodeURIComponent(id) +
                    '&agent=' +
                    encodeURIComponent(f.agent) +
                    '&name=' +
                    encodeURIComponent(f.name),
                )}
                target="_blank"
                rel="noreferrer"
              >
                {t('projView')}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ProjectsView({
  live,
  guest,
  onRun,
}: {
  live: boolean;
  guest?: boolean;
  onRun: (prompt: string, projectId: string) => void;
}) {
  const { t: tr } = useLang();
  const [items, setItems] = useState<ProjectRecord[]>([]);
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [md, setMd] = useState<{ name: string; content: string } | null>(null);
  const [image, setImage] = useState<{ name: string; dataUrl: string } | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [detail, setDetail] = useState<ProjectRecord | null>(null);

  const load = useCallback(() => {
    apiFetch('/api/projects')
      .then((r) => r.json())
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch(() => setItems([]));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Keep project status live while the view is open.
  useEffect(() => {
    const t = window.setInterval(load, 3000);
    return () => window.clearInterval(t);
  }, [load]);

  const readMd = (file: File | undefined) => {
    setError('');
    if (!file) {
      setMd(null);
      return;
    }
    if (file.size > 200 * 1024) {
      setError('.md file too large (' + formatSize(file.size) + ', max 200 KB)');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setMd({ name: file.name, content: String(reader.result || '') });
    reader.readAsText(file);
  };

  const readImage = (file: File | undefined) => {
    setError('');
    if (!file) {
      setImage(null);
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('image too large (' + formatSize(file.size) + ', max 2 MB)');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImage({ name: file.name, dataUrl: String(reader.result || '') });
    reader.readAsDataURL(file);
  };

  const create = () => {
    setError('');
    const t = title.trim();
    const p = prompt.trim();
    if (!t) {
      setError('Title is required.');
      return;
    }
    if (!p && !md) {
      setError('Write a full prompt or upload a .md brief.');
      return;
    }
    setBusy(true);
    apiFetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: t, prompt: p, md, image }),
    })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error((data as { error?: string }).error || 'HTTP ' + r.status);
        setTitle('');
        setPrompt('');
        setMd(null);
        setImage(null);
        load();
      })
      .catch((e) => setError(String((e as Error).message || e)))
      .finally(() => setBusy(false));
  };

  const openDetail = (id: string) => {
    if (detail && detail.id === id) {
      setDetail(null);
      return;
    }
    apiFetch('/api/projects/detail?id=' + encodeURIComponent(id))
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setDetail(d && typeof d === 'object' && 'id' in d ? (d as ProjectRecord) : null))
      .catch(() => setDetail(null));
  };

  const remove = (id: string) => {
    apiFetch('/api/projects/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    }).then(() => {
      if (detail && detail.id === id) setDetail(null);
      load();
    });
  };

  const run = (id: string) => {
    apiFetch('/api/projects/detail?id=' + encodeURIComponent(id))
      .then((r) => r.json())
      .then((d) => {
        const rec = d as ProjectRecord;
        onRun(rec.prompt && rec.prompt.trim() ? rec.prompt : rec.title, rec.id);
      })
      .catch(() => undefined);
  };

  return (
    <div className="view">
      <header className="view-head">
        <div>
          <h2>{tr('navProjects')}</h2>
          <p>{live ? tr('projSubLive') : tr('projSubDemo')}</p>
        </div>
        <span className={`chip ${live ? 'chip-live' : 'chip-demo'}`}>
          <span className="pulse" /> {live ? tr('liveData') : tr('demoData')}
        </span>
      </header>

      {guest && <p className="proj-guest-note">{tr('guestReadOnly')}</p>}

      {!guest && (
      <section className="proj-form">
        <div className="proj-form-row">
          <input
            className="proj-input"
            placeholder={tr('projTitlePh')}
            aria-label={tr('projTitle')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <button type="button" className="proj-btn primary" disabled={busy} onClick={create}>
            {tr('projCreate')}
          </button>
        </div>
        <textarea
          className="proj-textarea"
          placeholder={tr('projPrompt')}
          aria-label={tr('projPrompt')}
          rows={4}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        <div className="proj-form-row">
          <label className="proj-file">
            <input
              type="file"
              accept=".md,.markdown,.txt,text/markdown,text/plain"
              onChange={(e) => readMd(e.target.files ? e.target.files[0] : undefined)}
            />
            <span>{md ? md.name : tr('projMd')}</span>
          </label>
          <label className="proj-file">
            <input type="file" accept="image/*" onChange={(e) => readImage(e.target.files ? e.target.files[0] : undefined)} />
            <span>{image ? image.name : tr('projImage')}</span>
          </label>
          {md && (
            <button type="button" className="proj-btn" onClick={() => setMd(null)}>
              {tr('projClearMd')}
            </button>
          )}
          {image && (
            <button type="button" className="proj-btn" onClick={() => setImage(null)}>
              {tr('projClearImage')}
            </button>
          )}
        </div>
        {error && <p className="proj-err">{error}</p>}
      </section>
      )}

      {detail && (
        <section className="proj-detail">
          <div className="proj-detail-head">
            <b>{detail.title}</b>
            <button type="button" className="proj-btn" onClick={() => setDetail(null)}>
              {tr('projClose')}
            </button>
          </div>
          {detail.image && <img className="proj-thumb" src={detail.image.dataUrl} alt={detail.image.name} />}
          <pre className="proj-pre">{detail.prompt || tr('projNoPrompt')}</pre>
          {detail.md && (
            <p className="proj-meta">
              {tr('projAttached')}: {detail.md.name} ({formatSize(detail.md.content.length)})
            </p>
          )}
          <ProjectFiles id={detail.id} />
        </section>
      )}

      <div className="proj-grid">
        {items.map((p) => (
          <article className="proj-card" key={p.id}>
            <div className="proj-card-head">
              <span className="proj-ic lg">
                <Icon name="folder" size={15} />
              </span>
              <div>
                <b>{p.title}</b>
                <i>
                  {new Date(p.createdAt).toLocaleString()} - {p.words} {tr('projWords')}
                </i>
              </div>
            </div>
            <span className={'proj-status s-' + (p.status || 'new')}>{statusLabel(p.status, tr)}</span>
            <span className="bar">
              <i style={{ width: `${p.progress || 0}%` }} />
            </span>
            <p className="proj-meta">
              {p.progress || 0}% - {tr('projWorkers')} {p.workersDone || 0}/{p.workerCount || 0}
              {p.lastRunAt ? ' - ' + tr('projLastRun') + ' ' + String(p.lastRunAt).slice(11, 16) : ''}
            </p>
            <p className="proj-meta">
              {p.mdName ? 'md: ' + p.mdName + ' (' + formatSize(p.mdSize || 0) + ')' : tr('projNoMd')}
              {p.hasImage ? ' - image: ' + p.imageName : ''}
            </p>
            <p className="proj-meta">folder: {p.folder || 'agent-workspace/projects/' + p.id}</p>
            <div className="proj-card-actions">
              {!guest && (
                <button
                  type="button"
                  className="proj-btn primary"
                  disabled={p.status === 'running' || p.status === 'planning'}
                  onClick={() => run(p.id)}
                >
                  {p.status === 'running' || p.status === 'planning' ? tr('projRunning') : tr('projRun')}
                </button>
              )}
              {!guest && (
                <button type="button" className="proj-btn" onClick={() => openDetail(p.id)}>
                  {tr('projDetail')}
                </button>
              )}
              {!guest && (
                <button type="button" className="proj-btn danger" onClick={() => remove(p.id)}>
                  {tr('projDelete')}
                </button>
              )}
            </div>
          </article>
        ))}
        {items.length === 0 && <p className="proj-empty">{tr('projEmpty')}</p>}
      </div>
    </div>
  );
}

export function AgentModal({
  agent,
  tasks,
  live,
  onClose,
  onFocus,
}: {
  agent: Agent;
  tasks: Task[];
  live?: boolean;
  onClose: () => void;
  onFocus: () => void;
}) {
  const { t: tr } = useLang();
  const own = tasks.filter((t) => t.agentId === agent.id);
  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal"
        style={{ ['--accent' as string]: agent.accent }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`${agent.name} details`}
      >
        <header className="modal-head">
          <span className="agent-av xl">
            <Icon name={ROLE_ICON[agent.id]} size={20} />
          </span>
          <div className="modal-id">
            <h3>{agent.name}</h3>
            <p>
              {agent.codename} · {agent.role}
            </p>
          </div>
          <span className={`status st-${agent.status}`}>
            <span className="dot" />
            {statusText(agent.status, tr)}
          </span>
          <button type="button" className="icon-btn" onClick={onClose} aria-label={tr('close')}>
            <Icon name="close" size={16} />
          </button>
        </header>

        <div className="modal-body">
          <div className="modal-block">
            <h4>{tr('rightNow')}</h4>
            <p className="modal-activity">
              <span className="pulse" /> {agent.activity}
            </p>
          </div>

          {live ? (
            <div className="modal-stats">
              <span>
                <b>{own.length}</b>
                <i>{tr('tasksThisRun')}</i>
              </span>
              <span>
                <b>{own.filter((t) => t.status === 'done').length}</b>
                <i>{tr('stDone')}</i>
              </span>
              <span>
                <b>{own.filter((t) => t.status === 'running').length}</b>
                <i>{tr('stRunning')}</i>
              </span>
              <span>
                <b>{own.filter((t) => t.status === 'failed').length}</b>
                <i>{tr('stFailed')}</i>
              </span>
            </div>
          ) : (
            <div className="modal-stats">
              <span>
                <b>{agent.stats.done}</b>
                <i>{tr('tasksDone')}</i>
              </span>
              <span>
                <b>{agent.stats.success}%</b>
                <i>{tr('successRate')}</i>
              </span>
              <span>
                <b>{agent.stats.avg}</b>
                <i>{tr('avgRuntime')}</i>
              </span>
              <span>
                <b>{own.length}</b>
                <i>{tr('openTasks')}</i>
              </span>
            </div>
          )}

          <div className="modal-block">
            <h4>{tr('openTasks')}</h4>
            {own.length === 0 && <p className="muted">{tr('noOpenTasks')}</p>}
            <ul className="mini-list">
              {own.map((t) => (
                <li key={t.id}>
                  <span className={`dot d-${t.status}`} />
                  <span>{t.title}</span>
                  <em>{t.progress}%</em>
                </li>
              ))}
            </ul>
          </div>

          {!live && (
            <div className="modal-block">
              <h4>{tr('recentEvents')}</h4>
              <ul className="event-list">
                {agent.events.map((e, i) => (
                  <li key={i}>
                    <time>{e.at}</time>
                    <span>{e.text}</span>
                    <em>{e.source}</em>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="modal-block">
            <h4>{tr('skills')}</h4>
            <div className="tags">
              {agent.skills.map((s) => (
                <span key={s}>{s}</span>
              ))}
            </div>
          </div>
        </div>

        <footer className="modal-foot">
          <button type="button" className="btn ghost" onClick={onFocus}>
            <Icon name="target" size={14} /> Focus in scene
          </button>
          <button type="button" className="btn primary" onClick={onClose}>
            Done
          </button>
        </footer>
      </div>
    </div>
  );
}

export function TaskModal({
  task,
  agent,
  onClose,
}: {
  task: Task;
  agent?: Agent;
  onClose: () => void;
}) {
  const { t: tr } = useLang();
  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div className="modal narrow" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <header className="modal-head">
          <span className="task-ic lg t-${task.status}">
            <Icon name="play" size={14} />
          </span>
          <div className="modal-id">
            <h3>{task.title}</h3>
            <p>
              {task.id} · {task.project}
            </p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label={tr('close')}>
            <Icon name="close" size={16} />
          </button>
        </header>
        <div className="modal-body">
          <div className="kv">
            <span>{tr('status')}</span>
            <b>{statusText(task.status, tr)}</b>
          </div>
          <div className="kv">
            <span>{tr('assignedTo')}</span>
            <b>{agent ? `${agent.name} (${agent.codename})` : task.agentId}</b>
          </div>
          <div className="kv">
            <span>{tr('progress')}</span>
            <b>{task.progress}%</b>
          </div>
          <div className="kv">
            <span>{tr('created')}</span>
            <b>{task.createdAt}</b>
          </div>
          <div className="kv">
            <span>{tr('output')}</span>
            <b>{task.output ?? 'Not produced yet'}</b>
          </div>
          <p className="muted small">
            This record lives in the browser session only. Phase 2 adds the persistent store and
            the verified Hermes adapter.
          </p>
        </div>
        <footer className="modal-foot">
          <button type="button" className="btn primary" onClick={onClose}>
            Close
          </button>
        </footer>
      </div>
    </div>
  );
}

export function ComingSoon({ title }: { title: string }) {
  return (
    <div className="view">
      <div className="soon">
        <span className="soon-ic">
          <Icon name="spark" size={20} />
        </span>
        <h2>{title}</h2>
        <p>
          Out of scope for the Phase 1 build. This view lands once the backend, persistence and the
          verified Hermes adapter exist.
        </p>
      </div>
    </div>
  );
}

export function ToolsView() {
  const { t: tr } = useLang();
  const [items, setItems] = useState<SkillRecord[]>([]);
  const [runtime, setRuntime] = useState<Record<string, unknown> | null>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    apiFetch('/api/skills')
      .then((r) => r.json())
      .then((d) => setItems(Array.isArray(d) ? d : []))
      .catch(() => setItems([]));
    apiFetch('/api/runtime')
      .then((r) => r.json())
      .then((d) => setRuntime(d))
      .catch(() => setRuntime(null));
  }, []);

  const q = query.trim().toLowerCase();
  const list = q
    ? items.filter((s) => (s.folder + ' ' + s.name + ' ' + s.description).toLowerCase().includes(q))
    : items;

  return (
    <div className="view">
      <header className="view-head">
        <div>
          <h2>{tr('toolsTitle')}</h2>
          <p>{tr('toolsSub')}</p>
        </div>
        <span className="chip chip-demo">{items.length} {tr('skillsCount')}</span>
      </header>

      <section className="proj-form">
        <div className="proj-form-row">
          <input
            className="proj-input"
            placeholder={tr('searchSkills')}
            aria-label={tr('searchSkills')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </section>

      <section className="proj-detail">
        <div className="proj-detail-head">
          <b>{tr('agentRuntime')}</b>
          <span className="proj-meta">{runtime && runtime.updatedAt ? tr('checked') + ' ' + new Date(String(runtime.updatedAt)).toLocaleTimeString() : tr('checkingShort')}</span>
        </div>
        <ul className="skill-runtime">
          <li>
            <em>Hermes</em>
            <span>{runtime && runtime.hermes ? String(runtime.hermes) : 'not reachable'}</span>
          </li>
          <li>
            <em>OpenCode</em>
            <span>{runtime && runtime.opencode ? String(runtime.opencode) : 'not reachable'}</span>
          </li>
          <li>
            <em>Model</em>
            <span>{runtime && runtime.model ? String(runtime.model) : '-'}</span>
          </li>
          <li>
            <em>Gateway</em>
            <span>{runtime && runtime.gateway ? String(runtime.gateway) : '-'}</span>
          </li>
          <li>
            <em>Bridge</em>
            <span>{runtime && runtime.bridge ? String(runtime.bridge) : '-'}</span>
          </li>
          <li>
            <em>Workspace</em>
            <span>{runtime && runtime.workspace ? String(runtime.workspace) : '-'}</span>
          </li>
          <li>
            <em>{tr('labelMemory')}</em>
            <span>
              {runtime && runtime.memory
                ? String((runtime.memory as { path: string }).path) + ' (' + String((runtime.memory as { sizeKb: number }).sizeKb) + ' KB)'
                : '-'}
            </span>
          </li>
          <li>
            <em>{tr('skills')}</em>
            <span>{runtime && runtime.skills ? String(runtime.skills) + ' ' + tr('installed') : '-'}</span>
          </li>
        </ul>
      </section>

      <div className="proj-grid">
        {list.map((s) => (
          <article className="proj-card" key={s.folder}>
            <div className="proj-card-head">
              <span className="proj-ic lg">
                <Icon name="folder" size={15} />
              </span>
              <div>
                <b>{s.name || s.folder}</b>
                <i>{s.folder}</i>
              </div>
            </div>
            <p className="skill-desc">{s.description || 'No description in SKILL.md.'}</p>
            <div className="proj-card-actions">
              <button type="button" className="proj-btn" onClick={() => setOpen(open === s.folder ? null : s.folder)}>
                {open === s.folder ? 'Hide' : 'Detail'}
              </button>
            </div>
            {open === s.folder && (
              <div className="skill-detail">
                <p className="proj-meta">Path: skills/{s.folder}</p>
                <p className="proj-meta">{s.files} items - contract: SKILL.md frontmatter (name + description)</p>
              </div>
            )}
          </article>
        ))}
        {list.length === 0 && (
          <p className="proj-empty">{items.length ? 'No skill matches that search.' : 'Skills library is empty on this VM.'}</p>
        )}
      </div>
    </div>
  );
}

const THEMES: { id: string; label: string; color: string }[] = [
  { id: 'violet', label: 'Violet', color: '#8b5cf6' },
  { id: 'cyan', label: 'Cyan', color: '#22d3ee' },
  { id: 'amber', label: 'Amber', color: '#f59e0b' },
  { id: 'rose', label: 'Rose', color: '#fb7185' },
];

const UNIFORMS: { id: string; label: string; color: string }[] = [
  { id: 'original', label: 'Original', color: 'linear-gradient(135deg,#8b5cf6,#22d3ee)' },
  { id: 'navy', label: 'Navy', color: '#2b3a67' },
  { id: 'cream', label: 'Cream', color: '#efe6d4' },
  { id: 'black', label: 'Black', color: '#22202c' },
  { id: 'sage', label: 'Sage', color: '#7f9c7a' },
  { id: 'maroon', label: 'Maroon', color: '#7a2f3a' },
];

export function SettingsView({
  theme,
  uniform,
  reduced,
  onTheme,
  onUniform,
  onToggleReduced,
}: {
  theme: string;
  uniform: string;
  reduced: boolean;
  onTheme: (v: string) => void;
  onUniform: (v: string) => void;
  onToggleReduced: () => void;
}) {
  const { t: tr } = useLang();
  return (
    <div className="view">
      <header className="view-head">
        <div>
          <h2>{tr('settingsTitle')}</h2>
          <p>{tr('settingsSub')}</p>
        </div>
        <span className="chip chip-live">
          <span className="pulse" /> {tr('savedLocal')}
        </span>
      </header>

      <section className="proj-form">
        <b className="set-title">{tr('theme')}</b>
        <div className="set-row">
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              className={'swatch' + (theme === t.id ? ' is-active' : '')}
              onClick={() => onTheme(t.id)}
            >
              <span className="swatch-dot" style={{ background: t.color }} />
              {t.label}
            </button>
          ))}
        </div>
        <p className="proj-meta">{tr('themeHint')}</p>
      </section>

      <section className="proj-form">
        <b className="set-title">{tr('uniform')}</b>
        <div className="set-row">
          {UNIFORMS.map((u) => (
            <button
              key={u.id}
              type="button"
              className={'swatch' + (uniform === u.id ? ' is-active' : '')}
              onClick={() => onUniform(u.id)}
            >
              <span className="swatch-dot" style={{ background: u.color }} />
              {u.label}
            </button>
          ))}
        </div>
        <p className="proj-meta">{tr('uniformHint')}</p>
      </section>

      <section className="proj-form">
        <b className="set-title">{tr('motion')}</b>
        <div className="set-row">
          <button type="button" className={'swatch' + (reduced ? ' is-active' : '')} onClick={onToggleReduced}>
            {reduced ? tr('reducedOn') : tr('reducedOff')}
          </button>
        </div>
        <p className="proj-meta">{tr('reducedHint')}</p>
      </section>
    </div>
  );
}

type KnowledgeData = {
  memories: { topic: string; summary: string; keywords: string; created_at: string; source_type: string }[];
  facts: { entity: string; key: string; value: string; created_at: string }[];
  topics?: number;
  dbKb?: number;
  error?: string;
};

export function KnowledgeView({ guest }: { guest?: boolean }) {
  const { t: tr } = useLang();
  const [data, setData] = useState<KnowledgeData | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    // The bridge refuses /api/knowledge for guests, so do not even ask.
    if (guest) return;
    setLoading(true);
    apiFetch('/api/knowledge')
      .then((r) => r.json())
      .then((d) => {
        const k = (d && typeof d === 'object' ? d : {}) as Partial<KnowledgeData>;
        setData({
          ...k,
          memories: Array.isArray(k.memories) ? k.memories : [],
          facts: Array.isArray(k.facts) ? k.facts : [],
        });
      })
      .catch(() => setData({ memories: [], facts: [], error: 'unreachable' }))
      .finally(() => setLoading(false));
  }, [guest]);

  useEffect(() => {
    load();
  }, [load]);

  if (guest) {
    return (
      <div className="view">
        <header className="view-head">
          <div>
            <h2>{tr('knowledgeTitle')}</h2>
            <p>{tr('knowledgeSub')}</p>
          </div>
        </header>
        <p className="proj-guest-note">{tr('guestPrivate')}</p>
      </div>
    );
  }

  const q = query.trim().toLowerCase();
  const mems = (data?.memories || []).filter(
    (m) => !q || (m.topic + ' ' + m.summary + ' ' + (m.keywords || '')).toLowerCase().includes(q),
  );

  return (
    <div className="view">
      <header className="view-head">
        <div>
          <h2>{tr('knowledgeTitle')}</h2>
          <p>{tr('knowledgeSub')}</p>
        </div>
        <span className="chip chip-demo">{data ? (data.memories || []).length : 0} {tr('memoriesCount')}</span>
      </header>

      <section className="proj-form">
        <div className="proj-form-row">
          <input
            className="proj-input"
            placeholder={tr('searchMemory')}
            aria-label={tr('searchMemory')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="button" className="proj-btn" onClick={load} disabled={loading}>
            {loading ? tr('refreshing') : tr('refresh')}
          </button>
        </div>
        <p className="proj-meta">
          {data && data.dbKb ? tr('icmDb') + ': ' + data.dbKb + ' KB' : tr('icmDb') + ': ' + tr('unknownWord')}
          {data && data.topics ? ' - ' + data.topics + ' ' + tr('topicsCount') : ''}
          {data && data.error ? ' - error: ' + data.error : ''}
        </p>
      </section>

      <div className="proj-grid">
        {mems.map((m, i) => (
          <article className="proj-card" key={m.topic + i}>
            <div className="proj-card-head">
              <span className="proj-ic lg">
                <Icon name="folder" size={15} />
              </span>
              <div>
                <b>{m.topic}</b>
                <i>
                  {String(m.created_at).slice(0, 16).replace('T', ' ')} - {m.source_type}
                </i>
              </div>
            </div>
            <p className="know-text">{m.summary}</p>
            {m.keywords && m.keywords !== '[]' && (
              <p className="proj-meta">keywords: {m.keywords.replace(/[[\]"]/g, '')}</p>
            )}
          </article>
        ))}
        {mems.length === 0 && (
          <p className="proj-empty">
            {loading
              ? 'Loading memory...'
              : data && data.memories.length
                ? 'No memory matches that search.'
                : 'No memory stored yet. Run a project and the agents write to ICM.'}
          </p>
        )}
      </div>
    </div>
  );
}

import { useState } from 'react';
import type { Agent, AgentId, FlowStep, Project, Task, View } from '../types';
import { Icon } from './Icon';
import { LangToggle, statusText, useLang } from '../lang';

function navLabel(view: string, t: (k: string) => string): string {
  const map: Record<string, string> = {
    office: t('navOffice'),
    agents: t('navAgents'),
    tasks: t('navTasks'),
    projects: t('navProjects'),
    knowledge: t('navKnowledge'),
    tools: t('navTools'),
    settings: t('navSettings'),
  };
  return map[view] || view;
}

const ROLE_ICON: Record<string, string> = {
  manager: 'compass',
  researcher: 'search',
  developer: 'code',
  designer: 'palette',
  content: 'pen',
  analyst: 'chart',
  qa: 'shield',
};

export const NAV: { id: View | 'knowledge' | 'tools' | 'settings'; label: string; icon: string }[] = [
  { id: 'office', label: 'Office', icon: 'home' },
  { id: 'agents', label: 'Agents', icon: 'users' },
  { id: 'tasks', label: 'Tasks', icon: 'tasks' },
  { id: 'projects', label: 'Projects', icon: 'folder' },
  { id: 'knowledge', label: 'Knowledge', icon: 'book' },
  { id: 'tools', label: 'Tools', icon: 'tools' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

export function Sidebar({
  view,
  onNavigate,
  agentCount,
  runningCount,
  runtime,
  guest,
}: {
  view: View;
  onNavigate: (v: View | 'knowledge' | 'tools' | 'settings') => void;
  agentCount: number;
  runningCount: number;
  runtime: {
    hermes: boolean;
    opencode: boolean;
    hermesOk: boolean;
    opencodeOk: boolean;
    model: string;
  } | null;
  guest?: boolean;
}) {
  const { t } = useLang();
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">
          <Icon name="layers" size={18} />
        </div>
        <div className="brand-text">
          <strong>ineedhood tech</strong>
          <span>{t('brandTag')}</span>
        </div>
      </div>

      {guest && (
        <div className="guest-badge">
          <Icon name="eye" size={13} />
          <span>{t('guestMode')}</span>
        </div>
      )}

      <nav className="nav">
        {NAV.map((item) => {
          const active = item.id === view;
          const badge =
            item.id === 'agents' ? agentCount : item.id === 'tasks' ? runningCount : null;
          return (
            <button
              key={item.id}
              className={`nav-item${active ? ' is-active' : ''}`}
              onClick={() => onNavigate(item.id)}
              type="button"
            >
              <Icon name={item.icon} size={16} />
              <span>{navLabel(item.id, t)}</span>
              {badge !== null && <em>{badge}</em>}
            </button>
          );
        })}
      </nav>

      <div className="side-foot">
        <div className="health">
          <span className="health-dot is-on" />
          <span>{t('webOnline')}</span>
        </div>
        <div className="health">
          <span className={`health-dot ${runtime && runtime.hermes ? 'is-on' : 'is-off'}`} />
          <span>
            {runtime === null
              ? t('checking')
              : runtime.hermes
                ? t('hermesOn')
                : runtime.hermesOk
                  ? t('hermesOff')
                  : t('hermesProbe')}
          </span>
        </div>
        <div className="health">
          <span className={`health-dot ${runtime && runtime.opencode ? 'is-on' : 'is-off'}`} />
          <span>
            {runtime === null
              ? t('checking')
              : runtime.opencode
                ? t('opencodeOn')
                : runtime.opencodeOk
                  ? t('opencodeOff')
                  : t('opencodeProbe')}
          </span>
        </div>
        {runtime && runtime.model && <div className="health">{runtime.model}</div>}
        <LangToggle />
        <p className="tagline">{t('tagline')}</p>
      </div>
    </aside>
  );
}

export function PanelHead({
  title,
  count,
  action,
  onAction,
}: {
  title: string;
  count?: number;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="panel-head">
      <h3>
        {title}
        {count !== undefined && <span className="count">{count}</span>}
      </h3>
      {action && (
        <button type="button" className="link" onClick={onAction}>
          {action}
        </button>
      )}
    </div>
  );
}

export function AgentRoster({
  agents,
  selected,
  onSelect,
  onViewAll,
}: {
  agents: Agent[];
  selected: AgentId | null;
  onSelect: (id: AgentId) => void;
  onViewAll: () => void;
}) {
  const { t: tr } = useLang();
  return (
    <section className="panel">
      <PanelHead title={tr('activeAgents')} count={agents.filter((a) => a.status !== 'idle').length} action={tr('viewAll')} onAction={onViewAll} />
      <ul className="agent-list">
        {agents.map((a) => (
          <li key={a.id}>
            <button
              type="button"
              className={`agent-row${selected === a.id ? ' is-active' : ''}`}
              onClick={() => onSelect(a.id)}
              style={{ ['--accent' as string]: a.accent }}
            >
              <span className="agent-av">
                <Icon name={ROLE_ICON[a.id]} size={13} />
              </span>
              <span className="agent-meta">
                <b>{a.name}</b>
                <i>{a.activity}</i>
              </span>
              <span className={`status st-${a.status}`}>
                <span className="dot" />
                {statusText(a.status, tr)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function TaskPanel({
  tasks,
  onViewAll,
  onOpen,
}: {
  tasks: Task[];
  onViewAll: () => void;
  onOpen: (id: string) => void;
}) {
  const { t: tr } = useLang();
  return (
    <section className="panel">
      <PanelHead title={tr('currentTasks')} count={tasks.length} action={tr('viewAll')} onAction={onViewAll} />
      <ul className="task-list">
        {tasks.map((t) => (
          <li key={t.id}>
            <button type="button" className="task-row" onClick={() => onOpen(t.id)}>
              <span className={`task-ic t-${t.status}`}>
                <Icon name={t.status === 'done' ? 'check' : t.status === 'failed' ? 'alert' : 'play'} size={11} />
              </span>
              <span className="task-meta">
                <b>{t.title}</b>
                <i>
                  {tr(t.tag)} · {t.agentId}
                </i>
              </span>
              <span className="task-progress">
                <span className={`bar b-${t.status}`}>
                  <i style={{ width: `${t.progress}%` }} />
                </span>
                <em>{t.progress}%</em>
              </span>
            </button>
          </li>
        ))}
      </ul>
      {tasks.length === 0 && (
        <p className="proj-empty">{tr('cmdNoActive')}</p>
      )}
    </section>
  );
}

export function ProjectPanel({ projects }: { projects: Project[] }) {
  const { t: tr } = useLang();
  return (
    <section className="panel">
      <PanelHead title={tr('navProjects')} count={projects.length} />
      <ul className="proj-list">
        {projects.map((p) => (
          <li key={p.id} className="proj-row">
            <span className="proj-ic">
              <Icon name="folder" size={13} />
            </span>
            <span className="proj-meta">
              <b>{p.name}</b>
              <i>{tr(p.tag)}</i>
            </span>
            <span className="proj-progress">
              <span className="bar">
                <i style={{ width: `${p.progress}%` }} />
              </span>
              <em>{p.progress}%</em>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function TaskFlowPanel({ steps }: { steps: FlowStep[] }) {
  const { t: tr } = useLang();
  return (
    <section className="panel flow-panel">
      <PanelHead title={tr('taskFlow')} />
      <div className="flow">
        {steps.map((s, i) => (
          <div className={`flow-step fs-${s.state}`} key={s.id}>
            <div className="flow-node">
              <Icon name={s.state === 'done' ? 'check' : s.icon} size={13} />
            </div>
            <b>{s.label}</b>
            <i>{s.meta}</i>
            {i < steps.length - 1 && <span className="flow-link" />}
          </div>
        ))}
      </div>
    </section>
  );
}

export function CommandCenter({
  onSubmit,
  live,
  guest,
}: {
  onSubmit: (text: string) => void;
  live: boolean;
  guest?: boolean;
}) {
  const [text, setText] = useState('');
  const { t: tr } = useLang();
  return (
    <section className="panel cmd-panel">
      <div className="cmd-head">
        <Icon name="spark" size={14} />
        <b>{tr('cmdCenter')}</b>
        {guest ? (
          <span className="demo-chip is-guest">{tr('guestMode')}</span>
        ) : live ? (
          <span className="demo-chip is-live">{tr('liveShort')}</span>
        ) : (
          <span className="demo-chip">{tr('demoMode')}</span>
        )}
      </div>
      <form
        className="cmd-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (guest || !text.trim()) return;
          onSubmit(text.trim());
          setText('');
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={guest ? tr('guestCmdPh') : tr('cmdInput')}
          aria-label={tr('cmdAria')}
          disabled={guest}
        />
        <button type="submit" className="send" aria-label={tr('cmdSubmitAria')} disabled={guest}>
          <Icon name="send" size={15} />
        </button>
      </form>
      <p className="cmd-note">
        {guest ? tr('guestCmdNote') : live ? tr('cmdNoteLive') : tr('cmdNoteOff')}
      </p>
    </section>
  );
}

export function StatusBar({
  fps,
  reduced,
  live,
  onToggleReduced,
  onReset,
  onTogglePanels,
}: {
  fps: number;
  reduced: boolean;
  live: boolean;
  onToggleReduced: () => void;
  onReset: () => void;
  onTogglePanels: () => void;
}) {
  const { t: tr } = useLang();
  return (
    <div className="statusbar">
      <span className={`chip ${live ? 'chip-live' : 'chip-demo'}`}>
        <span className="pulse" /> {live ? tr('liveData') : tr('demoData')}
      </span>
      <span className="chip">{fps || '--'} fps</span>
      <span className="chip hint">{tr('orbitHint')}</span>
      <button type="button" className="chip chip-btn" onClick={onReset}>
        <Icon name="reset" size={13} /> {tr('resetView')}
      </button>
      <button
        type="button"
        className={`chip chip-btn${reduced ? ' is-on' : ''}`}
        onClick={onToggleReduced}
      >
        <Icon name={reduced ? 'pause' : 'play'} size={12} /> {tr('reducedMotion')}
      </button>
      <button type="button" className="chip chip-btn only-narrow" onClick={onTogglePanels}>
        <Icon name="layers" size={13} /> {tr('panels')}
      </button>
    </div>
  );
}

export function Toast({ text }: { text: string }) {
  return (
    <div className="toast" role="status">
      <Icon name="check" size={14} />
      <span>{text}</span>
    </div>
  );
}

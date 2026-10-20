import type { Agent, FlowStep, Project, Task } from '../types';

// All values below are DEMO data for Phase 1. Nothing here is produced by a
// backend or by Hermes. The UI labels it as demo everywhere it is shown.
export const DEMO_LABEL = 'Demo data';

export const AGENTS: Agent[] = [
  {
    id: 'manager',
    name: 'Manager',
    codename: 'Kaze',
    role: 'Planning & Coordination',
    status: 'working',
    activity: 'Splitting the brief into 6 tasks',
    accent: '#a78bfa',
    hair: '#f5d76e',
    outfit: '#4c3f7a',
    skills: ['Task decomposition', 'Handoffs', 'Priority calls'],
    stats: { done: 42, success: 96, avg: '1m 40s' },
    events: [
      { at: '20:41', text: 'Opened run for "Portfolio Website v2"', source: 'task' },
      { at: '20:42', text: 'Assigned 4 of 6 subtasks', source: 'handoff' },
      { at: '20:44', text: 'Waiting on designer wireframe before dev start', source: 'note' },
    ],
  },
  {
    id: 'researcher',
    name: 'Researcher',
    codename: 'Sora',
    role: 'Gathering information',
    status: 'searching',
    activity: 'Reading source 7 of 12',
    accent: '#60a5fa',
    hair: '#2f3b57',
    outfit: '#27405f',
    skills: ['Web research', 'Summarisation', 'Source checks'],
    stats: { done: 28, success: 92, avg: '2m 05s' },
    events: [
      { at: '20:36', text: 'Collected 12 candidate references', source: 'tool' },
      { at: '20:39', text: 'Dropped 5 low-quality sources', source: 'note' },
    ],
  },
  {
    id: 'developer',
    name: 'Developer',
    codename: 'Ren',
    role: 'Coding & Implementation',
    status: 'working',
    activity: 'Building landing page section 3',
    accent: '#34d399',
    hair: '#e8e8ef',
    outfit: '#1f4d43',
    skills: ['TypeScript', 'React', 'Build pipeline'],
    stats: { done: 61, success: 89, avg: '4m 12s' },
    events: [
      { at: '20:38', text: 'Scaffolded hero + pricing sections', source: 'tool' },
      { at: '20:43', text: 'Build passing locally', source: 'tool' },
    ],
  },
  {
    id: 'designer',
    name: 'Designer',
    codename: 'Yui',
    role: 'UI & Visuals',
    status: 'working',
    activity: 'Wireframe pass 2',
    accent: '#f472b6',
    hair: '#f2a3c7',
    outfit: '#5b2a4a',
    skills: ['Layout', 'Type scale', 'Design tokens'],
    stats: { done: 33, success: 94, avg: '3m 30s' },
    events: [
      { at: '20:35', text: 'Drafted 2 layout directions', source: 'note' },
      { at: '20:40', text: 'Picked direction B for review', source: 'note' },
    ],
  },
  {
    id: 'content',
    name: 'Content',
    codename: 'Haru',
    role: 'Writing & Media',
    status: 'working',
    activity: 'Drafting landing copy',
    accent: '#fb923c',
    hair: '#e07a3a',
    outfit: '#5c3418',
    skills: ['Copywriting', 'Tone', 'Editing'],
    stats: { done: 47, success: 91, avg: '2m 48s' },
    events: [{ at: '20:37', text: 'Draft 1 saved (420 words)', source: 'file' }],
  },
  {
    id: 'analyst',
    name: 'Analyst',
    codename: 'Rin',
    role: 'Data & Insights',
    status: 'working',
    activity: 'Parsing traffic export',
    accent: '#22d3ee',
    hair: '#1f3a4d',
    outfit: '#123c4a',
    skills: ['SQL', 'Charts', 'Anomaly checks'],
    stats: { done: 19, success: 97, avg: '1m 55s' },
    events: [{ at: '20:33', text: 'Loaded 18,402 rows', source: 'tool' }],
  },
  {
    id: 'qa',
    name: 'QA / Reviewer',
    codename: 'Aki',
    role: 'Testing & Quality',
    status: 'blocked',
    activity: 'Waiting on dev build',
    accent: '#f87171',
    hair: '#d8d8e2',
    outfit: '#4a2530',
    skills: ['Test plans', 'Regressions', 'Acceptance'],
    stats: { done: 25, success: 93, avg: '1m 20s' },
    events: [{ at: '20:31', text: 'Queued regression suite', source: 'task' }],
  },
];

export const TASKS: Task[] = [
  {
    id: 't-1041',
    title: 'Build landing page',
    agentId: 'developer',
    status: 'running',
    progress: 75,
    tag: 'Build',
    project: 'Portfolio Website',
    createdAt: '20:38',
  },
  {
    id: 't-1042',
    title: 'Write content draft',
    agentId: 'content',
    status: 'running',
    progress: 60,
    tag: 'Content',
    project: 'Content Plan',
    createdAt: '20:37',
  },
  {
    id: 't-1043',
    title: 'Analyze user data',
    agentId: 'analyst',
    status: 'running',
    progress: 42,
    tag: 'Data',
    project: 'Data Analysis',
    createdAt: '20:33',
  },
  {
    id: 't-1044',
    title: 'Design UI components',
    agentId: 'designer',
    status: 'waiting',
    progress: 50,
    tag: 'Design',
    project: 'Portfolio Website',
    createdAt: '20:35',
  },
  {
    id: 't-1045',
    title: 'Fix bugs & test',
    agentId: 'qa',
    status: 'queued',
    progress: 0,
    tag: 'QA',
    project: 'Portfolio Website',
    createdAt: '20:31',
  },
  {
    id: 't-1040',
    title: 'Competitor scan',
    agentId: 'researcher',
    status: 'running',
    progress: 58,
    tag: 'Research',
    project: 'Content Plan',
    createdAt: '20:36',
  },
  {
    id: 't-1039',
    title: 'Break brief into tasks',
    agentId: 'manager',
    status: 'done',
    progress: 100,
    tag: 'Planning',
    project: 'Portfolio Website',
    createdAt: '20:30',
    output: '6 subtasks created, 4 assigned',
  },
];

export const PROJECTS: Project[] = [
  { id: 'p1', name: 'Portfolio Website', progress: 75, status: 'running', tag: 'Web' },
  { id: 'p2', name: 'Content Plan', progress: 35, status: 'running', tag: 'Content' },
  { id: 'p3', name: 'Data Analysis', progress: 0, status: 'queued', tag: 'Data' },
];

export const FLOW: FlowStep[] = [
  { id: 'f1', label: 'Research', state: 'done', meta: 'Done', icon: 'search' },
  { id: 'f2', label: 'Design', state: 'active', meta: 'In progress', icon: 'palette' },
  { id: 'f3', label: 'Develop', state: 'waiting', meta: 'Waiting', icon: 'code' },
  { id: 'f4', label: 'Test', state: 'waiting', meta: 'Waiting', icon: 'shield' },
  { id: 'f5', label: 'Deploy', state: 'waiting', meta: 'Waiting', icon: 'bolt' },
];

export const GOALS = [
  'Build new website',
  'Create content',
  'Analyze data',
  'Deploy bot',
];

export const STATUS_TEXT: Record<string, string> = {
  working: 'Working',
  searching: 'Searching',
  idle: 'Idle',
  blocked: 'Blocked',
  running: 'In progress',
  queued: 'Queued',
  waiting: 'Waiting',
  done: 'Done',
  failed: 'Failed',
};

export function agentById(id: string): Agent | undefined {
  return AGENTS.find((a) => a.id === id);
}

// Scripted demo loop for the floating bubbles. Each agent alternates between a
// task and its output. Nothing here is produced by Hermes.
export const AGENT_WORK: Record<string, { task: string; output: string }[]> = {
  manager: [
    { task: 'Split brief into tasks', output: '6 subtasks created' },
    { task: 'Review design direction', output: 'Approved direction B' },
  ],
  researcher: [
    { task: 'Scan competitor sites', output: '12 sources summarised' },
    { task: 'Rank references', output: 'research-notes.md' },
  ],
  developer: [
    { task: 'Build hero section', output: 'dist/index.html' },
    { task: 'Fix nav overlap', output: 'commit 8f2c1a' },
  ],
  designer: [
    { task: 'Wireframe pricing block', output: 'pricing-v2.fig' },
    { task: 'Export icon set', output: 'icons-24.svg' },
  ],
  content: [
    { task: 'Draft hero copy', output: 'hero-copy.md' },
    { task: 'Rewrite CTA block', output: 'cta-v3.md' },
  ],
  analyst: [
    { task: 'Parse traffic CSV', output: 'traffic-summary.csv' },
    { task: 'Flag anomalies', output: '3 outliers found' },
  ],
  qa: [
    { task: 'Run regression suite', output: '34/34 passed' },
    { task: 'Check accessibility', output: 'a11y-report.md' },
  ],
};

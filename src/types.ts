export type AgentId =
  | 'manager'
  | 'researcher'
  | 'developer'
  | 'designer'
  | 'content'
  | 'analyst'
  | 'qa';

export type AgentStatus = 'working' | 'searching' | 'idle' | 'blocked';
export type TaskStatus = 'queued' | 'running' | 'waiting' | 'done' | 'failed';
export type FlowState = 'done' | 'active' | 'waiting';
export type View = 'office' | 'agents' | 'tasks' | 'projects';

export interface AgentEvent {
  at: string;
  text: string;
  source: string;
}

export interface Agent {
  id: AgentId;
  name: string;
  codename: string;
  role: string;
  status: AgentStatus;
  activity: string;
  accent: string;
  hair: string;
  outfit: string;
  skills: string[];
  stats: { done: number; success: number; avg: string };
  events: AgentEvent[];
}

export interface Task {
  id: string;
  title: string;
  agentId: AgentId;
  status: TaskStatus;
  progress: number;
  tag: string;
  project: string;
  createdAt: string;
  output?: string;
}

export interface Project {
  id: string;
  name: string;
  progress: number;
  status: TaskStatus;
  tag: string;
}

export interface FlowStep {
  id: string;
  label: string;
  state: FlowState;
  meta: string;
  icon: string;
}

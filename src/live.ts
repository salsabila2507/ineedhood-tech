import { apiFetch, tokenQuery } from './api';

export interface LiveTask { id: string; agent: string; title: string; status: string; progress: number; output?: string }
export interface LiveState { status: string; runId: string | null; prompt: string; tasks: LiveTask[]; error: string | null; mode?: string }
export interface LiveEvent { kind: string; agent?: string; text?: string; status?: string; task?: LiveTask; error?: string }

export function connectLive(opts: {
  onReady: (s: LiveState) => void;
  onEvent: (e: LiveEvent) => void;
  onDown: () => void;
}): () => void {
  let closed = false;
  let es: EventSource | null = null;
  let fails = 0;
  let timer: number | undefined;

  const openStream = () => {
    if (closed) return;
    try {
      es = new EventSource(tokenQuery('/api/stream'));
    } catch {
      fails += 1;
      if (fails >= 3) opts.onDown();
      timer = window.setTimeout(openStream, Math.min(500 * fails, 4000));
      return;
    }
    es.onmessage = (ev) => {
      let data: unknown;
      try { data = JSON.parse(ev.data); } catch { return; }
      const d = data as LiveEvent;
      if (d.kind === 'hello') {
        fails = 0;
        opts.onReady(d as unknown as LiveState);
        return;
      }
      opts.onEvent(d);
    };
    es.onerror = () => {
      es?.close();
      es = null;
      fails += 1;
      // The reverse proxy can drop an idle SSE socket. Only report the
      // bridge as down after repeated failures, and keep retrying.
      if (fails >= 3) opts.onDown();
      timer = window.setTimeout(openStream, Math.min(500 * fails, 4000));
    };
  };

  // Heartbeat: proves the bridge is really reachable even while SSE is
  // reconnecting, and flips the UI back to live as soon as it answers.
  const ping = () => {
    if (closed) return;
    apiFetch('/api/state', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((s: LiveState) => {
        if (s && s.mode === 'live') {
          fails = 0;
          opts.onReady(s);
        }
      })
      .catch(() => undefined);
  };
  timer = window.setInterval(ping, 5000);

  openStream();
  return () => {
    closed = true;
    window.clearInterval(timer);
    es?.close();
  };
}

export async function submitLive(prompt: string, projectId?: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const r = await apiFetch('/api/task', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, projectId: projectId || null }) });
    if (!r.ok) {
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      return { ok: false, error: j.error || r.statusText };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

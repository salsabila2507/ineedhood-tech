const TOKEN_KEY = '0xyas-token';
const ROLE_KEY = '0xyas-role';

export type Role = 'owner' | 'guest';

export function getToken(): string {
  try { return localStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; }
}

export function setToken(t: string): void {
  try {
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
  } catch { /* private mode */ }
}

// The role is only a cached hint for the UI. The server decides what a token
// may do, so flipping this value in devtools unlocks nothing.
export function getRole(): Role {
  try { return localStorage.getItem(ROLE_KEY) === 'guest' ? 'guest' : 'owner'; } catch { return 'owner'; }
}

export function setRole(r: Role): void {
  try { localStorage.setItem(ROLE_KEY, r); } catch { /* private mode */ }
}

export function clearToken(): void {
  setToken('');
  try { localStorage.removeItem(ROLE_KEY); } catch { /* private mode */ }
}

export function tokenQuery(path: string): string {
  const t = getToken();
  if (!t) return path;
  return path + (path.includes('?') ? '&' : '?') + 'token=' + encodeURIComponent(t);
}

// Every fetch in the app goes through here so the session token rides along.
// On 401 the token is dropped and the app falls back to the password gate.
export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers || {});
  headers.set('cache-control', 'no-store');
  const t = getToken();
  if (t) headers.set('x-0xyas-token', t);
  const r = await fetch(input, { ...init, headers });
  if (r.status === 401) {
    clearToken();
    try { window.dispatchEvent(new Event('0xyas-logout')); } catch { /* no window in tests */ }
  }
  return r;
}

export async function login(password: string): Promise<boolean> {
  try {
    const r = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({ password }),
    });
    if (!r.ok) return false;
    const j = (await r.json()) as { token?: string; role?: Role };
    if (j.token) { setToken(j.token); setRole(j.role === 'guest' ? 'guest' : 'owner'); return true; }
    return false;
  } catch { return false; }
}

// Watch only: no password, read only session. The bridge refuses every write
// for this token, so the guest cannot start a run even by calling the API.
export async function enterGuest(): Promise<boolean> {
  try {
    const r = await fetch('/api/guest', { method: 'POST', cache: 'no-store' });
    if (!r.ok) return false;
    const j = (await r.json()) as { token?: string; role?: Role };
    if (!j.token) return false;
    setToken(j.token);
    setRole(j.role === 'guest' ? 'guest' : 'owner');
    return true;
  } catch { return false; }
}

export async function verifySession(): Promise<Role | null> {
  const t = getToken();
  if (!t) return null;
  try {
    const r = await fetch('/api/whoami', { cache: 'no-store', headers: { 'x-0xyas-token': t } });
    if (!r.ok) return null;
    const j = (await r.json()) as { role?: Role };
    if (j.role !== 'owner' && j.role !== 'guest') return null;
    setRole(j.role);
    return j.role;
  } catch { return null; }
}

export async function verifyToken(): Promise<boolean> {
  return (await verifySession()) !== null;
}

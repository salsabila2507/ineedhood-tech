import * as THREE from 'three';
import { AGENTS, AGENT_WORK } from '../data/demo';
import type { Agent, AgentId } from '../types';
import { iconSvg } from '../components/icons';
import { createChibi, type AnimMode, type Chibi } from './chibi';
import { buildRoom, GUESTS, PATROLS, STATIONS, type RoomBuild, type Stop } from './office';

const ROLE_ICON: Record<string, string> = {
  manager: 'compass',
  researcher: 'search',
  developer: 'code',
  designer: 'palette',
  content: 'pen',
  analyst: 'chart',
  qa: 'shield',
};

const STATUS_COLOR: Record<string, string> = {
  working: '#34d399',
  searching: '#60a5fa',
  idle: '#94a3b8',
  blocked: '#f87171',
};

export interface OfficeSceneOptions {
  canvas: HTMLCanvasElement;
  labelLayer: HTMLDivElement;
  onSelect: (id: AgentId | null) => void;
  onFps: (v: number) => void;
  onAgentTask: (id: AgentId, phase: 'work' | 'done', text: string, progress: number) => void;
  onArrived: (id: AgentId) => void;
}

interface Bubble {
  idx: number;
  phase: 'work' | 'done';
  t: number;
  dur: number;
  reported: number;
}

interface Entry {
  chibi: Chibi;
  agent: Agent;
}

interface Walker {
  entry: Entry;
  path: Stop[];
  idx: number;
  walking: boolean;
  timer: number;
  speed: number;
  camera: Stop | null;
}

const UNIFORMS: Record<string, string> = {
  navy: '#2b3a67',
  cream: '#efe6d4',
  black: '#22202c',
  sage: '#7f9c7a',
  maroon: '#7a2f3a',
};

const DEFAULT = { az: 36, el: 33, dist: 34, tx: 0.1, ty: 1.5, tz: 0.4 };
const WALK_SPEED = 1.05;

function shortestAngle(from: number, to: number) {
  let d = (to - from) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export class OfficeScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private room: RoomBuild;
  private entries = new Map<AgentId, Entry>();
  private walkers: Walker[] = [];
  private guestChibis: Chibi[] = [];
  private labels = new Map<AgentId, HTMLButtonElement>();
  private bubbles = new Map<AgentId, Bubble>();
  private liveMode = false;
  private busy = new Set<AgentId>();
  private waves = new Map<AgentId, number>();
  private opts: OfficeSceneOptions;

  private az = THREE.MathUtils.degToRad(DEFAULT.az);
  private el = THREE.MathUtils.degToRad(DEFAULT.el);
  private dist = DEFAULT.dist;
  private target = new THREE.Vector3(DEFAULT.tx, DEFAULT.ty, DEFAULT.tz);
  private goalAz = this.az;
  private goalEl = this.el;
  private goalDist = DEFAULT.dist;
  private dragMode: 'orbit' | 'pan' = 'orbit';
  private goalTarget = this.target.clone();

  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private dragging = false;
  private moved = 0;
  private lastX = 0;
  private lastY = 0;
  private reduced = false;
  private frames = 0;
  private fpsClock = 0;
  private lastFrame = 0;
  private elapsed = 0;
  private disposed = false;
  private ro?: ResizeObserver;
  private tmp = new THREE.Vector3();

  constructor(opts: OfficeSceneOptions) {
    this.opts = opts;

    this.renderer = new THREE.WebGLRenderer({
      canvas: opts.canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;

    this.scene.background = new THREE.Color('#a7cbe8');

    this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 220);
    this.scene.add(new THREE.HemisphereLight(0xcfe4ff, 0x4a3a2a, 0.85));
    const sun = new THREE.DirectionalLight(0xffe8c8, 2.2);
    sun.position.set(16, 21, 11);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -17;
    sun.shadow.camera.right = 17;
    sun.shadow.camera.top = 17;
    sun.shadow.camera.bottom = -17;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 70;
    // A 34 unit shadow camera over a 2048 map means ~0.017 units per texel.
    // Too small a normal bias leaves acne on the big flat walls, which reads
    // as a shimmer while the camera drifts.
    sun.shadow.bias = -0.0002;
    sun.shadow.normalBias = 0.03;
    this.scene.add(sun);

    const fill = new THREE.DirectionalLight(0xa9c4ff, 0.45);
    fill.position.set(-12, 9, -8);
    this.scene.add(fill);

    this.room = buildRoom();
    this.scene.add(this.room.root);

    AGENTS.forEach((agent) => {
      const st = STATIONS[agent.id];
      const chibi = createChibi({
        hair: agent.hair,
        outfit: agent.outfit,
        accent: agent.accent,
        seated: st.seated,
      });
      chibi.root.position.set(st.x, st.y, st.z);
      chibi.root.rotation.y = st.yaw;
      chibi.root.userData.agentId = agent.id;
      chibi.setMode(agent.status === 'blocked' ? 'idle' : agent.status === 'searching' ? 'searching' : 'typing');
      this.scene.add(chibi.root);
      const entry = { chibi, agent };
      this.entries.set(agent.id, entry);

      const home: Stop = {
        x: st.x,
        z: st.z,
        y: st.y,
        face: st.yaw,
        pause: 24 + Math.random() * 18,
        act: agent.status === 'blocked' ? 'idle' : 'typing',
      };
      const out = PATROLS[agent.id];
      const back = [...out].reverse().slice(1);
      const path = [home, ...out, ...back];
      this.walkers.push({
        entry,
        path,
        idx: 0,
        walking: false,
        timer: 6 + Math.random() * 14,
        speed: WALK_SPEED * (0.9 + Math.random() * 0.2),
        camera: null,
      });
    });

    GUESTS.forEach((g) => {
      const chibi = createChibi({ hair: g.hair, outfit: g.outfit, accent: g.accent, seated: true });
      chibi.root.position.set(g.x, 0, g.z);
      chibi.root.rotation.y = g.yaw;
      chibi.setMode('idle');
      this.scene.add(chibi.root);
      this.guestChibis.push(chibi);
    });

    AGENTS.forEach((agent) => this.makeLabel(agent));
    AGENTS.forEach((agent) => {
      this.bubbles.set(agent.id, {
        idx: 0,
        phase: 'work',
        t: Math.random() * 10,
        dur: 18 + Math.random() * 16,
        reported: -1,
      });
      this.busy.add(agent.id);
    });

    this.bindEvents();
    this.resize();
    this.renderer.setAnimationLoop(() => this.loop());
  }

  private makeLabel(agent: Agent) {
    const el = document.createElement('button');
    el.className = 'tag';
    el.style.setProperty('--accent', agent.accent);
    const first = AGENT_WORK[agent.id]?.[0];
    el.title = `${agent.name} - ${first ? first.task : agent.role}`;
    el.innerHTML = `
      <span class="tag-ic">${iconSvg(ROLE_ICON[agent.id] ?? 'dot', 13)}</span>
      <span class="tag-txt">
        <b>${agent.name}</b>
        <i class="tag-task">${first ? first.task : agent.role}</i>
      </span>
      <span class="tag-dot" style="background:${STATUS_COLOR[agent.status] ?? '#94a3b8'}"></span>
    `;
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      this.opts.onSelect(agent.id);
    });
    this.opts.labelLayer.appendChild(el);
    this.labels.set(agent.id, el);
  }

  private bindEvents() {
    const c = this.opts.canvas;
    c.addEventListener('pointerdown', this.onDown);
    window.addEventListener('pointermove', this.onMove);
    window.addEventListener('pointerup', this.onUp);
    c.addEventListener('wheel', this.onWheel, { passive: false });
    c.addEventListener('contextmenu', this.onContext);
    window.addEventListener('resize', this.resize);
    document.addEventListener('visibilitychange', this.onVisibility);
    if (typeof ResizeObserver !== 'undefined') {
      this.ro = new ResizeObserver(() => this.resize());
      this.ro.observe(c.parentElement ?? c);
    }
  }

  private onContext = (e: Event) => e.preventDefault();

  private onVisibility = () => {
    if (document.hidden) this.renderer.setAnimationLoop(null);
    else if (!this.disposed) this.renderer.setAnimationLoop(() => this.loop());
  };

  private onDown = (e: PointerEvent) => {
    this.dragging = true;
    this.moved = 0;
    this.dragMode = e.button === 2 || e.button === 1 || e.shiftKey ? 'pan' : 'orbit';
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    if (e.button === 2) e.preventDefault();
  };

  private onMove = (e: PointerEvent) => {
    if (!this.dragging) return;
    const dx = e.clientX - this.lastX;
    const dy = e.clientY - this.lastY;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.moved += Math.abs(dx) + Math.abs(dy);

    if (this.dragMode === 'pan') {
      const right = new THREE.Vector3(Math.cos(this.az), 0, -Math.sin(this.az));
      const fwd = new THREE.Vector3(-Math.sin(this.az), 0, -Math.cos(this.az));
      const s = this.dist * 0.0016;
      this.goalTarget.addScaledVector(right, -dx * s).addScaledVector(fwd, dy * s * 1.15);
      this.goalTarget.x = THREE.MathUtils.clamp(this.goalTarget.x, -7, 7);
      this.goalTarget.z = THREE.MathUtils.clamp(this.goalTarget.z, -5, 5);
      this.goalTarget.y = DEFAULT.ty;
    } else {
      this.goalAz -= dx * 0.006;
      this.goalEl = THREE.MathUtils.clamp(this.goalEl - dy * 0.004, 0.16, 1.36);
    }
  };

  private onUp = (e: PointerEvent) => {
    if (!this.dragging) return;
    const wasOrbit = this.dragMode === 'orbit';
    this.dragging = false;
    if (this.moved < 6 && wasOrbit && e.button === 0) this.pick(e);
  };

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    this.goalDist = THREE.MathUtils.clamp(this.goalDist * (1 + e.deltaY * 0.0011), 15, 46);
  };

  private pick(e: PointerEvent) {
    const rect = this.opts.canvas.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const groups = [...this.entries.values()].map((v) => v.chibi.root);
    const hits = this.raycaster.intersectObjects(groups, true);
    if (!hits.length) {
      this.opts.onSelect(null);
      return;
    }
    let node: THREE.Object3D | null = hits[0].object;
    while (node && !node.userData.agentId) node = node.parent;
    const id = node?.userData.agentId as AgentId | undefined;
    this.opts.onSelect(id ?? null);
  }

  resize = () => {
    const parent = this.opts.canvas.parentElement;
    const w = parent?.clientWidth || window.innerWidth;
    const h = parent?.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / Math.max(h, 1);
    this.camera.updateProjectionMatrix();
  };

  setSelected(id: AgentId | null) {
    this.entries.forEach((entry, key) => {
      entry.chibi.setSelected(key === id);
      const label = this.labels.get(key);
      if (label) label.classList.toggle('is-active', key === id);
    });
    if (!id) {
      this.walkers.forEach((w) => {
        w.camera = null;
      });
      return;
    }
    const w = this.walkers.find((v) => v.entry.agent.id === id);
    if (!w) return;
    if (this.busy.has(id)) {
      // Working agents stay at their desk, they only give a quick seated wave.
      w.camera = null;
      this.waves.set(id, 1.6);
      return;
    }
    if (w.camera) {
      // Already at the camera, send them back to their desk.
      w.camera = null;
      w.idx = 0;
      w.walking = true;
      w.entry.chibi.setSeated(false);
      w.entry.chibi.setMode('walk');
      return;
    }
    const cam = this.camera.position;
    const tgt = this.target;
    const dx = cam.x - tgt.x;
    const dz = cam.z - tgt.z;
    const len = Math.hypot(dx, dz) || 1;
    const px = tgt.x + (dx / len) * 2.8;
    const pz = tgt.z + (dz / len) * 2.8;
    w.camera = {
      x: px,
      z: pz,
      y: 0,
      face: Math.atan2(cam.x - px, cam.z - pz),
      act: 'idle',
    };
    w.walking = true;
    w.entry.chibi.setSeated(false);
    w.entry.chibi.setMode('walk');
  }

  focusAgent(id: AgentId) {
    const entry = this.entries.get(id);
    if (!entry) return;
    const p = entry.chibi.root.position;
    this.goalTarget.set(p.x, p.y + 1.1, p.z);
    this.goalDist = 15;
  }

  resetCamera() {
    this.goalTarget.set(DEFAULT.tx, DEFAULT.ty, DEFAULT.tz);
    this.goalDist = DEFAULT.dist;
    this.goalAz = THREE.MathUtils.degToRad(DEFAULT.az);
    this.goalEl = THREE.MathUtils.degToRad(DEFAULT.el);
  }

  setReducedMotion(v: boolean) {
    this.reduced = v;
  }

  private stepWalkers(dt: number) {
    if (dt <= 0) return;
    for (const w of this.walkers) {
      const busy = this.busy.has(w.entry.agent.id);
      const root = w.entry.chibi.root;

      if (w.camera) {
        if (busy) {
          // Work started while visiting the camera: walk home and sit down.
          w.camera = null;
          w.idx = 0;
          w.walking = true;
          w.entry.chibi.setSeated(false);
          w.entry.chibi.setMode('walk');
        } else {
          const stop = w.camera;
          if (!w.walking) {
            const left = (this.waves.get(w.entry.agent.id) ?? 0) - dt;
            if (left <= 0) {
              this.waves.delete(w.entry.agent.id);
              w.entry.chibi.setMode('idle');
              this.opts.onArrived(w.entry.agent.id);
            } else {
              this.waves.set(w.entry.agent.id, left);
              w.entry.chibi.setMode('wave');
            }
            continue;
          }
          const dx = stop.x - root.position.x;
          const dz = stop.z - root.position.z;
          const dist = Math.hypot(dx, dz);
          if (dist < 0.07) {
            root.position.x = stop.x;
            root.position.z = stop.z;
            w.walking = false;
            w.entry.chibi.setSeated(false);
            w.entry.chibi.setMode('wave');
            this.waves.set(w.entry.agent.id, 2.2);
            if (stop.face !== undefined) root.rotation.y = stop.face;
            continue;
          }
          const step = Math.min(w.speed * dt, dist);
          root.position.x += (dx / dist) * step;
          root.position.z += (dz / dist) * step;
          root.position.y += (0 - root.position.y) * Math.min(1, dt * 6);
          const yaw = Math.atan2(dx, dz);
          root.rotation.y += shortestAngle(root.rotation.y, yaw) * Math.min(1, dt * 8);
          continue;
        }
      }

      if (busy) {
        // Working agents stay seated at their desk and type. Only a quick
        // wave is allowed, and they never leave the computer.
        if (w.walking) {
          if (w.idx !== 0) w.idx = 0;
        } else if (w.idx !== 0) {
          w.idx = 0;
          w.walking = true;
          w.entry.chibi.setSeated(false);
          w.entry.chibi.setMode('walk');
          continue;
        } else {
          const left = (this.waves.get(w.entry.agent.id) ?? 0) - dt;
          if (left > 0) {
            this.waves.set(w.entry.agent.id, left);
            w.entry.chibi.setSeated(true);
            w.entry.chibi.setMode('wave');
            continue;
          }
          this.waves.delete(w.entry.agent.id);
          w.entry.chibi.setSeated(true);
          w.entry.chibi.setMode('typing');
          w.timer = 0;
          continue;
        }
      } else if (!w.walking) {
        w.timer -= dt;
        if (w.timer > 0) continue;
        w.idx = (w.idx + 1) % w.path.length;
        w.walking = true;
        w.entry.chibi.setSeated(false);
        w.entry.chibi.setMode('walk');
        continue;
      }

      const stop = w.path[w.idx];
      const dx = stop.x - root.position.x;
      const dz = stop.z - root.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.07) {
        root.position.x = stop.x;
        root.position.z = stop.z;
        w.walking = false;
        const isHome = w.idx === 0;
        if (busy && isHome) {
          w.timer = 0;
          w.entry.chibi.setSeated(true);
          w.entry.chibi.setMode('typing');
        } else if (isHome) {
          w.timer = 24 + Math.random() * 18;
          w.entry.chibi.setSeated(true);
          w.entry.chibi.setMode(w.entry.agent.status === 'blocked' ? 'idle' : 'typing');
        } else {
          w.timer = stop.pause ?? 0;
          w.entry.chibi.setSeated(false);
          w.entry.chibi.setMode((stop.act ?? 'idle') as AnimMode);
        }
        if (stop.face !== undefined) root.rotation.y = stop.face;
        continue;
      }
      const step = Math.min(w.speed * dt, dist);
      root.position.x += (dx / dist) * step;
      root.position.z += (dz / dist) * step;
      const wantY = stop.y ?? 0;
      root.position.y += (wantY - root.position.y) * Math.min(1, dt * 6);
      const yaw = Math.atan2(dx, dz);
      root.rotation.y += shortestAngle(root.rotation.y, yaw) * Math.min(1, dt * 8);
    }
  }

  setLiveMode(on: boolean) {
    const changed = this.liveMode !== on;
    this.liveMode = on;
    // Labels start out holding demo work text. Wipe it once, on the switch to
    // live, so an idle office never shows fabricated tasks. Repeated calls
    // (the heartbeat re-fires this) must not wipe live bubbles, hence `changed`.
    if (on && changed) this.resetAgents();
  }

  setUniform(mode: string) {
    for (const entry of this.entries.values()) {
      const color = mode === 'original' ? entry.agent.outfit : UNIFORMS[mode] || entry.agent.outfit;
      entry.chibi.setOutfit(color);
    }
  }

  setAgentTask(id: AgentId, text: string, done: boolean, output?: string) {
    const label = this.labels.get(id);
    const entry = this.entries.get(id);
    if (!label || !entry) return;
    const taskEl = label.querySelector('.tag-task') as HTMLElement | null;
    const shown = text.length > 90 ? text.slice(0, 87) + '...' : text;
    if (taskEl) taskEl.textContent = shown;
    label.title = entry.agent.name + (done ? ' - done: ' : ' - ') + shown;
    if (done) {
      label.classList.add('is-done');
      this.busy.delete(id);
      if (output) this.popOutput(label, output.slice(0, 60));
    } else {
      label.classList.remove('is-done');
      this.busy.add(id);
    }
  }

  resetAgents() {
    this.busy.clear();
    this.waves.clear();
    this.walkers.forEach((w) => {
      w.camera = null;
    });
    this.entries.forEach((entry, id) => {
      const label = this.labels.get(id);
      if (!label) return;
      const taskEl = label.querySelector('.tag-task') as HTMLElement | null;
      if (taskEl) taskEl.textContent = entry.agent.role;
      label.title = entry.agent.name;
      label.classList.remove('is-done');
      label.querySelectorAll('.tag-out').forEach((n) => n.remove());
    });
  }

  private stepBubbles(dt: number) {
    if (dt <= 0 || this.liveMode) return;
    this.entries.forEach((entry, id) => {
      const b = this.bubbles.get(id);
      const label = this.labels.get(id);
      const work = AGENT_WORK[id];
      if (!b || !label || !work) return;
      const taskEl = label.querySelector('.tag-task') as HTMLElement | null;
      const item = work[b.idx % work.length];
      b.t += dt;

      if (b.phase === 'work') {
        const p = Math.min(100, Math.round((b.t / b.dur) * 100));
        if (p !== b.reported) {
          b.reported = p;
          this.opts.onAgentTask(id, 'work', item.task, p);
        }
        if (b.t >= b.dur) {
          b.phase = 'done';
          this.busy.delete(id);
          b.t = 0;
          label.classList.add('is-done');
          if (taskEl) taskEl.textContent = item.output;
          label.title = `${entry.agent.name} - done: ${item.output}`;
          this.opts.onAgentTask(id, 'done', item.output, 100);
          this.popOutput(label, item.output);
        }
      } else if (b.t >= 7) {
        b.phase = 'work';
        this.busy.add(id);
        b.t = 0;
        b.dur = 16 + Math.random() * 14;
        b.reported = -1;
        b.idx = (b.idx + 1) % work.length;
        label.classList.remove('is-done');
        const next = work[b.idx];
        if (taskEl) taskEl.textContent = next.task;
        label.title = `${entry.agent.name} - ${next.task}`;
        this.opts.onAgentTask(id, 'work', next.task, 0);
      }
    });
  }

  private popOutput(label: HTMLElement, text: string) {
    const chip = document.createElement('span');
    chip.className = 'tag-out';
    chip.textContent = '+ ' + text;
    label.appendChild(chip);
    window.setTimeout(() => chip.remove(), 2200);
  }

  private loop() {
    if (this.disposed) return;
    const now = performance.now();
    const dt = this.lastFrame ? Math.min((now - this.lastFrame) / 1000, 0.05) : 0;
    this.lastFrame = now;
    if (!this.reduced) this.elapsed += dt;
    const t = this.elapsed;

    const k = 1 - Math.pow(0.0015, dt);
    this.target.lerp(this.goalTarget, k);
    this.dist += (this.goalDist - this.dist) * k;
    this.az += (this.goalAz - this.az) * k;
    this.el += (this.goalEl - this.el) * k;

    // An exponential lerp never truly arrives: it keeps moving the camera by
    // ever smaller amounts forever. That sub pixel drift is what makes edges
    // and floating labels shimmer. Snap once the remaining error is smaller
    // than a frame can show, and snap instantly when motion is off.
    if (this.reduced) {
      this.target.copy(this.goalTarget);
      this.dist = this.goalDist;
      this.az = this.goalAz;
      this.el = this.goalEl;
    } else {
      if (this.target.distanceTo(this.goalTarget) < 0.0004) this.target.copy(this.goalTarget);
      if (Math.abs(this.goalDist - this.dist) < 0.0004) this.dist = this.goalDist;
      if (Math.abs(this.goalAz - this.az) < 0.00002) this.az = this.goalAz;
      if (Math.abs(this.goalEl - this.el) < 0.00002) this.el = this.goalEl;
    }

    const cosEl = Math.cos(this.el);
    this.camera.position.set(
      this.target.x + Math.sin(this.az) * cosEl * this.dist,
      this.target.y + Math.sin(this.el) * this.dist,
      this.target.z + Math.cos(this.az) * cosEl * this.dist,
    );
    this.camera.lookAt(this.target);

    this.room.update(t);
    this.stepWalkers(this.reduced ? 0 : dt);
    this.stepBubbles(this.reduced ? 0 : dt);
    this.entries.forEach((entry) => entry.chibi.update(t, this.reduced ? 0 : dt));
    this.guestChibis.forEach((g) => g.update(t, this.reduced ? 0 : dt));

    this.updateLabels();
    this.renderer.render(this.scene, this.camera);

    this.frames++;
    this.fpsClock += dt;
    if (this.fpsClock >= 0.5) {
      this.opts.onFps(Math.round(this.frames / this.fpsClock));
      this.frames = 0;
      this.fpsClock = 0;
    }
  }

  private updateLabels() {
    const rect = this.opts.canvas.getBoundingClientRect();
    this.entries.forEach((entry, id) => {
      const label = this.labels.get(id);
      if (!label) return;
      this.tmp.copy(entry.chibi.root.position);
      this.tmp.y += entry.chibi.labelY;
      this.tmp.project(this.camera);
      // Whole pixels keep the label text crisp and stop it re rasterising at
      // slightly different sub pixel offsets every frame.
      const x = Math.round((this.tmp.x * 0.5 + 0.5) * rect.width);
      const y = Math.round((-this.tmp.y * 0.5 + 0.5) * rect.height);
      const visible = this.tmp.z < 1;
      label.style.transform = `translate(-50%,-100%) translate(${x}px,${y}px)`;
      label.style.opacity = visible ? '1' : '0';
      label.style.pointerEvents = visible ? 'auto' : 'none';
    });
  }

  dispose() {
    this.disposed = true;
    this.renderer.setAnimationLoop(null);
    const c = this.opts.canvas;
    c.removeEventListener('pointerdown', this.onDown);
    window.removeEventListener('pointermove', this.onMove);
    window.removeEventListener('pointerup', this.onUp);
    c.removeEventListener('wheel', this.onWheel);
    c.removeEventListener('contextmenu', this.onContext);
    window.removeEventListener('resize', this.resize);
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.ro?.disconnect();
    this.entries.forEach((e) => e.chibi.dispose());
    this.guestChibis.forEach((g) => g.dispose());
    this.room.dispose();
    this.labels.forEach((el) => el.remove());
    this.renderer.dispose();
  }
}

export { STATIONS };

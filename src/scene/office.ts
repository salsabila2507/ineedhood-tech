import * as THREE from 'three';
import type { AgentId } from '../types';
import type { AnimMode } from './chibi';
import {
  bannerTexture,
  goalsTexture,
  neonSignTexture,
  screenTexture,
  shojiTexture,
  skyTexture,
  tatamiTexture,
  wallTexture,
  whiteboardTexture,
  woodTexture,
  type ScreenKind,
} from './textures';

export interface Station {
  x: number;
  z: number;
  y: number;
  yaw: number;
  screen: ScreenKind;
  seated: boolean;
}

export interface Stop {
  x: number;
  z: number;
  y?: number;
  face?: number;
  pause?: number;
  act?: AnimMode;
}

export const STATIONS: Record<AgentId, Station> = {
  manager: { x: -3.3, z: -3.9, y: 0.22, yaw: 0, screen: 'ui', seated: true },
  researcher: { x: -6.4, z: -0.9, y: 0, yaw: Math.PI / 2, screen: 'text', seated: true },
  developer: { x: -2.0, z: 0.2, y: 0, yaw: 0, screen: 'code', seated: true },
  designer: { x: 1.6, z: -0.1, y: 0, yaw: 0, screen: 'ui', seated: true },
  content: { x: -0.9, z: 2.0, y: 0, yaw: 0, screen: 'text', seated: true },
  analyst: { x: -6.3, z: 2.5, y: 0, yaw: Math.PI / 2, screen: 'chart', seated: true },
  qa: { x: 3.6, z: 1.2, y: 0, yaw: 0, screen: 'code', seated: true },
};

export const PATROLS: Record<AgentId, Stop[]> = {
  manager: [
    { x: -3.3, z: -2.5, y: 0.22 },
    { x: -2.2, z: -1.35 },
    { x: 0.15, z: -1.35 },
    { x: 0.15, z: -0.85 },
    { x: 2.2, z: -0.85 },
    { x: 4.9, z: -0.85 },
    { x: 5.4, z: -1.7, pause: 12, act: 'idle' },
  ],
  researcher: [
    { x: -5.0, z: -0.9 },
    { x: -5.0, z: 1.0 },
    { x: -5.0, z: 3.7 },
    { x: 0.0, z: 3.7 },
    { x: 2.3, z: 4.12, pause: 11, act: 'eat' },
  ],
  developer: [
    { x: 0.15, z: 0.9 },
    { x: 0.15, z: 3.7 },
    { x: 3.9, z: 3.75 },
    { x: 5.75, z: 4.12, pause: 9, act: 'idle' },
  ],
  designer: [
    { x: 0.15, z: 0.9 },
    { x: 0.15, z: 3.7 },
    { x: 5.0, z: 3.75 },
    { x: 6.6, z: 3.35 },
    { x: 7.0, z: 2.95, pause: 13, act: 'gym' },
  ],
  content: [
    { x: -0.45, z: 3.6 },
    { x: 3.35, z: 4.12, pause: 9, act: 'eat' },
  ],
  analyst: [
    { x: -4.9, z: 3.1 },
    { x: -4.9, z: 3.75 },
    { x: 0.15, z: 3.75 },
    { x: 4.4, z: 4.12, pause: 10, act: 'eat' },
  ],
  qa: [
    { x: 4.95, z: 2.4 },
    { x: 6.2, z: 3.05, pause: 14, act: 'gym' },
  ],
};

export const GUESTS = [
  { x: 4.9, z: -1.9, yaw: 0.85, hair: '#3a3346', outfit: '#3b3550', accent: '#7c6fa8' },
  { x: 6.4, z: -2.4, yaw: -0.9, hair: '#2c3a3f', outfit: '#2f4048', accent: '#5f8a94' },
];

const GOALS = ['Build new website', 'Create content', 'Analyze data', 'Deploy bot'];

function mat(color: string, rough = 0.85, emissive?: string, emissiveIntensity = 0.6) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: rough,
    metalness: 0.02,
    emissive: emissive ? new THREE.Color(emissive) : new THREE.Color(0x000000),
    emissiveIntensity: emissive ? emissiveIntensity : 0,
  });
}

const M = {
  woodDark: mat('#4a3220', 0.88),
  woodMid: mat('#6b4a2f', 0.85),
  woodLight: mat('#a8794d', 0.8),
  wall: new THREE.MeshStandardMaterial({ map: wallTexture(), roughness: 0.94 }),
  floor: new THREE.MeshStandardMaterial({ map: woodTexture(), roughness: 0.88 }),
  tatami: new THREE.MeshStandardMaterial({ map: tatamiTexture(), roughness: 0.95 }),
  metal: mat('#2f2b3a', 0.45),
  steel: mat('#b9c0cc', 0.35),
  black: mat('#191622', 0.7),
  glass: new THREE.MeshStandardMaterial({
    color: 0xc4e4ff,
    transparent: true,
    opacity: 0.13,
    roughness: 0.06,
    metalness: 0.1,
    side: THREE.DoubleSide,
  }),
  fabric: mat('#3c3350', 0.95),
  leaf: mat('#3f7a4a', 0.9),
  leafDark: mat('#2f5f3a', 0.9),
  paper: new THREE.MeshStandardMaterial({ map: shojiTexture(), roughness: 0.9 }),
  lamp: mat('#ffe9c0', 0.4, '#ffcf87', 1.4),
  white: mat('#e9edf2', 0.55),
  rubber: mat('#22202b', 0.95),
  teal: mat('#2f8f8a', 0.9),
};

function box(w: number, h: number, d: number, material: THREE.Material, x: number, y: number, z: number) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function cyl(r: number, h: number, material: THREE.Material, x: number, y: number, z: number, seg = 14) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function plane(w: number, h: number, material: THREE.Material, x: number, y: number, z: number) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
  mesh.position.set(x, y, z);
  return mesh;
}

function screenMat(kind: ScreenKind, accent: string) {
  return new THREE.MeshBasicMaterial({ map: screenTexture(kind, accent) });
}

function desk(g: THREE.Group, accent: string, kind: ScreenKind) {
  g.add(box(1.9, 0.08, 0.86, M.woodLight, 0, 0.76, 0.86));
  g.add(box(1.86, 0.16, 0.82, M.woodMid, 0, 0.66, 0.86));
  for (const sx of [-0.84, 0.84]) {
    for (const sz of [0.5, 1.2]) {
      g.add(box(0.09, 0.72, 0.09, M.woodDark, sx, 0.36, sz));
    }
  }
  const mon = new THREE.Group();
  mon.position.set(0, 0.8, 1.02);
  mon.rotation.y = Math.PI;
  mon.add(box(0.3, 0.03, 0.2, M.metal, 0, 0, 0));
  mon.add(box(0.06, 0.3, 0.06, M.metal, 0, 0.15, -0.03));
  mon.add(box(0.7, 0.44, 0.04, M.black, 0, 0.52, 0));
  mon.add(plane(0.65, 0.39, screenMat(kind, accent), 0, 0.52, 0.025));
  g.add(mon);

  g.add(box(0.52, 0.02, 0.17, mat('#2a2733', 0.8), 0, 0.81, 0.62));
  g.add(cyl(0.055, 0.1, M.white, 0.62, 0.85, 0.55, 10));
  g.add(box(0.26, 0.03, 0.34, mat('#d9cbb4', 0.9), -0.62, 0.82, 0.72));

  const chair = new THREE.Group();
  chair.position.set(0, 0, -0.32);
  chair.add(box(0.52, 0.07, 0.5, M.fabric, 0, 0.44, 0));
  chair.add(box(0.52, 0.5, 0.07, M.fabric, 0, 0.68, -0.22));
  chair.add(box(0.07, 0.42, 0.07, M.metal, 0, 0.22, 0));
  chair.add(box(0.42, 0.04, 0.42, M.metal, 0, 0.03, 0));
  g.add(chair);
}

function plant(g: THREE.Group, x: number, z: number, s = 1) {
  const p = new THREE.Group();
  p.position.set(x, 0, z);
  p.scale.setScalar(s);
  p.add(cyl(0.24, 0.34, mat('#b0663f', 0.9), 0, 0.17, 0, 12));
  p.add(cyl(0.045, 0.5, M.woodMid, 0, 0.55, 0, 8));
  const blobs: [number, number, number, number][] = [
    [0, 1.0, 0, 0.36],
    [0.22, 0.85, 0.12, 0.26],
    [-0.2, 0.88, -0.1, 0.24],
  ];
  blobs.forEach(([bx, by, bz, r], i) => {
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), i === 1 ? M.leafDark : M.leaf);
    b.position.set(bx, by, bz);
    b.castShadow = true;
    p.add(b);
  });
  g.add(p);
}

function stool(g: THREE.Group, x: number, z: number) {
  const s = new THREE.Group();
  s.position.set(x, 0, z);
  s.add(cyl(0.19, 0.07, M.woodLight, 0, 0.63, 0, 16));
  s.add(cyl(0.045, 0.6, M.metal, 0, 0.32, 0, 10));
  s.add(cyl(0.22, 0.04, M.metal, 0, 0.03, 0, 16));
  g.add(s);
}

function buildBar(root: THREE.Group) {
  const g = new THREE.Group();
  g.position.set(1.7, 0, 4.8);

  // counter body
  g.add(box(3.3, 0.9, 0.5, M.woodMid, 1.65, 0.45, 0));
  g.add(box(3.42, 0.09, 0.62, M.woodLight, 1.65, 0.94, 0));
  for (let i = 0; i < 6; i++) {
    g.add(box(0.04, 0.86, 0.03, M.woodDark, 0.2 + i * 0.52, 0.45, 0.26));
  }
  // foot rail
  g.add(cyl(0.035, 3.0, M.steel, 1.65, 0.16, 0.34, 8).rotateZ(Math.PI / 2));

  // back bar shelving
  const back = new THREE.Group();
  back.position.set(1.65, 0, 0.42);
  back.add(box(3.1, 2.25, 0.12, M.woodDark, 0, 1.12, 0));
  for (let i = 0; i < 3; i++) {
    back.add(box(3.0, 0.06, 0.34, M.woodMid, 0, 0.92 + i * 0.52, 0.2));
  }
  back.add(box(0.08, 2.2, 0.34, M.woodMid, -1.5, 1.1, 0.2));
  back.add(box(0.08, 2.2, 0.34, M.woodMid, 1.5, 1.1, 0.2));
  // mirror behind shelves
  const mirror = plane(2.7, 1.5, mat('#8fa6b8', 0.12, '#2c3d4a', 0.35), 0, 1.55, 0.07);
  back.add(mirror);
  const bottleColors = ['#7c3aed', '#10b981', '#f59e0b', '#ef4444', '#38bdf8', '#e2e8f0', '#a16207'];
  for (let row = 0; row < 3; row++) {
    let bx = -1.34;
    let i = row * 3;
    while (bx < 1.3) {
      const h = 0.24 + ((i * 7) % 3) * 0.05;
      back.add(cyl(0.048, h, mat(bottleColors[i % bottleColors.length], 0.35), bx, 0.95 + row * 0.52 + h / 2, 0.2, 8));
      back.add(cyl(0.018, 0.07, M.steel, bx, 0.95 + row * 0.52 + h + 0.03, 0.2, 6));
      bx += 0.19;
      i++;
    }
  }
  g.add(back);

  // coffee machine
  const cm = new THREE.Group();
  cm.position.set(2.9, 0.98, -0.02);
  cm.add(box(0.46, 0.5, 0.36, M.black, 0, 0.25, 0));
  cm.add(box(0.4, 0.14, 0.06, mat('#3b3550', 0.5, '#8b5cf6', 0.5), 0, 0.36, 0.19));
  cm.add(box(0.34, 0.05, 0.3, M.steel, 0, 0.06, 0.02));
  cm.add(cyl(0.04, 0.12, M.steel, 0.06, 0.12, 0.16, 8));
  g.add(cm);

  // beer taps
  const taps = new THREE.Group();
  taps.position.set(0.3, 0.98, -0.04);
  taps.add(box(0.5, 0.08, 0.16, M.steel, 0, 0.04, 0));
  for (let i = 0; i < 3; i++) {
    taps.add(cyl(0.028, 0.2, M.steel, -0.15 + i * 0.15, 0.16, 0, 8));
    taps.add(box(0.04, 0.14, 0.04, M.metal, -0.15 + i * 0.15, 0.26, 0.04));
  }
  g.add(taps);

  // glasses
  for (let i = 0; i < 4; i++) {
    g.add(cyl(0.04, 0.11, new THREE.MeshStandardMaterial({ color: 0xdfeaf2, transparent: true, opacity: 0.5, roughness: 0.1 }), 1.05 + i * 0.16, 1.04, -0.12, 8));
  }

  // pendant lamps
  for (let i = 0; i < 3; i++) {
    const px = 0.75 + i * 0.9;
    const cord = cyl(0.008, 1.5, M.black, px, 3.35, 0, 4);
    g.add(cord);
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.19, 0.22, 14, 1, true), M.woodDark);
    shade.position.set(px, 2.52, 0);
    shade.rotation.x = Math.PI;
    g.add(shade);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), M.lamp);
    bulb.position.set(px, 2.44, 0);
    g.add(bulb);
  }

  stool(g, 0.6, -0.68);
  stool(g, 1.65, -0.68);
  stool(g, 2.7, -0.68);

  root.add(g);
}

function buildFridge(root: THREE.Group) {
  const g = new THREE.Group();
  g.position.set(5.78, 0, 4.72);
  g.add(box(0.92, 2.0, 0.72, M.white, 0, 1.0, 0));
  g.add(box(0.96, 0.06, 0.76, M.steel, 0, 2.02, 0));
  g.add(box(0.02, 1.94, 0.74, mat('#c7ccd6', 0.6), 0, 1.0, 0.005));
  // handles
  g.add(box(0.04, 0.62, 0.05, M.steel, -0.09, 1.35, 0.38));
  g.add(box(0.04, 0.62, 0.05, M.steel, 0.09, 1.35, 0.38));
  // freezer line
  g.add(box(0.9, 0.03, 0.02, mat('#b8bec9', 0.7), 0, 1.62, 0.365));
  // notes / magnets
  const notes = ['#fbbf24', '#34d399', '#60a5fa', '#f472b6'];
  notes.forEach((c, i) => {
    g.add(box(0.11, 0.11, 0.01, mat(c, 0.8), -0.28 + i * 0.19, 1.05 + (i % 2) * 0.12, 0.368));
  });
  // glow strip under the door
  g.add(box(0.8, 0.02, 0.02, mat('#bfe9ff', 0.4, '#7fd4ff', 1.2), 0, 0.42, 0.368));
  root.add(g);
}

function buildGym(root: THREE.Group) {
  const g = new THREE.Group();
  // floor mat
  g.add(box(3.1, 0.04, 3.0, M.rubber, 6.65, 0.03, 2.1));
  g.add(box(3.16, 0.03, 3.06, mat('#2f2c3a', 0.95), 6.65, 0.015, 2.1));

  // treadmill
  const tm = new THREE.Group();
  tm.position.set(7.15, 0, 1.15);
  tm.add(box(0.78, 0.14, 1.6, mat('#33303d', 0.8), 0, 0.09, 0));
  tm.add(box(0.62, 0.04, 1.3, mat('#14121b', 0.95), 0, 0.17, 0.05));
  tm.add(box(0.72, 0.1, 0.1, M.steel, 0, 0.16, -0.78));
  for (const sx of [-0.36, 0.36]) {
    tm.add(box(0.06, 0.9, 0.06, M.steel, sx, 0.6, -0.72));
    tm.add(box(0.05, 0.05, 0.5, M.steel, sx, 1.02, -0.5));
  }
  tm.add(box(0.7, 0.32, 0.08, M.black, 0, 1.12, -0.72));
  tm.add(plane(0.6, 0.24, screenMat('chart', '#22d3ee'), 0, 1.12, -0.67));
  g.add(tm);

  // dumbbell rack
  const rack = new THREE.Group();
  rack.position.set(5.55, 0, 1.0);
  rack.add(box(1.1, 0.06, 0.42, M.metal, 0, 0.42, 0));
  rack.add(box(1.1, 0.06, 0.42, M.metal, 0, 0.78, 0.06));
  rack.add(box(0.06, 0.8, 0.42, M.metal, -0.52, 0.4, 0.03));
  rack.add(box(0.06, 0.8, 0.42, M.metal, 0.52, 0.4, 0.03));
  for (let i = 0; i < 4; i++) {
    for (const [tier, y] of [
      [0, 0.5],
      [1, 0.86],
    ] as [number, number][]) {
      const dx = -0.36 + i * 0.24 + tier * 0.03;
      rack.add(cyl(0.028, 0.26, M.steel, dx, y, 0.03, 8).rotateZ(Math.PI / 2));
      rack.add(cyl(0.075, 0.09, M.black, dx - 0.15, y, 0.03, 10).rotateZ(Math.PI / 2));
      rack.add(cyl(0.075, 0.09, M.black, dx + 0.15, y, 0.03, 10).rotateZ(Math.PI / 2));
    }
  }
  g.add(rack);

  // bench
  const bench = new THREE.Group();
  bench.position.set(6.15, 0, 2.35);
  bench.add(box(1.2, 0.1, 0.42, mat('#3a2f45', 0.9), 0, 0.44, 0));
  bench.add(box(0.1, 0.44, 0.1, M.metal, -0.48, 0.22, 0));
  bench.add(box(0.1, 0.44, 0.1, M.metal, 0.48, 0.22, 0));
  g.add(bench);

  // yoga mat
  g.add(box(1.25, 0.025, 0.6, M.teal, 6.2, 0.06, 3.05));

  // punching bag
  const bag = new THREE.Group();
  bag.position.set(7.9, 0, 2.55);
  bag.add(box(0.1, 0.06, 0.1, M.metal, 0, 2.75, 0));
  bag.add(cyl(0.02, 0.6, M.steel, 0, 2.45, 0, 6));
  bag.add(cyl(0.16, 0.95, mat('#4a2a2f', 0.85), 0, 1.72, 0, 14));
  bag.add(cyl(0.17, 0.08, mat('#2b1a1e', 0.9), 0, 2.22, 0, 14));
  g.add(bag);

  // mirror panel
  const mirror = new THREE.Group();
  mirror.position.set(8.05, 0, 1.9);
  mirror.add(box(0.06, 1.9, 1.3, mat('#bcd6e8', 0.12, '#31465a', 0.4), 0, 1.15, 0));
  mirror.add(box(0.1, 0.08, 1.4, M.metal, 0, 2.14, 0));
  mirror.add(box(0.1, 0.08, 1.4, M.metal, 0, 0.22, 0));
  g.add(mirror);

  // water cooler
  const wc = new THREE.Group();
  wc.position.set(5.35, 0, 3.5);
  wc.add(box(0.36, 0.95, 0.36, M.white, 0, 0.48, 0));
  wc.add(cyl(0.15, 0.42, new THREE.MeshStandardMaterial({ color: 0x7fd4ff, transparent: true, opacity: 0.55, roughness: 0.15 }), 0, 1.18, 0, 12));
  wc.add(box(0.1, 0.08, 0.06, M.steel, 0, 0.75, 0.19));
  g.add(wc);

  root.add(g);
}

function lantern(g: THREE.Group, x: number, y: number, z: number) {
  const l = new THREE.Group();
  l.position.set(x, y, z);
  l.add(cyl(0.012, 1.6, M.black, 0, 1.0, 0, 6));
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.36, 14), M.lamp);
  l.add(body);
  const capTop = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.04, 14), M.woodDark);
  capTop.position.y = 0.2;
  const capBot = capTop.clone();
  capBot.position.y = -0.2;
  l.add(capTop, capBot);
  const light = new THREE.PointLight(0xffcf8a, 9, 7, 2);
  l.add(light);
  g.add(l);
  return l;
}

export interface RoomBuild {
  root: THREE.Group;
  update: (t: number) => void;
  dispose: () => void;
}

export function buildRoom(): RoomBuild {
  const root = new THREE.Group();
  const lanterns: THREE.Group[] = [];

  // ---------- floor ----------
  root.add(box(16.6, 0.5, 10.6, M.floor, 0, -0.25, 0));
  root.add(box(16.9, 0.14, 10.9, M.woodDark, 0, -0.02, 0));
  root.add(box(8.6, 0.22, 3.5, M.tatami, -3.6, 0.11, -3.35));
  root.add(box(8.7, 0.08, 3.6, M.woodDark, -3.6, 0.02, -3.35));

  // ---------- walls ----------
  root.add(box(11.0, 6.4, 0.3, M.wall, -2.8, 3.2, -5.2));
  root.add(box(0.3, 6.4, 10.6, M.wall, -8.2, 3.2, 0));
  root.add(box(11.0, 0.9, 0.36, M.woodMid, -2.8, 0.45, -5.18));
  root.add(box(0.36, 0.9, 10.6, M.woodMid, -8.18, 0.45, 0));

  const beam = (w: number, h: number, d: number, x: number, y: number, z: number) =>
    root.add(box(w, h, d, M.woodDark, x, y, z));
  beam(11.1, 0.24, 0.34, -2.8, 3.1, -5.18);
  beam(11.1, 0.3, 0.36, -2.8, 6.25, -5.18);
  beam(0.34, 0.24, 10.7, -8.18, 3.1, 0);
  beam(0.36, 0.3, 10.7, -8.18, 6.25, 0);
  for (const px of [-8.15, -3.0, 2.6]) beam(0.24, 6.4, 0.24, px, 3.2, -5.16);
  for (const pz of [-5.15, 0, 5.15]) beam(0.24, 6.4, 0.24, -8.16, 3.2, pz);
  for (const bz of [-3.2, 0, 3.2]) beam(16.4, 0.22, 0.24, 0, 6.3, bz);

  for (let i = 0; i < 3; i++) {
    const px = -0.9 + i * 1.25;
    root.add(plane(1.2, 2.5, M.paper, px, 3.35, -5.03));
    beam(1.28, 0.08, 0.1, px, 2.08, -5.02);
    beam(1.28, 0.08, 0.1, px, 4.62, -5.02);
    beam(0.08, 2.6, 0.1, px + 0.62, 3.35, -5.02);
  }

  root.add(box(2.34, 1.56, 0.08, M.black, -3.4, 3.5, -5.02));
  root.add(plane(2.2, 1.42, new THREE.MeshBasicMaterial({ map: goalsTexture(GOALS) }), -3.4, 3.5, -4.96));

  const banner = plane(1.5, 3.8, new THREE.MeshStandardMaterial({ map: bannerTexture(), roughness: 0.85 }), -8.02, 3.4, -2.5);
  banner.rotation.y = Math.PI / 2;
  root.add(banner);
  const bPole = cyl(0.04, 1.6, M.woodDark, -7.98, 5.34, -2.5, 8);
  bPole.rotation.x = Math.PI / 2;
  root.add(bPole);

  // wall clock above the shoji
  root.add(cyl(0.26, 0.05, M.woodDark, 1.85, 5.1, -5.0, 20).rotateX(Math.PI / 2));
  root.add(cyl(0.22, 0.02, M.white, 1.85, 5.1, -4.96, 20).rotateX(Math.PI / 2));

  // ---------- ineedhood tech neon sign ----------
  // Sits in the clear band between the top of the shoji (4.6) and the ceiling
  // beam (6.1), so the sign never covers a window.
  const neonGeom = plane(6.6, 1.30, new THREE.MeshBasicMaterial({
    map: neonSignTexture('ineedhood tech'),
    transparent: true,
    depthWrite: false,
  }), -2.8, 5.44, -5.0);
  root.add(neonGeom);
  const neonMount = box(6.9, 1.40, 0.06, M.black, -2.8, 5.44, -5.06);
  root.add(neonMount);
  const neonLight = new THREE.PointLight(0xff4fd8, 7, 9, 2);
  neonLight.position.set(-2.8, 5.18, -4.5);
  root.add(neonLight);
  const neonGlowLight = new THREE.PointLight(0x22d3ee, 3, 7, 2);
  neonGlowLight.position.set(-2.8, 5.18, -4.2);
  root.add(neonGlowLight);

  // ---------- veranda / outside ----------
  root.add(box(5.6, 0.3, 2.4, M.floor, 5.5, 0.02, -6.4));
  const railZ = -7.45;
  root.add(box(5.6, 0.09, 0.12, M.woodMid, 5.5, 1.0, railZ));
  root.add(box(5.6, 0.07, 0.1, M.woodMid, 5.5, 0.5, railZ));
  for (let i = 0; i <= 5; i++) root.add(box(0.12, 1.0, 0.12, M.woodMid, 2.9 + i * 1.05, 0.5, railZ));
  for (const px of [2.75, 8.25]) root.add(box(0.2, 6.4, 0.2, M.woodDark, px, 3.2, -7.4));
  root.add(box(5.7, 0.24, 0.26, M.woodDark, 5.5, 6.3, -7.4));

  root.add(plane(160, 70, new THREE.MeshBasicMaterial({ map: skyTexture(), side: THREE.DoubleSide }), 6, 12, -34));

  const mountMat = mat('#6d8db3', 1);
  const mountMat2 = mat('#54759b', 1);
  const mounts: [number, number, number, number, THREE.Material][] = [
    [10, -27, 9, 11, mountMat2],
    [20, -30, 12, 14, mountMat],
    [31, -26, 8, 9, mountMat2],
    [-2, -30, 10, 8, mountMat],
  ];
  mounts.forEach(([mx, mz, r, h, mm]) => {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(r, h, 5), mm);
    cone.position.set(mx, h / 2 - 1, mz);
    cone.rotation.y = Math.PI / 5;
    root.add(cone);
  });

  const tree = (tx: number, tz: number, s: number) => {
    const t = new THREE.Group();
    t.position.set(tx, -1.2, tz);
    t.scale.setScalar(s);
    t.add(cyl(0.12, 1.6, M.woodDark, 0, 0.8, 0, 8));
    for (let i = 0; i < 3; i++) {
      const c = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9 - i * 0.16, 1), i % 2 ? M.leafDark : M.leaf);
      c.position.set(0, 1.9 + i * 0.55, 0);
      t.add(c);
    }
    root.add(t);
  };
  tree(7.6, -9.4, 1.5);
  tree(10.4, -10.6, 1.9);
  tree(13.2, -9.0, 1.3);

  // ---------- workstations ----------
  (Object.keys(STATIONS) as AgentId[]).forEach((id) => {
    const st = STATIONS[id];
    const g = new THREE.Group();
    g.position.set(st.x, st.y, st.z);
    g.rotation.y = st.yaw;
    desk(g, '#8b5cf6', st.screen);
    root.add(g);
  });

  // ---------- meeting room ----------
  const mr = new THREE.Group();
  mr.position.set(5.4, 0, -2.7);
  const W = 4.4;
  const D = 3.2;
  const H = 2.75;
  mr.add(box(0.05, H, D, M.glass, -W / 2, H / 2, 0));
  mr.add(box(W, H, 0.05, M.glass, 0, H / 2, -D / 2));
  mr.add(box(0.05, H, D, M.glass, W / 2, H / 2, 0));
  for (const [w, h, d, x, y, z] of [
    [0.1, 0.1, D, -W / 2, H, 0],
    [0.1, 0.1, D, W / 2, H, 0],
    [W, 0.1, 0.1, 0, H, -D / 2],
    [0.1, 0.1, 0.1, -W / 2, H, -D / 2],
    [0.1, 0.1, 0.1, W / 2, H, -D / 2],
    [0.1, H, 0.1, -W / 2, H / 2, -D / 2],
    [0.1, H, 0.1, W / 2, H / 2, -D / 2],
  ] as [number, number, number, number, number, number][]) {
    mr.add(box(w, h, d, M.metal, x, y, z));
  }
  mr.add(box(2.1, 0.09, 1.0, mat('#e6dccb', 0.7), 0, 0.74, 0.1));
  mr.add(box(0.14, 0.7, 0.14, M.metal, -0.85, 0.35, 0.1));
  mr.add(box(0.14, 0.7, 0.14, M.metal, 0.85, 0.35, 0.1));
  mr.add(box(1.0, 0.03, 0.55, mat('#f2efe9', 0.85), 0, 0.79, 0.1));
  for (const [cx, cz, ry] of [
    [-1.0, 0.95, 0],
    [0, 0.95, 0],
    [1.0, 0.95, 0],
    [0, -0.75, Math.PI],
  ] as [number, number, number][]) {
    const c = new THREE.Group();
    c.position.set(cx, 0, cz);
    c.rotation.y = ry;
    c.add(box(0.44, 0.06, 0.44, M.fabric, 0, 0.42, 0));
    c.add(box(0.44, 0.42, 0.06, M.fabric, 0, 0.63, -0.19));
    c.add(box(0.06, 0.4, 0.06, M.metal, 0, 0.2, 0));
    mr.add(c);
  }
  const wb = new THREE.Group();
  wb.position.set(-W / 2 + 0.12, 0, 0.55);
  wb.rotation.y = Math.PI / 2;
  wb.add(box(1.75, 1.1, 0.06, mat('#f7f4ee', 0.6), 0, 1.55, 0));
  wb.add(plane(1.66, 1.02, new THREE.MeshBasicMaterial({ map: whiteboardTexture() }), 0, 1.55, 0.04));
  wb.add(box(0.07, 1.0, 0.07, M.metal, -0.6, 0.5, -0.1));
  wb.add(box(0.07, 1.0, 0.07, M.metal, 0.6, 0.5, -0.1));
  mr.add(wb);
  root.add(mr);

  root.add(box(3.2, 0.02, 2.0, mat('#5b4a7a', 0.98), 5.4, 0.03, -2.7));

  // ---------- pantry / bar / gym ----------
  buildBar(root);
  buildFridge(root);
  buildGym(root);

  // ---------- decor ----------
  const shelf = new THREE.Group();
  shelf.position.set(-7.6, 0, -1.2);
  shelf.rotation.y = Math.PI / 2;
  shelf.add(box(2.2, 2.4, 0.12, M.woodMid, 0, 1.2, -0.22));
  for (let i = 0; i < 4; i++) shelf.add(box(2.2, 0.08, 0.44, M.woodMid, 0, 0.25 + i * 0.62, 0));
  shelf.add(box(0.1, 2.4, 0.44, M.woodMid, -1.05, 1.2, 0));
  shelf.add(box(0.1, 2.4, 0.44, M.woodMid, 1.05, 1.2, 0));
  const bookColors = ['#8b5cf6', '#f59e0b', '#34d399', '#60a5fa', '#f472b6', '#e2e8f0', '#fb923c'];
  let bi = 0;
  for (let row = 0; row < 4; row++) {
    let bx = -0.95;
    while (bx < 0.92) {
      const w = 0.07 + ((bi * 37) % 5) * 0.012;
      const h = 0.3 + ((bi * 53) % 4) * 0.03;
      const b = box(w, h, 0.3, mat(bookColors[bi % bookColors.length], 0.85), bx, 0.3 + row * 0.62 + h / 2, 0);
      b.rotation.z = ((bi * 17) % 7) * 0.004;
      shelf.add(b);
      bx += w + 0.025;
      bi++;
    }
  }
  root.add(shelf);

  plant(root, -7.4, 1.9, 1.15);
  plant(root, 7.4, 4.35, 1.05);
  plant(root, 2.2, -4.5, 0.95);
  plant(root, -4.9, 4.5, 0.9);

  lanterns.push(lantern(root, -4.6, 4.1, -1.4), lantern(root, 1.2, 4.2, 2.2));

  const podium = new THREE.Group();
  podium.position.set(-6.0, 0, 4.35);
  podium.add(box(1.0, 0.9, 0.55, M.woodMid, 0, 0.45, 0));
  podium.add(box(0.9, 0.06, 0.5, M.black, 0, 0.92, 0));
  const podScreen = plane(0.8, 0.42, new THREE.MeshBasicMaterial({ map: screenTexture('ui', '#a78bfa') }), 0, 1.12, 0.02);
  podScreen.rotation.x = -0.42;
  podium.add(podScreen);
  podium.add(box(0.9, 0.5, 0.06, M.black, 0, 1.05, -0.1));
  root.add(podium);

  const crateMat = mat('#8a6a45', 0.9);
  root.add(box(0.6, 0.6, 0.6, crateMat, 2.9, 0.3, -4.3));
  root.add(box(0.5, 0.5, 0.5, crateMat, 3.5, 0.25, -4.45));

  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
  });

  return {
    root,
    update(t: number) {
      lanterns.forEach((l, i) => {
        l.rotation.z = Math.sin(t * 0.6 + i) * 0.035;
        l.rotation.x = Math.cos(t * 0.5 + i) * 0.02;
      });
      const flick = 0.9
        + Math.sin(t * 7.3) * 0.05
        + Math.sin(t * 2.9 + 1.4) * 0.04
        + (Math.sin(t * 0.7) > 0.985 ? -0.22 : 0);
      neonGeom.material.opacity = Math.max(0.5, Math.min(1, flick));
      neonLight.intensity = 5 + flick * 4;
      neonGlowLight.intensity = 2 + flick * 2.4;
    },
    dispose() {
      root.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.isMesh) {
          mesh.geometry.dispose();
          const mm = mesh.material as THREE.Material | THREE.Material[];
          if (Array.isArray(mm)) mm.forEach((x) => x.dispose());
          else mm.dispose();
        }
      });
    },
  };
}

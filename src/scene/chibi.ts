import * as THREE from 'three';

export type AnimMode = 'typing' | 'idle' | 'searching' | 'walk' | 'eat' | 'gym' | 'wave';

export interface ChibiOptions {
  hair: string;
  outfit: string;
  accent: string;
  seated?: boolean;
}

export interface Chibi {
  root: THREE.Group;
  labelY: number;
  setMode: (m: AnimMode) => void;
  setOutfit: (color: string) => void;
  setSeated: (v: boolean) => void;
  setSelected: (v: boolean) => void;
  update: (t: number, dt: number) => void;
  dispose: () => void;
}

const G = {
  head: new THREE.SphereGeometry(0.36, 22, 16),
  hair: new THREE.SphereGeometry(0.378, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.6),
  band: new THREE.CylinderGeometry(0.383, 0.383, 0.09, 22, 1, true),
  torso: new THREE.CapsuleGeometry(0.24, 0.18, 6, 16),
  leg: new THREE.CapsuleGeometry(0.085, 0.24, 4, 10),
  arm: new THREE.CapsuleGeometry(0.072, 0.2, 4, 10),
  hand: new THREE.SphereGeometry(0.082, 10, 8),
  eye: new THREE.SphereGeometry(0.052, 10, 8),
  shoe: new THREE.BoxGeometry(0.15, 0.1, 0.22),
  neck: new THREE.CylinderGeometry(0.1, 0.11, 0.1, 12),
  scarf: new THREE.TorusGeometry(0.185, 0.05, 8, 18),
  sheath: new THREE.BoxGeometry(0.06, 0.62, 0.075),
  mug: new THREE.CylinderGeometry(0.055, 0.05, 0.11, 10),
  ring: new THREE.RingGeometry(0.46, 0.58, 36),
};

function m(color: string, rough = 0.82, emissive?: string) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: rough,
    metalness: 0.03,
    emissive: emissive ? new THREE.Color(emissive) : new THREE.Color(0x000000),
    emissiveIntensity: emissive ? 0.45 : 0,
  });
}

const SEAT_Y = -0.16;
const SEAT_LEG = -1.45;

export function createChibi(opts: ChibiOptions): Chibi {
  const { hair, outfit, accent } = opts;
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const skinMat = m('#f3c9a4', 0.75);
  const outfitMat = m(outfit, 0.8);
  const hairMat = m(hair, 0.7);
  const accentMat = m(accent, 0.55, accent);
  const darkMat = m('#262133', 0.85);
  const shoeMat = m('#1e1b2a', 0.9);

  const legPivotL = new THREE.Group();
  const legPivotR = new THREE.Group();
  legPivotL.position.set(-0.13, 0.52, 0);
  legPivotR.position.set(0.13, 0.52, 0);
  for (const p of [legPivotL, legPivotR]) {
    const leg = new THREE.Mesh(G.leg, darkMat);
    leg.position.set(0, -0.22, 0);
    const shoe = new THREE.Mesh(G.shoe, shoeMat);
    shoe.position.set(0, -0.45, 0.03);
    p.add(leg, shoe);
    body.add(p);
  }

  const torso = new THREE.Mesh(G.torso, outfitMat);
  torso.position.set(0, 0.84, 0);
  body.add(torso);

  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.07, 0.44), accentMat);
  belt.position.set(0, 0.68, 0);
  body.add(belt);

  const neck = new THREE.Mesh(G.neck, skinMat);
  neck.position.set(0, 1.16, 0);
  body.add(neck);

  const scarf = new THREE.Mesh(G.scarf, accentMat);
  scarf.position.set(0, 1.14, 0);
  scarf.rotation.x = Math.PI / 2;
  body.add(scarf);

  const armL = new THREE.Group();
  const armR = new THREE.Group();
  armL.position.set(-0.27, 1.03, 0);
  armR.position.set(0.27, 1.03, 0);
  for (const [g, sx] of [
    [armL, -1],
    [armR, 1],
  ] as [THREE.Group, number][]) {
    const upper = new THREE.Mesh(G.arm, outfitMat);
    upper.position.set(0, -0.16, 0);
    const hand = new THREE.Mesh(G.hand, skinMat);
    hand.position.set(0, -0.35, 0);
    g.add(upper, hand);
    g.rotation.z = sx * 0.12;
    body.add(g);
  }

  const mug = new THREE.Mesh(G.mug, m('#f4f1ea', 0.6));
  mug.position.set(0, -0.42, 0.02);
  mug.visible = false;
  armR.add(mug);

  const head = new THREE.Group();
  head.position.set(0, 1.52, 0);
  body.add(head);

  head.add(new THREE.Mesh(G.head, skinMat));
  head.add(new THREE.Mesh(G.hair, hairMat));

  const tuft = new THREE.ConeGeometry(0.09, 0.22, 6);
  for (let i = 0; i < 3; i++) {
    const t = new THREE.Mesh(tuft, hairMat);
    t.position.set((i - 1) * 0.16, 0.34, -0.16);
    t.rotation.set(-0.5, 0, (i - 1) * 0.35);
    head.add(t);
  }

  const band = new THREE.Mesh(G.band, accentMat);
  band.position.set(0, 0.09, 0);
  head.add(band);

  const eyeL = new THREE.Mesh(G.eye, darkMat);
  const eyeR = new THREE.Mesh(G.eye, darkMat);
  eyeL.position.set(-0.125, -0.05, 0.325);
  eyeR.position.set(0.125, -0.05, 0.325);
  head.add(eyeL, eyeR);

  const browGeo = new THREE.BoxGeometry(0.1, 0.022, 0.03);
  const browL = new THREE.Mesh(browGeo, hairMat);
  const browR = new THREE.Mesh(browGeo, hairMat);
  browL.position.set(-0.125, 0.045, 0.33);
  browR.position.set(0.125, 0.045, 0.33);
  head.add(browL, browR);

  const sheath = new THREE.Mesh(G.sheath, m('#2a2636', 0.7));
  sheath.position.set(0.1, 0.95, -0.26);
  sheath.rotation.set(0.18, 0, -0.55);
  body.add(sheath);
  const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.2, 8), accentMat);
  hilt.position.set(0.32, 1.2, -0.3);
  hilt.rotation.set(0.18, 0, -0.55);
  body.add(hilt);

  const ring = new THREE.Mesh(
    G.ring,
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(accent),
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.03;
  ring.visible = false;
  root.add(ring);

  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh && mesh !== ring) {
      mesh.castShadow = true;
      mesh.receiveShadow = false;
    }
  });

  let mode: AnimMode = 'idle';
  let seated = !!opts.seated;
  let walkPhase = 0;

  const applySeated = () => {
    legPivotL.rotation.x = seated ? SEAT_LEG : 0;
    legPivotR.rotation.x = seated ? SEAT_LEG : 0;
  };
  applySeated();

  return {
    root,
    labelY: 2.28,
    setMode(next) {
      if (next === mode) return;
      if (mode === 'walk' && next !== 'walk') {
        legPivotL.rotation.x = 0;
        legPivotR.rotation.x = 0;
      }
      if (mode === 'wave' && next !== 'wave') {
        armR.rotation.z = 0.12;
        armL.rotation.z = -0.12;
      }
      mode = next;
      mug.visible = next === 'eat';
    },
    setOutfit(color) {
      outfitMat.color.set(color);
    },
    setSeated(v) {
      seated = v;
      applySeated();
    },
    setSelected(v) {
      ring.visible = v;
    },
    update(t, dt) {
      const baseY = seated ? SEAT_Y : 0;
      if (mode === 'walk') {
        walkPhase += dt * 8.4;
        const s = Math.sin(walkPhase);
        legPivotL.rotation.x = s * 0.62;
        legPivotR.rotation.x = -s * 0.62;
        armL.rotation.x = -s * 0.55;
        armR.rotation.x = s * 0.55;
        body.position.y = baseY + Math.abs(Math.cos(walkPhase)) * 0.035;
        head.rotation.z = Math.sin(walkPhase) * 0.03;
        head.rotation.y *= 0.9;
        if (ring.visible) ring.scale.setScalar(1 + Math.sin(t * 3) * 0.06);
        return;
      }
      if (mode === 'eat') {
        body.position.y = baseY + Math.sin(t * 2) * 0.012;
        armR.rotation.x = -2.15 + Math.sin(t * 3.2) * 0.16;
        armL.rotation.x = -0.35 + Math.sin(t * 1.6) * 0.05;
        head.rotation.x = 0.12 + Math.sin(t * 3.2) * 0.05;
        head.rotation.y = Math.sin(t * 0.6) * 0.1;
      } else if (mode === 'gym') {
        body.position.y = baseY + Math.abs(Math.sin(t * 4)) * 0.045;
        armL.rotation.x = -1.5 + Math.sin(t * 4) * 0.85;
        armR.rotation.x = -1.5 - Math.sin(t * 4) * 0.85;
        head.rotation.x = Math.sin(t * 4) * 0.06;
        head.rotation.y = 0;
      } else if (mode === 'typing') {
        body.position.y = baseY + Math.sin(t * 2.6) * 0.012;
        armL.rotation.x = -1.02 + Math.sin(t * 7.4) * 0.17;
        armR.rotation.x = -1.02 + Math.sin(t * 7.4 + 1.1) * 0.17;
        head.rotation.z = Math.sin(t * 1.3) * 0.025;
        head.rotation.y = Math.sin(t * 0.7) * 0.06;
        head.rotation.x = 0;
      } else if (mode === 'searching') {
        body.position.y = baseY + Math.sin(t * 1.7) * 0.018;
        head.rotation.y = Math.sin(t * 0.9) * 0.32;
        head.rotation.z = Math.sin(t * 1.1) * 0.04;
        armL.rotation.x = -0.45 + Math.sin(t * 2.2) * 0.08;
        armR.rotation.x = -0.2 + Math.sin(t * 1.6) * 0.06;
      } else if (mode === 'wave') {
        body.position.y = baseY + Math.abs(Math.sin(t * 5)) * 0.022;
        armR.rotation.x = -2.45;
        armR.rotation.z = -0.3 + Math.sin(t * 9) * 0.5;
        armL.rotation.x = Math.sin(t * 1.4) * 0.05;
        armL.rotation.z = -0.12;
        head.rotation.x = 0;
        head.rotation.y = 0;
        head.rotation.z = Math.sin(t * 9) * 0.045;
      } else {
        body.position.y = baseY + Math.sin(t * 1.5) * 0.02;
        head.rotation.y = Math.sin(t * 0.55) * 0.14;
        head.rotation.z = Math.sin(t * 1.2) * 0.03;
        armL.rotation.x = Math.sin(t * 1.4) * 0.06;
        armR.rotation.x = Math.sin(t * 1.4 + 0.8) * 0.06;
      }
      if (ring.visible) {
        const s = 1 + Math.sin(t * 3) * 0.06;
        ring.scale.set(s, s, s);
        (ring.material as THREE.MeshBasicMaterial).opacity = 0.5 + Math.sin(t * 3) * 0.22;
      }
    },
    dispose() {
      root.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.isMesh) {
          const mat = mesh.material as THREE.Material | THREE.Material[];
          if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
          else mat.dispose();
        }
      });
    },
  };
}

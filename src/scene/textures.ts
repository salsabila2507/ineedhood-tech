import * as THREE from 'three';

/** Deterministic pseudo-random so textures look the same on every load. */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function surface(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('2d canvas unavailable');
  return { c, ctx };
}

function toTexture(c: HTMLCanvasElement, repeat?: [number, number]) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 16;
  if (repeat) {
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  return t;
}

let wood: THREE.Texture | null = null;
export function woodTexture() {
  if (wood) return wood;
  const { c, ctx } = surface(1024, 1024);
  ctx.fillStyle = '#7a5636';
  ctx.fillRect(0, 0, 1024, 1024);
  const r = rng(7);
  const plank = 1024 / 8;
  for (let i = 0; i < 8; i++) {
    const y = i * plank;
    const tone = 0.86 + r() * 0.28;
    ctx.fillStyle = `rgb(${Math.round(122 * tone)},${Math.round(86 * tone)},${Math.round(54 * tone)})`;
    ctx.fillRect(0, y, 1024, plank - 3);
    // grain
    for (let g = 0; g < 26; g++) {
      const gy = y + 4 + r() * (plank - 10);
      ctx.strokeStyle = `rgba(60,38,20,${0.05 + r() * 0.1})`;
      ctx.lineWidth = 1 + r() * 1.4;
      ctx.beginPath();
      ctx.moveTo(0, gy);
      for (let x = 0; x <= 1024; x += 64) {
        ctx.lineTo(x, gy + Math.sin((x + i * 90) / 120) * 2.2);
      }
      ctx.stroke();
    }
    // seam
    ctx.fillStyle = 'rgba(40,24,12,0.55)';
    ctx.fillRect(0, y + plank - 3, 1024, 3);
  }
  wood = toTexture(c, [3, 2]);
  return wood;
}

let tatami: THREE.Texture | null = null;
export function tatamiTexture() {
  if (tatami) return tatami;
  const { c, ctx } = surface(512, 512);
  ctx.fillStyle = '#c8b58c';
  ctx.fillRect(0, 0, 512, 512);
  const r = rng(21);
  for (let i = 0; i < 512; i += 4) {
    ctx.fillStyle = `rgba(150,128,88,${0.05 + r() * 0.12})`;
    ctx.fillRect(0, i, 512, 1.6);
  }
  ctx.strokeStyle = 'rgba(96,78,48,0.5)';
  ctx.lineWidth = 6;
  ctx.strokeRect(0, 0, 512, 512);
  tatami = toTexture(c, [1, 1]);
  return tatami;
}

let wallTex: THREE.Texture | null = null;
export function wallTexture() {
  if (wallTex) return wallTex;
  const { c, ctx } = surface(512, 512);
  ctx.fillStyle = '#cdb795';
  ctx.fillRect(0, 0, 512, 512);
  const r = rng(33);
  for (let i = 0; i < 2600; i++) {
    ctx.fillStyle = `rgba(${r() > 0.5 ? 255 : 120},${r() > 0.5 ? 245 : 100},${200},${r() * 0.05})`;
    ctx.fillRect(r() * 512, r() * 512, 2, 2);
  }
  wallTex = toTexture(c, [3, 1.5]);
  return wallTex;
}

let shoji: THREE.Texture | null = null;
export function shojiTexture() {
  if (shoji) return shoji;
  const { c, ctx } = surface(256, 384);
  ctx.fillStyle = '#f4ead6';
  ctx.fillRect(0, 0, 256, 384);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillRect(6, 6, 244, 372);
  ctx.strokeStyle = '#5b4128';
  ctx.lineWidth = 7;
  for (let i = 1; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo((256 / 4) * i, 0);
    ctx.lineTo((256 / 4) * i, 384);
    ctx.stroke();
  }
  for (let i = 1; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo(0, (384 / 6) * i);
    ctx.lineTo(256, (384 / 6) * i);
    ctx.stroke();
  }
  ctx.strokeRect(3, 3, 250, 378);
  shoji = toTexture(c);
  return shoji;
}

export function bannerTexture() {
  const { c, ctx } = surface(256, 640);
  const g = ctx.createLinearGradient(0, 0, 256, 640);
  g.addColorStop(0, '#7c53e8');
  g.addColorStop(0.5, '#5c34c9');
  g.addColorStop(1, '#3d1f96');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 640);
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 2;
  ctx.strokeRect(14, 14, 228, 612);

  const chars = ['継', '続', 'は', '力', 'な', 'り'];
  ctx.fillStyle = 'rgba(255,255,255,0.96)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '600 52px "Yu Gothic", "Hiragino Sans", "Noto Sans JP", system-ui, sans-serif';
  chars.forEach((ch, i) => ctx.fillText(ch, 128, 82 + i * 74));

  ctx.font = '600 15px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.62)';
  ctx.fillText('0 X Y A S   O F F I C E', 128, 600);
  return toTexture(c);
}

export function goalsTexture(goals: string[]) {
  const { c, ctx } = surface(640, 420);
  ctx.fillStyle = '#141120';
  ctx.fillRect(0, 0, 640, 420);
  const g = ctx.createLinearGradient(0, 0, 640, 420);
  g.addColorStop(0, 'rgba(124,83,232,0.28)');
  g.addColorStop(1, 'rgba(20,17,32,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 640, 420);

  ctx.fillStyle = '#ffffff';
  ctx.font = '600 30px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText("Today's Goals", 40, 66);
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = '500 17px system-ui, sans-serif';
  ctx.fillText('auto-updated from task queue', 40, 96);

  goals.slice(0, 4).forEach((goal, i) => {
    const y = 150 + i * 66;
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.beginPath();
    ctx.roundRect(34, y - 30, 572, 54, 12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(52,211,153,0.85)';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(66, y - 3, 13, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(60, y - 3);
    ctx.lineTo(64.5, y + 2);
    ctx.lineTo(72.5, y - 8);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    ctx.font = '500 22px system-ui, sans-serif';
    ctx.fillText(goal, 96, y + 5);
  });
  return toTexture(c);
}

export function whiteboardTexture() {
  const { c, ctx } = surface(640, 400);
  ctx.fillStyle = '#f7f4ee';
  ctx.fillRect(0, 0, 640, 400);
  ctx.strokeStyle = '#d8d2c6';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, 636, 396);

  ctx.fillStyle = '#241f33';
  ctx.font = '700 34px "Comic Sans MS", "Segoe Print", system-ui, sans-serif';
  ctx.fillText('Ideas', 40, 66);
  ctx.strokeStyle = '#7c53e8';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(40, 80);
  ctx.bezierCurveTo(120, 90, 150, 72, 196, 82);
  ctx.stroke();

  const items: [string, string][] = [
    ['Website v2', '#3b82f6'],
    ['Content plan', '#f59e0b'],
    ['Growth loop', '#10b981'],
  ];
  items.forEach(([label, color], i) => {
    const y = 150 + i * 66;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(56, y - 8, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2c2740';
    ctx.font = '500 26px "Comic Sans MS", "Segoe Print", system-ui, sans-serif';
    ctx.fillText(label, 84, y);
  });

  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(430, 150);
  ctx.lineTo(560, 150);
  ctx.lineTo(560, 260);
  ctx.stroke();
  return toTexture(c);
}

export type ScreenKind = 'code' | 'ui' | 'chart' | 'text';

export function screenTexture(kind: ScreenKind, accent = '#8b5cf6') {
  const { c, ctx } = surface(384, 240);
  ctx.fillStyle = '#0d1018';
  ctx.fillRect(0, 0, 384, 240);

  if (kind === 'code') {
    const colors = ['#7dd3fc', '#a78bfa', '#34d399', '#fbbf24', '#94a3b8'];
    const r = rng(5);
    let y = 22;
    for (let i = 0; i < 11; i++) {
      let x = 20 + (i % 4 === 0 ? 0 : 16);
      const segs = 2 + Math.floor(r() * 3);
      for (let s = 0; s < segs; s++) {
        const w = 18 + r() * 62;
        ctx.fillStyle = colors[Math.floor(r() * colors.length)];
        ctx.globalAlpha = 0.85;
        ctx.fillRect(x, y, w, 7);
        x += w + 8;
      }
      y += 18;
    }
    ctx.globalAlpha = 1;
  } else if (kind === 'ui') {
    ctx.fillStyle = '#171b26';
    ctx.fillRect(12, 12, 360, 216);
    ctx.fillStyle = accent;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(26, 28, 120, 14);
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.fillRect(26, 54, 210, 8);
    ctx.fillRect(26, 70, 160, 8);
    ctx.fillStyle = accent;
    ctx.fillRect(26, 92, 84, 26);
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(26 + i * 112, 138, 100, 74);
      ctx.fillStyle = 'rgba(255,255,255,0.16)';
      ctx.fillRect(38 + i * 112, 152, 60, 8);
      ctx.fillRect(38 + i * 112, 168, 76, 6);
    }
  } else if (kind === 'chart') {
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(24, 40 + i * 38);
      ctx.lineTo(360, 40 + i * 38);
      ctx.stroke();
    }
    const bars = [0.35, 0.55, 0.42, 0.78, 0.62, 0.9, 0.7];
    bars.forEach((v, i) => {
      const h = v * 150;
      const grad = ctx.createLinearGradient(0, 210 - h, 0, 210);
      grad.addColorStop(0, accent);
      grad.addColorStop(1, 'rgba(34,211,238,0.15)');
      ctx.fillStyle = grad;
      ctx.fillRect(34 + i * 46, 210 - h, 26, h);
    });
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.82)';
    ctx.fillRect(30, 30, 96, 10);
    const r = rng(11);
    let y = 60;
    for (let i = 0; i < 9; i++) {
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fillRect(30, y, 90 + r() * 220, 7);
      y += 18;
    }
  }
  return toTexture(c);
}

export function skyTexture() {
  const { c, ctx } = surface(1024, 512);
  const g = ctx.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, '#6fb2e8');
  g.addColorStop(0.55, '#a8d4f2');
  g.addColorStop(1, '#e6f3fb');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1024, 512);

  const r = rng(91);
  for (let i = 0; i < 14; i++) {
    const x = r() * 1024;
    const y = 60 + r() * 240;
    const w = 70 + r() * 150;
    ctx.fillStyle = `rgba(255,255,255,${0.28 + r() * 0.35})`;
    ctx.beginPath();
    ctx.ellipse(x, y, w, w * 0.32, 0, 0, Math.PI * 2);
    ctx.ellipse(x + w * 0.4, y - w * 0.14, w * 0.6, w * 0.26, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  return toTexture(c);
}

/** Big neon sign for the office wall. Transparent canvas, glowing tube text. */
export function neonSignTexture(text: string) {
  const { c, ctx } = surface(1536, 320);
  ctx.clearRect(0, 0, 1536, 320);
  const W = 1536;
  const H = 320;
  const cx = W / 2;
  const cy = H / 2;
  const pad = 46;
  const font = (px: number) => '700 ' + px + 'px "Segoe UI", "Helvetica Neue", Arial, sans-serif';

  // Shrink until the word fits the canvas with padding on both sides.
  let size = 230;
  ctx.font = font(size);
  const maxW = W - pad * 2;
  if (ctx.measureText(text).width > maxW) {
    size = Math.max(60, Math.floor((size * maxW) / ctx.measureText(text).width));
    ctx.font = font(size);
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // outer halo, wide and soft
  ctx.shadowColor = 'rgba(255,79,216,0.95)';
  ctx.shadowBlur = 70;
  ctx.strokeStyle = 'rgba(255,79,216,0.55)';
  ctx.lineWidth = 16;
  ctx.strokeText(text, cx, cy);

  // cyan rim so it reads on both walls
  ctx.shadowColor = 'rgba(34,211,238,0.9)';
  ctx.shadowBlur = 34;
  ctx.strokeStyle = 'rgba(34,211,238,0.85)';
  ctx.lineWidth = 9;
  ctx.strokeText(text, cx, cy);

  // tube body
  ctx.shadowColor = 'rgba(255,255,255,0.9)';
  ctx.shadowBlur = 26;
  ctx.strokeStyle = 'rgba(255,255,255,0.92)';
  ctx.lineWidth = 6;
  ctx.strokeText(text, cx, cy);

  // hot core
  ctx.shadowBlur = 12;
  ctx.fillStyle = 'rgba(255,255,255,0.98)';
  ctx.fillText(text, cx, cy);

  return toTexture(c);
}

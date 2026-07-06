/**
 * Процедурная pixel-обложка главы: рисуется на маленьком canvas
 * и масштабируется без сглаживания. Клик — перегенерация.
 * Каждой главе — свой рисовальщик, отсылающий к её теме.
 */

import { h } from '../ui/dom';
import { spnEncrypt } from '../lib/crypto/spn';

const W = 132; // логическое разрешение
const H = 36;
const SCALE = 6;

const C = {
  paper: '#f4efe2',
  deep: '#ece5d3',
  ink: '#16130e',
  acid: '#b8e600',
  pink: '#ff2f92',
  violet: '#6a1fd0',
} as const;

/** Детерминированный PRNG (mulberry32). */
const mulberry32 = (seed: number): (() => number) => {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

type Painter = (ctx: CanvasRenderingContext2D, rnd: () => number) => void;

/** Глава 1: циклические группы — точки на окружности, орбиты генераторов. */
const paintGroups: Painter = (ctx, rnd) => {
  ctx.fillStyle = C.ink;
  ctx.fillRect(0, 0, W, H);
  // пыль
  for (let i = 0; i < 40; i += 1) {
    ctx.fillStyle = rnd() < 0.5 ? C.deep : C.acid;
    if (rnd() < 0.35) ctx.fillRect(Math.floor(rnd() * W), Math.floor(rnd() * H), 1, 1);
  }
  const configs = [
    { cx: 22, n: 12, colors: [C.acid, C.pink] },
    { cx: 66, n: 17, colors: [C.pink, C.violet] },
    { cx: 110, n: 24, colors: [C.acid, C.violet] },
  ];
  for (const { cx, n, colors } of configs) {
    const cy = H / 2;
    const r = 14;
    const step = 2 + Math.floor(rnd() * (n - 3));
    const pt = (k: number): readonly [number, number] => [
      cx + r * Math.cos((2 * Math.PI * k) / n - Math.PI / 2),
      cy + r * Math.sin((2 * Math.PI * k) / n - Math.PI / 2),
    ];
    // хорды орбиты шага step
    ctx.strokeStyle = colors[0] ?? C.acid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    let k = 0;
    for (let i = 0; i <= n; i += 1) {
      const [x, y] = pt(k);
      if (i === 0) ctx.moveTo(x + 0.5, y + 0.5);
      else ctx.lineTo(x + 0.5, y + 0.5);
      k = (k + step) % n;
    }
    ctx.stroke();
    // точки
    for (let i = 0; i < n; i += 1) {
      const [x, y] = pt(i);
      ctx.fillStyle = colors[1] ?? C.pink;
      ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 2, 2);
    }
  }
};

/** Глава 2: модулярная арифметика — интерференция колец по модулю. */
const paintRings: Painter = (ctx, rnd) => {
  const m = 17 + Math.floor(rnd() * 8);
  const c1x = 24 + Math.floor(rnd() * 10);
  const c2x = 96 + Math.floor(rnd() * 12);
  const cy = H / 2;
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const d1 = (x - c1x) ** 2 + (y - cy) ** 2;
      const d2 = (x - c2x) ** 2 + (y - cy) ** 2;
      const r1 = d1 % m;
      const r2 = d2 % m;
      let color: string = (x + y) % 2 === 0 ? C.paper : C.deep;
      if (r1 < 2 && r2 < 2) color = C.ink;
      else if (r1 < 2) color = C.acid;
      else if (r2 < 2) color = C.pink;
      else if ((d1 + d2) % (m * 2) === 0) color = C.violet;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
  }
};

/** Глава 3: открытый текст → ECB → CTR: структура растворяется в шум. */
const paintSymmetric: Painter = (ctx, rnd) => {
  const key = Math.floor(rnd() * 0x10000);
  const pal4 = [C.paper, C.acid, C.ink, C.pink];
  const cipherColor = (v: number): string => {
    const r = Math.imul(v ^ 0x5bd1, 2654435761) & 0xffffff;
    return `#${r.toString(16).padStart(6, '0')}`;
  };
  const idx = (x: number, y: number): number => {
    const cx = 22;
    const cy = H / 2;
    let c = Math.floor((x + y) / 5) % 2;
    if ((x - cx) ** 2 + (y - cy) ** 2 < 13 ** 2) c = 2;
    if (Math.abs(x - cx) < 2 && (x - cx) ** 2 + (y - cy) ** 2 < 13 ** 2) c = 3;
    return c;
  };
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const v = idx(x % 44, y);
      let color: string;
      if (x < 44) color = pal4[v] ?? C.paper; // открытый текст
      else if (x < 88) color = cipherColor(spnEncrypt(v, key)); // ECB: 4 цвета, структура видна
      else color = cipherColor(spnEncrypt((y * W + x) & 0xffff, key) ^ v); // CTR-шум
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  // разделители
  ctx.fillStyle = C.ink;
  ctx.fillRect(44, 0, 1, H);
  ctx.fillRect(88, 0, 1, H);
};

const painters: Readonly<Record<string, Painter>> = {
  '01': paintGroups,
  '02': paintRings,
  '03': paintSymmetric,
};

export const mountHero = (root: HTMLElement): void => {
  const chapter = root.dataset['chapter'] ?? '01';
  const painter = painters[chapter];
  if (painter === undefined) return;

  const canvas = h('canvas', {
    width: String(W * SCALE),
    height: String(H * SCALE),
    title: 'клик — перегенерировать',
  });
  const off = document.createElement('canvas');
  off.width = W;
  off.height = H;

  let seed = 0xc0de + Number(chapter) * 7;

  const draw = (): void => {
    const octx = off.getContext('2d');
    const ctx = canvas.getContext('2d');
    if (octx === null || ctx === null) return;
    painter(octx, mulberry32(seed));
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(off, 0, 0, canvas.width, canvas.height);
  };

  canvas.addEventListener('click', () => {
    seed = Math.floor(Math.random() * 0xffffffff);
    draw();
  });

  draw();
  root.append(canvas);
  root.classList.add('hero');
};

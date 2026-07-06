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

/** Глава 4: линейная функция против экспоненциальной — порядок и хаос DLP. */
const paintAsymmetric: Painter = (ctx, rnd) => {
  ctx.fillStyle = C.ink;
  ctx.fillRect(0, 0, W, H);
  const p = 251;
  const g = 6 + Math.floor(rnd() * 20);
  const half = Math.floor(W / 2);
  // слева: g·x mod p — регулярные полосы
  for (let x = 0; x < half - 1; x += 1) {
    const y = (g * x) % p;
    ctx.fillStyle = C.pink;
    ctx.fillRect(x, H - 1 - Math.floor((y / p) * H), 1, 1);
  }
  // справа: g^x mod p — шум
  let acc = 1;
  for (let x = 0; x < W - half - 1; x += 1) {
    acc = (acc * g) % p;
    ctx.fillStyle = C.acid;
    ctx.fillRect(half + 1 + x, H - 1 - Math.floor((acc / p) * H), 1, 1);
  }
  ctx.fillStyle = C.paper;
  ctx.fillRect(half, 0, 1, H);
};

/** Глава 5: силуэт эллиптической кривой слева, облако точек над F_p справа. */
const paintEllipticCurve: Painter = (ctx, rnd) => {
  ctx.fillStyle = C.ink;
  ctx.fillRect(0, 0, W, H);
  const half = Math.floor(W / 2);
  // три визуально разных семейства: овал + ветвь (дискриминант > 0),
  // одна ветвь с «горбом» (a < 0), гладкая одна ветвь (a > 0)
  const family = rnd();
  let a: number;
  let b: number;
  if (family < 0.4) {
    // две компоненты: 4a³ + 27b² < 0
    a = -(2 + Math.floor(rnd() * 3)); // −2..−4
    const bMax = Math.floor(Math.sqrt((-4 * a * a * a - 1) / 27));
    b = Math.floor(rnd() * (2 * bMax + 1)) - bMax;
  } else if (family < 0.7) {
    a = -(1 + Math.floor(rnd() * 2)); // −1..−2, горб
    b = 2 + Math.floor(rnd() * 3);
  } else {
    a = 1 + Math.floor(rnd() * 3); // гладкая
    b = Math.floor(rnd() * 5) - 2;
  }
  if (4 * a * a * a + 27 * b * b === 0) b += 1; // не допускаем сингулярную

  // слева: кривая над R, масштаб по y подгоняется под форму
  const scaleX = 7;
  const xOf = (sx: number): number => (sx - half * 0.55) / scaleX;
  let yMax = 1;
  for (let sx = 2; sx < half - 2; sx += 1) {
    const rhs = xOf(sx) ** 3 + a * xOf(sx) + b;
    if (rhs > 0) yMax = Math.max(yMax, Math.sqrt(rhs));
  }
  const scaleY = (H / 2 - 3) / yMax;
  for (let sx = 2; sx < half - 2; sx += 1) {
    const rhs = xOf(sx) ** 3 + a * xOf(sx) + b;
    if (rhs < 0) continue;
    const y = Math.sqrt(rhs);
    for (const s of [1, -1]) {
      const py = Math.round(H / 2 - s * y * scaleY);
      if (py >= 0 && py < H) {
        ctx.fillStyle = s > 0 ? C.acid : C.pink;
        ctx.fillRect(sx, py, 1, 1);
      }
    }
  }
  // справа: точки над F_p
  const p = 61;
  const ca = 2 + Math.floor(rnd() * 3);
  const cb = 2 + Math.floor(rnd() * 5);
  for (let x = 0; x < p; x += 1) {
    const rhs = (((x * x * x + ca * x + cb) % p) + p) % p;
    for (let y = 0; y < p; y += 1) {
      if ((y * y) % p === rhs) {
        const px = half + 2 + Math.floor((x / p) * (W - half - 3));
        const py = Math.floor((y / p) * (H - 1));
        ctx.fillStyle = C.acid;
        ctx.fillRect(px, py, 1, 1);
      }
    }
  }
  ctx.fillStyle = C.paper;
  ctx.fillRect(half, 0, 1, H);
};

/** Глава 6: сфера Блоха слева, амплитуды трёхкубитного состояния справа. */
const paintQubits: Painter = (ctx, rnd) => {
  ctx.fillStyle = C.ink;
  ctx.fillRect(0, 0, W, H);
  const half = Math.floor(W / 2);

  // слева: сфера Блоха — круг, экватор, вектор состояния
  const cx = Math.floor(half / 2);
  const cy = H / 2;
  const r = 14;
  for (let i = 0; i < 90; i += 1) {
    const t = (2 * Math.PI * i) / 90;
    ctx.fillStyle = C.deep;
    ctx.fillRect(Math.round(cx + r * Math.cos(t)), Math.round(cy + r * Math.sin(t)), 1, 1);
    if (i % 2 === 0) {
      ctx.fillStyle = C.violet;
      ctx.fillRect(Math.round(cx + r * Math.cos(t)), Math.round(cy + 0.3 * r * Math.sin(t)), 1, 1);
    }
  }
  const theta = 0.4 + rnd() * 2.2;
  const phi = rnd() * 2 * Math.PI;
  const vx = Math.sin(theta) * Math.cos(phi);
  const vz = Math.cos(theta);
  for (let s = 0; s <= 12; s += 1) {
    ctx.fillStyle = C.pink;
    ctx.fillRect(Math.round(cx + (s / 12) * r * vx), Math.round(cy - (s / 12) * r * vz), 1, 1);
  }
  ctx.fillStyle = C.acid;
  ctx.fillRect(Math.round(cx + r * vx) - 1, Math.round(cy - r * vz) - 1, 2, 2);

  // справа: 8 амплитуд трёхкубитного состояния — столбцы и фазовые точки
  const count = 8;
  const raw = Array.from({ length: count }, () => rnd());
  const sum = raw.reduce((s, v) => s + v, 0);
  const slot = (W - half - 6) / count;
  for (let i = 0; i < count; i += 1) {
    const p = (raw[i] ?? 0) / sum;
    const bh = Math.max(1, Math.round(p * (H - 10) * 2.2));
    const x0 = half + 4 + Math.floor(i * slot);
    const bw = Math.max(2, Math.floor(slot) - 3);
    ctx.fillStyle = i % 2 === 0 ? C.acid : C.pink;
    ctx.fillRect(x0, Math.max(2, H - 4 - bh), bw, Math.min(bh, H - 6));
    ctx.fillStyle = C.violet;
    ctx.fillRect(x0 + Math.floor(rnd() * bw), Math.max(1, H - 8 - bh), 1, 1);
  }
  ctx.fillStyle = C.paper;
  ctx.fillRect(half, 0, 1, H);
};

/** Глава 7: спектр QFT с пиками периода слева, поворот Гровера справа. */
const paintShor: Painter = (ctx, rnd) => {
  ctx.fillStyle = C.ink;
  ctx.fillRect(0, 0, W, H);
  const half = Math.floor(W / 2);

  // слева: пики на кратных Q/r + шумовой фон
  const r = 3 + Math.floor(rnd() * 4);
  const spacing = (half - 8) / r;
  for (let x = 2; x < half - 2; x += 1) {
    const noise = Math.floor(rnd() * 4);
    ctx.fillStyle = C.deep;
    if (noise > 0) ctx.fillRect(x, H - 4 - noise, 1, noise);
  }
  for (let sMul = 0; sMul < r; sMul += 1) {
    const x = Math.round(4 + sMul * spacing);
    const peak = H - 12 - Math.floor(rnd() * 6);
    ctx.fillStyle = sMul % 2 === 0 ? C.acid : C.pink;
    ctx.fillRect(x, H - 4 - peak, 2, peak);
    ctx.fillStyle = C.violet;
    ctx.fillRect(x, H - 6 - peak, 2, 1);
  }

  // справа: четверть «окружности» Гровера, растянутая на всю панель
  // (эллиптические радиусы rx × ry), след поворота к вертикали
  const cx = half + 6;
  const cy = H - 4;
  const rx = W - half - 12;
  const ry = H - 8;
  for (let i = 0; i <= 64; i += 1) {
    const t = (Math.PI / 2) * (i / 64);
    ctx.fillStyle = C.deep;
    ctx.fillRect(Math.round(cx + rx * Math.cos(t)), Math.round(cy - ry * Math.sin(t)), 1, 1);
  }
  // оси плоскости Гровера
  ctx.fillStyle = C.deep;
  for (let x = cx; x < cx + rx; x += 3) ctx.fillRect(x, cy, 1, 1);
  for (let y = cy - ry; y < cy; y += 3) ctx.fillRect(cx, y, 1, 1);
  const steps = 4 + Math.floor(rnd() * 4);
  const theta = Math.PI / 2 / (2 * steps + 1);
  for (let k = 0; k <= steps; k += 1) {
    const a = (2 * k + 1) * theta;
    const px = cx + rx * Math.cos(a);
    const py = cy - ry * Math.sin(a);
    ctx.fillStyle = k === steps ? C.acid : C.violet;
    ctx.fillRect(Math.round(px) - 1, Math.round(py) - 1, 2, 2);
    if (k === steps) {
      for (let s = 0; s <= 16; s += 1) {
        ctx.fillStyle = C.pink;
        ctx.fillRect(
          Math.round(cx + (s / 16) * rx * Math.cos(a)),
          Math.round(cy - (s / 16) * ry * Math.sin(a)),
          1,
          1,
        );
      }
    }
  }
  ctx.fillStyle = C.paper;
  ctx.fillRect(half, 0, 1, H);
};

/** Глава 8: решётка с хорошим и плохим базисом слева, шумные LWE-точки справа. */
const paintLattice: Painter = (ctx, rnd) => {
  ctx.fillStyle = C.ink;
  ctx.fillRect(0, 0, W, H);
  const half = Math.floor(W / 2);

  // слева: косая решётка точек + два базиса из одного узла
  const b1x = 9 + Math.floor(rnd() * 3);
  const b1y = 2;
  const b2x = 3;
  const b2y = 8 + Math.floor(rnd() * 3);
  const ox = Math.floor(half / 2) - 4;
  const oy = Math.floor(H / 2) + 2;
  for (let i = -6; i <= 6; i += 1) {
    for (let j = -4; j <= 4; j += 1) {
      const x = ox + i * b1x + j * b2x;
      const y = oy - (i * b1y + j * b2y);
      if (x >= 1 && x < half - 2 && y >= 1 && y < H - 1) {
        ctx.fillStyle = C.deep;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }
  const ray = (dx: number, dy: number, len: number, color: string): void => {
    for (let s = 0; s <= len; s += 1) {
      ctx.fillStyle = color;
      ctx.fillRect(Math.round(ox + (s / len) * dx), Math.round(oy - (s / len) * dy), 1, 1);
    }
  };
  // хороший базис — короткий, почти ортогональный
  ray(b1x, b1y, 10, C.acid);
  ray(b2x, b2y, 10, C.acid);
  // плохой — длинный, почти параллельный (комбинации хорошего)
  ray(3 * b1x + 2 * b2x, 3 * b1y + 2 * b2y, 16, C.pink);
  ray(2 * b1x + b2x, 2 * b1y + b2y, 16, C.pink);

  // справа: b = ⟨a, s⟩ — точная прямая (кислотная) против шумных точек (розовые)
  const p = 31;
  const slope = 3 + Math.floor(rnd() * 9);
  for (let x = 0; x < p; x += 1) {
    const exact = (slope * x) % p;
    const px = half + 3 + Math.floor((x / p) * (W - half - 6));
    const pyE = H - 2 - Math.floor((exact / p) * (H - 4));
    ctx.fillStyle = C.acid;
    ctx.fillRect(px, pyE, 1, 1);
    const noisy = (exact + p + Math.floor(rnd() * 5) - 2) % p;
    const pyN = H - 2 - Math.floor((noisy / p) * (H - 4));
    ctx.fillStyle = C.pink;
    ctx.fillRect(px, pyN, 1, 1);
  }
  ctx.fillStyle = C.paper;
  ctx.fillRect(half, 0, 1, H);
};

/** Глава 9: дерево Меркла слева, сравнение размеров ключей справа. */
const paintPqc: Painter = (ctx, rnd) => {
  ctx.fillStyle = C.ink;
  ctx.fillRect(0, 0, W, H);
  const half = Math.floor(W / 2);

  // слева: дерево Меркла — листья внизу, корень сверху
  const levels = 4;
  const leaves = 1 << (levels - 1);
  const nodeAt = (lvl: number, idx: number): readonly [number, number] => {
    const count = 1 << lvl;
    const x = Math.round(((idx + 0.5) / count) * (half - 10)) + 5;
    const y = 4 + Math.round((lvl / (levels - 1)) * (H - 10));
    return [x, y];
  };
  // путь аутентификации: случайный лист
  const target = Math.floor(rnd() * leaves);
  for (let lvl = levels - 1; lvl > 0; lvl -= 1) {
    const count = 1 << lvl;
    for (let i = 0; i < count; i += 1) {
      const [x, y] = nodeAt(lvl, i);
      const [px, py] = nodeAt(lvl - 1, i >> 1);
      // ребро
      const steps = 8;
      for (let s = 0; s <= steps; s += 1) {
        ctx.fillStyle = C.deep;
        ctx.fillRect(
          Math.round(x + ((px - x) * s) / steps),
          Math.round(y + ((py - y) * s) / steps),
          1,
          1,
        );
      }
    }
  }
  for (let lvl = 0; lvl < levels; lvl += 1) {
    const count = 1 << lvl;
    const onPath = target >> (levels - 1 - lvl);
    for (let i = 0; i < count; i += 1) {
      const [x, y] = nodeAt(lvl, i);
      const isPath = i === onPath;
      const isSibling = i === (onPath ^ 1) && lvl > 0;
      ctx.fillStyle = isPath ? C.pink : isSibling ? C.violet : C.acid;
      ctx.fillRect(x - 1, y - 1, isPath ? 3 : 2, isPath ? 3 : 2);
    }
  }

  // справа: полосы размеров (лог-стилизация): классика короткая, PQC длиннее
  const bars = [3 + rnd() * 2, 8 + rnd() * 4, 14 + rnd() * 6, 22 + rnd() * 8, 40 + rnd() * 10];
  const colors = [C.pink, C.acid, C.acid, C.violet, C.paper];
  bars.forEach((len, i) => {
    const y = 5 + i * 6;
    ctx.fillStyle = colors[i] ?? C.acid;
    ctx.fillRect(half + 4, y, Math.min(Math.round(len), W - half - 8), 3);
  });
  ctx.fillStyle = C.paper;
  ctx.fillRect(half, 0, 1, H);
};

/** Глава 10: пила шумового бюджета с bootstrap-сбросами слева, слоты батчинга справа. */
const paintFhe: Painter = (ctx, rnd) => {
  ctx.fillStyle = C.ink;
  ctx.fillRect(0, 0, W, H);
  const half = Math.floor(W / 2);

  // слева: рост шума с провалами-сбросами (bootstrap)
  const limit = 6; // «q/4» сверху
  ctx.fillStyle = C.pink;
  for (let x = 2; x < half - 2; x += 2) ctx.fillRect(x, limit, 1, 1);
  let level = H - 8;
  for (let x = 3; x < half - 3; x += 1) {
    const grow = rnd() < 0.35 ? 3 : 1;
    level -= grow;
    if (level <= limit + 2) {
      // bootstrap: вертикальный сброс
      ctx.fillStyle = C.violet;
      ctx.fillRect(x, limit + 2, 1, H - 10 - limit);
      level = H - 12;
      continue;
    }
    ctx.fillStyle = C.acid;
    ctx.fillRect(x, level, 1, H - 4 - level);
  }

  // справа: SIMD-слоты (CRT-батчинг) — сетка ячеек с данными
  const cols = 10;
  const rows = 4;
  const cw = Math.floor((W - half - 8) / cols);
  const chh = Math.floor((H - 8) / rows);
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const v = rnd();
      ctx.fillStyle = v < 0.25 ? C.acid : v < 0.5 ? C.pink : v < 0.75 ? C.violet : C.deep;
      ctx.fillRect(half + 5 + c * cw, 5 + r * chh, cw - 1, chh - 1);
    }
  }
  ctx.fillStyle = C.paper;
  ctx.fillRect(half, 0, 1, H);
};

/** Глава 0: открытый текст слева, шифртекст справа, ключ между ними. */
const paintIntro: Painter = (ctx, rnd) => {
  ctx.fillStyle = C.ink;
  ctx.fillRect(0, 0, W, H);
  const half = Math.floor(W / 2);

  // слева: «текст» — строки из штрихов разной длины (читаемая структура)
  for (let row = 0; row < 7; row += 1) {
    const y = 3 + row * 5;
    let x = 4;
    while (x < half - 10) {
      const len = 2 + Math.floor(rnd() * 6);
      ctx.fillStyle = rnd() < 0.12 ? C.pink : C.paper;
      ctx.fillRect(x, y, len, 2);
      x += len + 2;
    }
  }

  // справа: шифртекст — равномерный шум без структуры
  for (let y = 2; y < H - 2; y += 1) {
    for (let x = half + 8; x < W - 2; x += 1) {
      const v = rnd();
      if (v < 0.45) {
        ctx.fillStyle = v < 0.06 ? C.acid : v < 0.12 ? C.violet : C.deep;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  // между ними: пиксельный ключ
  const kx = half - 1;
  const ky = Math.floor(H / 2);
  ctx.fillStyle = C.acid;
  // головка — кольцо 5×5
  for (let dy = -2; dy <= 2; dy += 1) {
    for (let dx = -2; dx <= 2; dx += 1) {
      const d = Math.abs(dx) + Math.abs(dy);
      if (d === 2) ctx.fillRect(kx + dx - 4, ky + dy - 6, 1, 1);
    }
  }
  // стержень и бородка
  ctx.fillRect(kx - 4, ky - 3, 1, 12);
  ctx.fillRect(kx - 3, ky + 5, 3, 1);
  ctx.fillRect(kx - 3, ky + 8, 4, 1);
};

const painters: Readonly<Record<string, Painter>> = {
  '00': paintIntro,
  '01': paintGroups,
  '02': paintRings,
  '03': paintSymmetric,
  '04': paintAsymmetric,
  '05': paintEllipticCurve,
  '06': paintQubits,
  '07': paintShor,
  '08': paintLattice,
  '09': paintPqc,
  '10': paintFhe,
};

/** Порядок тайлов коллажа на главной: главы 1–10. */
const COLLAGE_ORDER: readonly string[] = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10'];
const GAP = 2;

/** Тайл-шум: так выглядит «нерасшифрованная» глава. */
const paintNoise: Painter = (ctx, rnd) => {
  ctx.fillStyle = C.ink;
  ctx.fillRect(0, 0, W, H);
  for (let y = 1; y < H - 1; y += 1) {
    for (let x = 1; x < W - 1; x += 1) {
      const v = rnd();
      if (v < 0.4) {
        ctx.fillStyle = v < 0.02 ? C.acid : v < 0.04 ? C.pink : C.deep;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }
};

/**
 * Лента глав для оглавления: один ряд из 5 тайлов (data-row="1" — главы
 * 1–5, data-row="2" — главы 6–10). Декрипт-анимация идёт постоянно:
 * после стартового проявления по ленте бесконечно ходит волна —
 * очередной тайл рассыпается в шум и собирается заново с новым сидом.
 */
export const mountHeroStrip = (root: HTMLElement): void => {
  const rowIdx = root.dataset['row'] === '2' ? 1 : 0;
  const chapters = COLLAGE_ORDER.slice(rowIdx * 5, rowIdx * 5 + 5);
  const cols = chapters.length;
  const LW = cols * W + (cols - 1) * GAP;
  const SC = 4;

  const canvas = h('canvas', {
    width: String(LW * SC),
    height: String(H * SC),
    role: 'img',
    'aria-label': `Обложки глав ${rowIdx === 0 ? '1–5' : '6–10'}`,
  });
  const off = document.createElement('canvas');
  off.width = LW;
  off.height = H;
  const tile = document.createElement('canvas');
  tile.width = W;
  tile.height = H;

  const seeds = chapters.map((_, i) => 0xa11a5 + (rowIdx * 5 + i) * 0x9e37);
  let resolved = 0; // стартовое проявление слева направо

  const draw = (): void => {
    const octx = off.getContext('2d');
    const tctx = tile.getContext('2d');
    const ctx = canvas.getContext('2d');
    if (octx === null || tctx === null || ctx === null) return;
    octx.fillStyle = C.ink;
    octx.fillRect(0, 0, LW, H);
    chapters.forEach((chapter, i) => {
      const isNoise = i >= resolved;
      const painter = isNoise ? paintNoise : painters[chapter];
      if (painter === undefined) return;
      const seed = isNoise ? Math.floor(Math.random() * 0xffffffff) : (seeds[i] ?? 0);
      painter(tctx, mulberry32(seed));
      octx.drawImage(tile, i * (W + GAP), 0);
    });
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(off, 0, 0, canvas.width, canvas.height);
  };

  // одновременная перерисовка: новые сиды у всех тайлов, без шумовой фазы
  const step = (): void => {
    for (let i = 0; i < cols; i += 1) {
      seeds[i] = Math.floor(Math.random() * 0xffffffff);
    }
    draw();
  };

  // интро с шумом — только при загрузке; дальше картинки меняются мгновенно
  draw();
  const intro = window.setInterval(() => {
    resolved += 1;
    draw();
    if (resolved >= cols) {
      window.clearInterval(intro);
      window.setInterval(step, 1000);
    }
  }, 250);

  root.append(canvas);
  root.classList.add('hero', 'hero--strip');
};

/** Пока курсор над обложкой — перегенерация каждые 330 мс. */
const attachHoverRegen = (canvas: HTMLCanvasElement, regen: () => void): void => {
  let timer: number | undefined;
  canvas.addEventListener('mouseenter', () => {
    if (timer !== undefined) return;
    regen();
    timer = window.setInterval(regen, 330);
  });
  canvas.addEventListener('mouseleave', () => {
    if (timer !== undefined) {
      window.clearInterval(timer);
      timer = undefined;
    }
  });
};

export const mountHero = (root: HTMLElement): void => {
  const chapter = root.dataset['chapter'] ?? '01';
  const painter = painters[chapter];
  if (painter === undefined) return;

  const canvas = h('canvas', {
    width: String(W * SCALE),
    height: String(H * SCALE),
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

  attachHoverRegen(canvas, () => {
    seed = Math.floor(Math.random() * 0xffffffff);
    draw();
  });

  draw();
  root.append(canvas);
  root.classList.add('hero');
};

/**
 * 2D-решётка: одна и та же решётка в хорошем (почти ортогональном)
 * и плохом (длинном, почти параллельном) базисе. Клик ставит цель;
 * округление Бабаи в текущем базисе сравнивается с точным CVP.
 */

import { h, replaceChildrenOf } from '../ui/dom';
import {
  Basis2,
  Vec2,
  apply,
  babai,
  closest,
  coords,
  dist,
  det2,
  transform,
} from '../lib/math/lattice';

const CSS = {
  ink: '#16130e',
  acid: '#b8e600',
  pink: '#ff2f92',
  violet: '#6a1fd0',
  paper: '#f4efe2',
  dim: '#5a5648',
} as const;

const CW = 520;
const CH = 320;
const SCALE = 26; // пикселей на единицу
const OX = CW / 2;
const OY = CH / 2;

const GOOD: Basis2 = [
  [2, 0.4],
  [0.4, 1.8],
];
// та же решётка: GOOD · U, U унимодулярна (det = 1)
const U: Basis2 = [
  [7, 4],
  [5, 3],
];
const BAD: Basis2 = transform(GOOD, U);

const toPx = (p: Vec2): Vec2 => [OX + p[0] * SCALE, OY - p[1] * SCALE];
const fromPx = (px: number, py: number): Vec2 => [(px - OX) / SCALE, (OY - py) / SCALE];

interface State {
  readonly kind: 'good' | 'bad';
  readonly t: Vec2;
}

const draw = (canvas: HTMLCanvasElement, s: State): void => {
  const ctx = canvas.getContext('2d');
  if (ctx === null) return;
  const B = s.kind === 'good' ? GOOD : BAD;
  ctx.fillStyle = CSS.ink;
  ctx.fillRect(0, 0, CW, CH);

  // точки решётки (перебор координат в хорошем базисе — та же решётка)
  ctx.fillStyle = CSS.dim;
  for (let i = -12; i <= 12; i += 1) {
    for (let j = -12; j <= 12; j += 1) {
      const [px, py] = toPx(apply(GOOD, [i, j]));
      if (px >= 2 && px < CW - 2 && py >= 2 && py < CH - 2) {
        ctx.fillRect(Math.round(px) - 1, Math.round(py) - 1, 2, 2);
      }
    }
  }

  // векторы текущего базиса
  const arrow = (v: Vec2, color: string, label: string): void => {
    const [px, py] = toPx(v);
    const [ox, oy] = toPx([0, 0]);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(px, py);
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(px) - 2, Math.round(py) - 2, 4, 4);
    ctx.font = '13px "PT Mono", monospace';
    ctx.fillText(label, px + 5, py - 4);
  };
  arrow(B[0], CSS.acid, 'b1');
  arrow(B[1], CSS.acid, 'b2');

  // цель, ответ Бабаи, точный CVP
  const [tx, ty] = toPx(s.t);
  const vB = apply(B, babai(B, s.t));
  const vC = apply(GOOD, closest(GOOD, s.t, 8)); // точный CVP не зависит от базиса
  const [bx, by] = toPx(vB);
  const [cx2, cy2] = toPx(vC);

  ctx.strokeStyle = CSS.violet;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(tx, ty);
  ctx.lineTo(cx2, cy2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = CSS.pink;
  ctx.beginPath();
  ctx.moveTo(tx, ty);
  ctx.lineTo(bx, by);
  ctx.stroke();

  ctx.fillStyle = CSS.violet;
  ctx.fillRect(Math.round(cx2) - 3, Math.round(cy2) - 3, 6, 6);
  ctx.fillStyle = CSS.pink;
  ctx.fillRect(Math.round(bx) - 3, Math.round(by) - 3, 6, 6);
  ctx.fillStyle = CSS.paper;
  ctx.beginPath();
  ctx.arc(tx, ty, 4, 0, 2 * Math.PI);
  ctx.fill();

  ctx.fillStyle = CSS.paper;
  ctx.font = '12px "PT Mono", monospace';
  ctx.fillText('цель t (кликните, чтобы переставить)', 8, 16);
};

export const mountLatticeCvp = (root: HTMLElement): void => {
  let state: State = { kind: 'good', t: [3.3, 1.1] };

  const canvas = h('canvas', { width: String(CW), height: String(CH) });
  const status = h('div', { class: 'widget-status' });
  const derivation = h('div', { class: 'phi-derivation' });

  canvas.addEventListener('click', (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * CW;
    const py = ((e.clientY - rect.top) / rect.height) * CH;
    state = { ...state, t: fromPx(px, py) };
    rerender();
  });

  const controls = h(
    'div',
    { class: 'widget-controls' },
    h(
      'label',
      {},
      'базис:',
      h(
        'select',
        {
          onchange: (e: Event) => {
            state = { ...state, kind: (e.target as HTMLSelectElement).value as State['kind'] };
            rerender();
          },
        },
        h('option', { value: 'good', selected: true }, 'хороший (почти ортогональный)'),
        h('option', { value: 'bad' }, 'плохой (тот же ·U, det U = 1)'),
      ),
    ),
    h(
      'button',
      {
        onclick: () => {
          state = {
            ...state,
            t: [(Math.random() - 0.5) * 16, (Math.random() - 0.5) * 9],
          };
          rerender();
        },
      },
      'случайная цель',
    ),
  );

  const rerender = (): void => {
    const B = state.kind === 'good' ? GOOD : BAD;
    const cB = babai(B, state.t);
    const vB = apply(B, cB);
    const vC = apply(GOOD, closest(GOOD, state.t, 8));
    const dB = dist(vB, state.t);
    const dC = dist(vC, state.t);
    const ok = dB - dC < 1e-6;
    const [c1, c2] = coords(B, state.t);

    replaceChildrenOf(
      derivation,
      h(
        'div',
        {},
        `координаты цели в базисе: (${c1.toFixed(2)}, ${c2.toFixed(2)}) → округление (${cB[0]}, ${cB[1]})`,
      ),
      h(
        'div',
        {},
        `|det B| = ${Math.abs(det2(B)).toFixed(2)} — у обоих базисов одинаков (унимодулярная связка)`,
      ),
    );
    replaceChildrenOf(
      status,
      h(
        'span',
        { class: 'hl' },
        ok
          ? `Бабаи попал: расстояние ${dB.toFixed(2)} = оптимум`
          : `Бабаи промахнулся: ${dB.toFixed(2)} против оптимума ${dC.toFixed(2)}`,
      ),
      ' · розовое — ответ Бабаи, фиолетовое — точный CVP',
    );
    draw(canvas, state);
  };

  rerender();
  root.append(
    h('div', { class: 'widget-title' }, 'одна решётка, два базиса: CVP округлением'),
    h(
      'div',
      { class: 'widget-body' },
      controls,
      canvas,
      derivation,
      status,
      h(
        'div',
        { class: 'widget-hint' },
        'в хорошем базисе округление координат почти всегда попадает в ближайшую точку; в плохом — координаты цели огромны, полшага округления уносит далеко',
      ),
    ),
  );
  root.classList.add('widget');
};

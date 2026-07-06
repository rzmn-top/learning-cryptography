/**
 * Часовая арифметика: сложение по модулю n как поворот стрелки.
 * Первая встреча с групповой операцией — до всяких определений.
 */

import { h, replaceChildrenOf } from '../ui/dom';
import { numParam } from '../ui/widgets';
import { mod } from '../lib/math/mod';

interface State {
  readonly n: number;
  readonly a: number;
  readonly b: number;
  readonly progress: number; // 0..a+b — на сколько шагов повёрнута стрелка
}

const CSS = {
  ink: '#16130e',
  soft: '#4c463b',
  acid: '#b8e600',
  pink: '#ff2f92',
  paper: '#f4efe2',
} as const;

const draw = (canvas: HTMLCanvasElement, s: State): void => {
  const ctx = canvas.getContext('2d');
  if (ctx === null) return;
  const w = canvas.width;
  const hgt = canvas.height;
  const cx = w / 2;
  const cy = hgt / 2;
  const r = Math.min(w, hgt) / 2 - 34;

  ctx.clearRect(0, 0, w, hgt);

  // циферблат
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, 2 * Math.PI);
  ctx.strokeStyle = CSS.ink;
  ctx.lineWidth = 2;
  ctx.stroke();

  const angleOf = (k: number): number => -Math.PI / 2 + (2 * Math.PI * k) / s.n;

  for (let k = 0; k < s.n; k += 1) {
    const ang = angleOf(k);
    const x = cx + (r + 18) * Math.cos(ang);
    const y = cy + (r + 18) * Math.sin(ang);
    ctx.fillStyle = k === mod(s.progress, s.n) ? CSS.pink : CSS.ink;
    ctx.font = k === mod(s.progress, s.n) ? 'bold 17px VT323, monospace' : '15px VT323, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(k), x, y);

    ctx.beginPath();
    ctx.arc(cx + r * Math.cos(ang), cy + r * Math.sin(ang), 3, 0, 2 * Math.PI);
    ctx.fillStyle = CSS.soft;
    ctx.fill();
  }

  // пройденная дуга: сначала a шагов (acid), затем b шагов (pink)
  const arcSteps = (from: number, to: number, color: string): void => {
    if (to <= from) return;
    ctx.beginPath();
    ctx.arc(cx, cy, r - 12, angleOf(from), angleOf(to));
    ctx.strokeStyle = color;
    ctx.lineWidth = 6;
    ctx.stroke();
  };
  arcSteps(0, Math.min(s.progress, s.a), CSS.acid);
  arcSteps(s.a, Math.max(s.progress, s.a), CSS.pink);

  // стрелка
  const ang = angleOf(s.progress);
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + (r - 24) * Math.cos(ang), cy + (r - 24) * Math.sin(ang));
  ctx.strokeStyle = CSS.ink;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, 5, 0, 2 * Math.PI);
  ctx.fillStyle = CSS.ink;
  ctx.fill();
};

export const mountClock = (root: HTMLElement): void => {
  let state: State = { n: numParam(root, 'n', 12), a: 9, b: 7, progress: 0 };
  let timer: number | undefined;

  const canvas = h('canvas', { width: '360', height: '360' });
  const body = h('div', { class: 'widget-body' });

  const stopAnim = (): void => {
    if (timer !== undefined) window.clearInterval(timer);
    timer = undefined;
  };

  const rerender = (): void => {
    const total = state.a + state.b;
    const result = mod(total, state.n);
    const done = state.progress >= total;

    const numInput = (
      label: string,
      value: number,
      set: (v: number) => State,
    ): HTMLElement =>
      h(
        'label',
        {},
        label,
        h('input', {
          type: 'number',
          min: '0',
          max: '99',
          value: String(value),
          onchange: (e: Event) => {
            const v = Number((e.target as HTMLInputElement).value);
            if (Number.isInteger(v) && v >= 0) {
              stopAnim();
              state = { ...set(v), progress: 0 };
              rerender();
            }
          },
        }),
      );

    const controls = h(
      'div',
      { class: 'widget-controls' },
      numInput('n =', state.n, (v) => ({ ...state, n: Math.max(2, Math.min(24, v)) })),
      numInput('a =', state.a, (v) => ({ ...state, a: v })),
      numInput('b =', state.b, (v) => ({ ...state, b: v })),
      h(
        'button',
        {
          onclick: () => {
            stopAnim();
            state = { ...state, progress: 0 };
            rerender();
            timer = window.setInterval(() => {
              if (state.progress >= state.a + state.b) {
                stopAnim();
                return;
              }
              state = { ...state, progress: state.progress + 1 };
              rerender();
            }, 260);
          },
        },
        `▶ ${state.a} + ${state.b}`,
      ),
    );

    const status = h(
      'div',
      { class: 'widget-status' },
      done
        ? h('span', { class: 'hl' }, `${state.a} + ${state.b} = ${total} ≡ ${result} (mod ${state.n})`)
        : `шагов сделано: ${state.progress} из ${total}`,
    );

    replaceChildrenOf(body, controls, canvas, status);
    draw(canvas, state);
  };

  rerender();
  root.append(h('div', { class: 'widget-title' }, 'часовая арифметика'), body);
  root.classList.add('widget');
};

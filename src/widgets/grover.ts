/**
 * Итерации Гровера: состояние живёт в плоскости span{|цель⟩, |остальные⟩},
 * каждая итерация (оракул + диффузия) поворачивает вектор на 2θ,
 * sin θ = 1/√N. Виджет показывает поворот и вероятность успеха,
 * включая «перекрут» после оптимального числа итераций.
 */

import { h, replaceChildrenOf } from '../ui/dom';

const CSS = {
  ink: '#16130e',
  acid: '#b8e600',
  pink: '#ff2f92',
  violet: '#6a1fd0',
  paper: '#f4efe2',
  dim: '#5a5648',
} as const;

const SIZES: readonly number[] = [64, 256, 1024, 4096];

interface State {
  readonly n: number;
  readonly k: number;
}

const CW = 320;
const CH = 300;
const R = 120;
const CX = CW / 2;
const CY = CH / 2 + 10;

const draw = (canvas: HTMLCanvasElement, s: State): void => {
  const ctx = canvas.getContext('2d');
  if (ctx === null) return;
  ctx.fillStyle = CSS.ink;
  ctx.fillRect(0, 0, CW, CH);

  const theta = Math.asin(1 / Math.sqrt(s.n));
  const ang = (2 * s.k + 1) * theta;

  // окружность и оси
  ctx.strokeStyle = CSS.dim;
  ctx.beginPath();
  ctx.arc(CX, CY, R, 0, 2 * Math.PI);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(CX - R - 12, CY);
  ctx.lineTo(CX + R + 12, CY);
  ctx.moveTo(CX, CY + R + 12);
  ctx.lineTo(CX, CY - R - 12);
  ctx.stroke();
  ctx.fillStyle = CSS.paper;
  ctx.font = '12px "PT Mono", monospace';
  ctx.fillText('|остальные⟩', CX + R - 76, CY + 16);
  ctx.fillText('|цель⟩', CX + 6, CY - R - 2);

  // след предыдущих итераций
  for (let i = 0; i <= s.k; i += 1) {
    const a = (2 * i + 1) * theta;
    const px = CX + R * Math.cos(a);
    const py = CY - R * Math.sin(a);
    ctx.fillStyle = i === s.k ? CSS.acid : CSS.violet;
    ctx.fillRect(Math.round(px) - 2, Math.round(py) - 2, i === s.k ? 5 : 3, i === s.k ? 5 : 3);
  }

  // текущий вектор
  ctx.strokeStyle = CSS.pink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(CX, CY);
  ctx.lineTo(CX + R * Math.cos(ang), CY - R * Math.sin(ang));
  ctx.stroke();
  ctx.lineWidth = 1;
};

export const mountGrover = (root: HTMLElement): void => {
  let state: State = { n: 256, k: 0 };

  const canvas = h('canvas', { width: String(CW), height: String(CH) });
  const body = h('div', { class: 'widget-body' });

  const rerender = (): void => {
    const { n, k } = state;
    const theta = Math.asin(1 / Math.sqrt(n));
    const kOpt = Math.max(0, Math.round(Math.PI / (4 * theta) - 0.5));
    const pSucc = Math.sin((2 * k + 1) * theta) ** 2;

    const controls = h(
      'div',
      { class: 'widget-controls' },
      h(
        'label',
        {},
        'N =',
        h(
          'select',
          {
            onchange: (e: Event) => {
              state = { n: Number((e.target as HTMLSelectElement).value), k: 0 };
              rerender();
            },
          },
          ...SIZES.map((v) => h('option', { value: String(v), selected: v === n }, String(v))),
        ),
      ),
      h(
        'button',
        {
          onclick: () => {
            state = { ...state, k: k + 1 };
            rerender();
          },
        },
        'итерация (оракул + диффузия)',
      ),
      h(
        'button',
        {
          onclick: () => {
            state = { ...state, k: kOpt };
            rerender();
          },
        },
        `к оптимуму (k = ${kOpt})`,
      ),
      h(
        'button',
        {
          onclick: () => {
            state = { ...state, k: 0 };
            rerender();
          },
        },
        'сброс',
      ),
    );

    replaceChildrenOf(
      body,
      controls,
      canvas,
      h(
        'div',
        { class: 'widget-status' },
        h(
          'span',
          { class: 'hl' },
          `k = ${k} · угол (2k+1)θ = ${((((2 * k + 1) * theta) * 180) / Math.PI).toFixed(1)}° · P(успех) = ${pSucc.toFixed(3)}`,
        ),
        ` · оптимум k = ${kOpt} ≈ (π/4)√N`,
      ),
      h(
        'div',
        { class: 'widget-hint' },
        k > kOpt
          ? 'перекрут: вектор прошёл мимо |цели⟩ и вероятность падает — Гровер нельзя «просто гонять подольше»'
          : 'каждая итерация — два отражения = поворот на 2θ к |цели⟩; sin θ = 1/√N',
      ),
    );
    draw(canvas, state);
  };

  rerender();
  root.append(h('div', { class: 'widget-title' }, 'Гровер: поворот в плоскости за √N шагов'), body);
  root.classList.add('widget');
};

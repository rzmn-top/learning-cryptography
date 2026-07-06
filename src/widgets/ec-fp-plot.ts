/**
 * Кривая над F_p: облако точек (симметрия относительно y = p/2)
 * и анимация скалярного умножения kP — «прыжки» по орбите генератора.
 */

import { h, replaceChildrenOf } from '../ui/dom';
import { numParam } from '../ui/widgets';
import { CurveFp, PointFp, points, multiples, pointOrder, isOnCurve } from '../lib/math/ec-fp';

interface State {
  readonly curve: CurveFp;
  readonly gx: number;
  readonly gy: number;
  readonly k: number; // текущее кратное показано
}

const CSS = {
  ink: '#16130e',
  soft: '#4c463b',
  rule: '#c9c0aa',
  acid: '#b8e600',
  pink: '#ff2f92',
  violet: '#6a1fd0',
  paper: '#f4efe2',
} as const;

const SIZE = 400;

export const mountEcFpPlot = (root: HTMLElement): void => {
  const p = numParam(root, 'p', 61);
  const a = numParam(root, 'a', -1);
  const b = numParam(root, 'b', 3);
  const curve0: CurveFp = { a, b, p };
  const pts0 = points(curve0);
  const firstAffine = pts0.find((pt): pt is { x: number; y: number } => pt !== null) ?? { x: 0, y: 0 };

  let state: State = { curve: curve0, gx: firstAffine.x, gy: firstAffine.y, k: 1 };
  let timer: number | undefined;

  const canvas = h('canvas', { width: String(SIZE), height: String(SIZE) });
  const body = h('div', { class: 'widget-body' });

  const stop = (): void => {
    if (timer !== undefined) window.clearInterval(timer);
    timer = undefined;
  };

  const cell = (v: number): number => (v / state.curve.p) * (SIZE - 20) + 10;

  const redraw = (): void => {
    const ctx = canvas.getContext('2d');
    if (ctx === null) return;
    const { curve } = state;
    ctx.fillStyle = CSS.paper;
    ctx.fillRect(0, 0, SIZE, SIZE);

    // ось симметрии y = p/2
    ctx.strokeStyle = CSS.rule;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.moveTo(0, cell(curve.p / 2));
    ctx.lineTo(SIZE, cell(curve.p / 2));
    ctx.stroke();
    ctx.setLineDash([]);

    // все точки кривой
    for (const pt of points(curve)) {
      if (pt === null) continue;
      ctx.beginPath();
      ctx.arc(cell(pt.x), SIZE - cell(pt.y), 2.5, 0, 2 * Math.PI);
      ctx.fillStyle = CSS.rule;
      ctx.fill();
    }

    // орбита G до kG
    const G: PointFp = { x: state.gx, y: state.gy };
    const mults = multiples(curve, G);
    const shown = mults.slice(0, state.k);
    shown.forEach((pt, i) => {
      if (pt === null) return;
      const isLast = i === shown.length - 1;
      ctx.beginPath();
      ctx.arc(cell(pt.x), SIZE - cell(pt.y), isLast ? 7 : 4, 0, 2 * Math.PI);
      ctx.fillStyle = isLast ? CSS.pink : CSS.acid;
      ctx.fill();
      ctx.strokeStyle = CSS.ink;
      ctx.lineWidth = isLast ? 2 : 1;
      ctx.stroke();
      if (isLast) {
        ctx.fillStyle = CSS.ink;
        ctx.font = 'bold 14px VT323, monospace';
        ctx.fillText(`${state.k}G`, cell(pt.x) + 9, SIZE - cell(pt.y) - 6);
      }
    });
  };

  const status = h('div', { class: 'widget-status' });

  const updateStatus = (): void => {
    const G: PointFp = { x: state.gx, y: state.gy };
    const ord = pointOrder(state.curve, G);
    const mults = multiples(state.curve, G);
    const current = state.k >= 1 && state.k <= mults.length ? mults[state.k - 1] : null;
    const label = current == null ? 'O (∞)' : `(${current.x}, ${current.y})`;
    replaceChildrenOf(
      status,
      h('span', { class: 'hl' }, `${state.k}·G = ${label}`),
      `  ord(G) = ${ord} · всего точек ${points(state.curve).length}`,
    );
  };

  const rerender = (): void => {
    const G: PointFp = { x: state.gx, y: state.gy };
    const onCurve = isOnCurve(state.curve, G);
    const affine = points(state.curve).filter((pt): pt is { x: number; y: number } => pt !== null);

    const controls = h(
      'div',
      { class: 'widget-controls' },
      h(
        'label',
        {},
        'генератор G:',
        h(
          'select',
          {
            onchange: (e: Event) => {
              stop();
              const [gx, gy] = (e.target as HTMLSelectElement).value.split(',').map(Number);
              state = { ...state, gx: gx ?? 0, gy: gy ?? 0, k: 1 };
              redraw();
              updateStatus();
            },
          },
          ...affine
            .slice(0, 40)
            .map((pt) =>
              h('option', { value: `${pt.x},${pt.y}`, selected: pt.x === state.gx && pt.y === state.gy }, `(${pt.x}, ${pt.y})`),
            ),
        ),
      ),
      h(
        'button',
        {
          onclick: () => {
            stop();
            state = { ...state, k: 1 };
            redraw();
            updateStatus();
            const ord = pointOrder(state.curve, G);
            timer = window.setInterval(() => {
              if (state.k >= ord + 1) {
                stop();
                return;
              }
              state = { ...state, k: state.k + 1 };
              redraw();
              updateStatus();
            }, 380);
          },
        },
        '▶ G, 2G, 3G, …',
      ),
      h(
        'button',
        {
          onclick: () => {
            stop();
            state = { ...state, k: state.k + 1 };
            redraw();
            updateStatus();
          },
        },
        '+G',
      ),
    );

    replaceChildrenOf(
      body,
      controls,
      canvas,
      status,
      h(
        'div',
        { class: 'widget-hint' },
        onCurve
          ? `кривая y² = x³ ${state.curve.a >= 0 ? '+ ' + state.curve.a : '− ' + -state.curve.a}·x ${state.curve.b >= 0 ? '+ ' + state.curve.b : '− ' + -state.curve.b} над F_${state.curve.p} · точки симметричны относительно y = p/2`
          : 'G не на кривой',
      ),
    );
    redraw();
    updateStatus();
  };

  rerender();
  root.append(h('div', { class: 'widget-title' }, 'кривая над F_p и скалярное умножение'), body);
  root.classList.add('widget');
};

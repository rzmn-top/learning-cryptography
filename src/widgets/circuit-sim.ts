/**
 * Симулятор схем на 2–3 кубитах: гейты добавляются кнопками,
 * состояние пересчитывается с нуля, амплитуды показываются
 * столбцами |амплитуда|² со стрелкой фазы над каждым столбцом.
 */

import { h, replaceChildrenOf } from '../ui/dom';
import {
  QState,
  zeroState,
  applyGate,
  applyCnot,
  cabs2,
  carg,
  fmtComplex,
  Gate1,
  GATE_H,
  GATE_X,
  GATE_Z,
  GATE_T,
  CZERO,
} from '../lib/math/quantum';
import { numParam } from '../ui/widgets';

const CSS = {
  ink: '#16130e',
  acid: '#b8e600',
  pink: '#ff2f92',
  violet: '#6a1fd0',
  paper: '#f4efe2',
  dim: '#5a5648',
} as const;

type Op =
  | { readonly kind: 'g'; readonly gate: Gate1; readonly q: number }
  | { readonly kind: 'cnot'; readonly c: number; readonly t: number };

const opLabel = (op: Op): string =>
  op.kind === 'g' ? `${op.gate.name}@${op.q}` : `CNOT ${op.c}→${op.t}`;

const runCircuit = (n: number, ops: readonly Op[]): QState =>
  ops.reduce<QState>(
    (st, op) =>
      op.kind === 'g' ? applyGate(st, n, op.q, op.gate) : applyCnot(st, n, op.c, op.t),
    zeroState(n),
  );

const CW = 520;
const CH = 210;

const drawAmps = (canvas: HTMLCanvasElement, n: number, state: QState): void => {
  const ctx = canvas.getContext('2d');
  if (ctx === null) return;
  ctx.fillStyle = CSS.ink;
  ctx.fillRect(0, 0, CW, CH);

  const count = 1 << n;
  const slot = CW / count;
  const barW = Math.min(28, slot * 0.5);
  const base = CH - 22;
  const maxH = base - 42;

  for (let i = 0; i < count; i += 1) {
    const amp = state[i] ?? CZERO;
    const p = cabs2(amp);
    const cx = slot * i + slot / 2;

    // столбец вероятности
    const bh = Math.round(p * maxH);
    ctx.fillStyle = CSS.acid;
    ctx.fillRect(Math.round(cx - barW / 2), base - bh, Math.round(barW), bh);
    ctx.strokeStyle = CSS.dim;
    ctx.strokeRect(Math.round(cx - barW / 2) + 0.5, base - maxH + 0.5, Math.round(barW), maxH);

    // стрелка фазы
    if (p > 1e-6) {
      const ang = carg(amp);
      const ry = base - maxH - 16;
      ctx.strokeStyle = CSS.dim;
      ctx.beginPath();
      ctx.arc(cx, ry, 9, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.strokeStyle = CSS.pink;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, ry);
      ctx.lineTo(cx + 9 * Math.sin(ang), ry - 9 * Math.cos(ang));
      ctx.stroke();
      ctx.lineWidth = 1;
    }

    // подпись базисного состояния
    ctx.fillStyle = CSS.paper;
    ctx.font = '12px "PT Mono", monospace';
    const label = `|${i.toString(2).padStart(n, '0')}⟩`;
    ctx.fillText(label, cx - ctx.measureText(label).width / 2, CH - 7);
  }
};

export const mountCircuitSim = (root: HTMLElement): void => {
  const n = Math.max(2, Math.min(3, numParam(root, 'qubits', 2)));
  let ops: readonly Op[] = [];

  const canvas = h('canvas', { width: String(CW), height: String(CH) });
  const body = h('div', { class: 'widget-body' });

  const cnotPairs: readonly (readonly [number, number])[] =
    n === 2
      ? [
          [0, 1],
          [1, 0],
        ]
      : [
          [0, 1],
          [1, 2],
          [0, 2],
        ];

  const rerender = (): void => {
    const state = runCircuit(n, ops);

    const push = (op: Op): void => {
      ops = [...ops, op];
      rerender();
    };

    const gateButtons = [GATE_H, GATE_X, GATE_Z, GATE_T].flatMap((g) =>
      Array.from({ length: n }, (_, q) =>
        h('button', { onclick: () => push({ kind: 'g', gate: g, q }) }, `${g.name}@${q}`),
      ),
    );

    const controls = h(
      'div',
      { class: 'widget-controls' },
      ...gateButtons,
      ...cnotPairs.map(([c, t]) =>
        h('button', { onclick: () => push({ kind: 'cnot', c, t }) }, `CNOT ${c}→${t}`),
      ),
      h(
        'button',
        {
          onclick: () => {
            ops =
              n === 2
                ? [
                    { kind: 'g', gate: GATE_H, q: 0 },
                    { kind: 'cnot', c: 0, t: 1 },
                  ]
                : [
                    { kind: 'g', gate: GATE_H, q: 0 },
                    { kind: 'cnot', c: 0, t: 1 },
                    { kind: 'cnot', c: 1, t: 2 },
                  ];
            rerender();
          },
        },
        n === 2 ? 'белл' : 'GHZ',
      ),
      h(
        'button',
        {
          onclick: () => {
            ops = ops.slice(0, -1);
            rerender();
          },
        },
        '⌫ отмена',
      ),
      h(
        'button',
        {
          onclick: () => {
            ops = [];
            rerender();
          },
        },
        'сброс',
      ),
    );

    const nonzero = state
      .map((amp, i) => ({ amp, i }))
      .filter(({ amp }) => cabs2(amp) > 1e-9)
      .map(({ amp, i }) => `(${fmtComplex(amp)})·|${i.toString(2).padStart(n, '0')}⟩`)
      .join(' + ');

    replaceChildrenOf(
      body,
      controls,
      h(
        'div',
        { class: 'phi-derivation' },
        h('div', {}, ops.length === 0 ? 'схема пуста: |' + '0'.repeat(n) + '⟩' : `схема: ${ops.map(opLabel).join(' · ')}`),
      ),
      canvas,
      h('div', { class: 'widget-status' }, h('span', { class: 'hl' }, `ψ = ${nonzero}`)),
      h(
        'div',
        { class: 'widget-hint' },
        'высота столбца — вероятность |амплитуды|², стрелка над ним — фаза; H@0 затем CNOT 0→1 даёт запутанную пару',
      ),
    );
    drawAmps(canvas, n, state);
  };

  rerender();
  root.append(
    h('div', { class: 'widget-title' }, `симулятор схем: ${n} кубита, амплитуды и фазы`),
    body,
  );
  root.classList.add('widget');
};

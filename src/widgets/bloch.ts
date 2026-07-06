/**
 * Сфера Блоха: состояние одного кубита как точка на сфере.
 * Кнопки применяют гейты X, Z, H, S, T; вектор двигается,
 * статусная строка показывает амплитуды и углы (θ, φ).
 */

import { h, replaceChildrenOf } from '../ui/dom';
import {
  QState,
  zeroState,
  applyGate,
  blochAngles,
  fmtComplex,
  Gate1,
  GATE_X,
  GATE_Z,
  GATE_H,
  GATE_S,
  GATE_T,
  CZERO,
} from '../lib/math/quantum';

const CSS = {
  ink: '#16130e',
  acid: '#b8e600',
  pink: '#ff2f92',
  violet: '#6a1fd0',
  paper: '#f4efe2',
  dim: '#5a5648',
} as const;

const W = 320;
const HGT = 280;
const R = 100;
const CX = W / 2;
const CY = HGT / 2;

/** Проекция точки сферы (x к зрителю-влево-вниз, y вправо, z вверх). */
const proj = (x: number, y: number, z: number): readonly [number, number] => [
  CX + R * y - 0.38 * R * x,
  CY - R * z + 0.24 * R * x,
];

const drawSphere = (canvas: HTMLCanvasElement, theta: number, phi: number): void => {
  const ctx = canvas.getContext('2d');
  if (ctx === null) return;
  ctx.fillStyle = CSS.ink;
  ctx.fillRect(0, 0, W, HGT);

  // контур сферы
  ctx.strokeStyle = CSS.dim;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(CX, CY, R, 0, 2 * Math.PI);
  ctx.stroke();

  // экватор
  ctx.beginPath();
  for (let i = 0; i <= 64; i += 1) {
    const t = (2 * Math.PI * i) / 64;
    const [px, py] = proj(Math.cos(t), Math.sin(t), 0);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  // оси
  const axis = (x: number, y: number, z: number, label: string): void => {
    const [px, py] = proj(x, y, z);
    ctx.strokeStyle = CSS.dim;
    ctx.beginPath();
    ctx.moveTo(...proj(-x, -y, -z));
    ctx.lineTo(px, py);
    ctx.stroke();
    ctx.fillStyle = CSS.paper;
    ctx.font = '13px "PT Mono", monospace';
    ctx.fillText(label, px + 4, py - 4);
  };
  axis(0, 0, 1.18, '|0⟩');
  axis(0, 1.18, 0, 'y');
  axis(1.22, 0, 0, 'x');
  ctx.fillStyle = CSS.paper;
  const [zx, zy] = proj(0, 0, -1.18);
  ctx.fillText('|1⟩', zx + 4, zy + 12);

  // вектор состояния
  const vx = Math.sin(theta) * Math.cos(phi);
  const vy = Math.sin(theta) * Math.sin(phi);
  const vz = Math.cos(theta);
  const [tx, ty] = proj(vx, vy, vz);
  ctx.strokeStyle = CSS.pink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(CX, CY);
  ctx.lineTo(tx, ty);
  ctx.stroke();
  ctx.fillStyle = CSS.acid;
  ctx.fillRect(Math.round(tx) - 3, Math.round(ty) - 3, 6, 6);

  // проекция на экватор (для фазы)
  if (Math.abs(Math.sin(theta)) > 0.03) {
    const [ex, ey] = proj(vx, vy, 0);
    ctx.strokeStyle = CSS.violet;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(ex, ey);
    ctx.moveTo(CX, CY);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.setLineDash([]);
  }
};

const GATES: readonly Gate1[] = [GATE_X, GATE_Z, GATE_H, GATE_S, GATE_T];

export const mountBloch = (root: HTMLElement): void => {
  let state: QState = zeroState(1);
  let history: readonly string[] = [];

  const canvas = h('canvas', { width: String(W), height: String(HGT) });
  const body = h('div', { class: 'widget-body' });

  const rerender = (): void => {
    const { theta, phi } = blochAngles(state);
    const a = state[0] ?? CZERO;
    const b = state[1] ?? CZERO;

    const gateBtn = (g: Gate1): HTMLElement =>
      h(
        'button',
        {
          onclick: () => {
            state = applyGate(state, 1, 0, g);
            history = [...history, g.name].slice(-16);
            rerender();
          },
        },
        g.name,
      );

    const controls = h(
      'div',
      { class: 'widget-controls' },
      ...GATES.map(gateBtn),
      h(
        'button',
        {
          onclick: () => {
            state = zeroState(1);
            history = [];
            rerender();
          },
        },
        'сброс |0⟩',
      ),
    );

    const deg = (r: number): string => `${((r * 180) / Math.PI).toFixed(0)}°`;
    replaceChildrenOf(
      body,
      controls,
      canvas,
      h(
        'div',
        { class: 'widget-status' },
        h('span', { class: 'hl' }, `ψ = (${fmtComplex(a)})·|0⟩ + (${fmtComplex(b)})·|1⟩`),
        ` · θ = ${deg(theta)}, φ = ${deg(phi)}`,
      ),
      h(
        'div',
        { class: 'widget-hint' },
        history.length === 0
          ? 'X — поворот вокруг x на 180°; Z, S, T — вокруг z на 180°/90°/45°; H — вокруг диагонали (x+z)'
          : `применено: ${history.join(' · ')}`,
      ),
    );
    drawSphere(canvas, theta, phi);
  };

  rerender();
  root.append(h('div', { class: 'widget-title' }, 'сфера Блоха: гейты как повороты'), body);
  root.classList.add('widget');
};

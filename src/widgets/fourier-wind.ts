/**
 * «Намотка» сигнала на окружность: точка x идёт на угол −2πkx/Q с радиусом
 * f(x). Центр масс намотки — коэффициент Фурье ĉ(k) с точностью до
 * нормировки: он отлетает от нуля ровно тогда, когда скорость намотки k
 * попадает в частоту сигнала. Внизу — |ĉ(k)| по всем скоростям.
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

const Q = 96; // отсчёты сигнала
const K_MAX = 16;

type Mode = 'single' | 'mix';

interface State {
  readonly r: number;
  readonly k: number;
  readonly mode: Mode;
}

const signal = (mode: Mode, r: number, x: number): number =>
  mode === 'single'
    ? 1 + Math.cos((2 * Math.PI * x) / r)
    : 1 + Math.cos((2 * Math.PI * x) / r) + 0.6 * Math.cos((4 * Math.PI * x) / r);

/** Центр масс намотки со скоростью k: (1/Q)·Σ f(x)·e^{−2πi kx/Q}. */
const centroid = (mode: Mode, r: number, k: number): readonly [number, number] => {
  let cx = 0;
  let cy = 0;
  for (let x = 0; x < Q; x += 1) {
    const f = signal(mode, r, x);
    const ang = (-2 * Math.PI * k * x) / Q;
    cx += f * Math.cos(ang);
    cy += f * Math.sin(ang);
  }
  return [cx / Q, cy / Q];
};

const CW = 520;
const CH = 330;
const SIG_H = 100; // верхняя полоса: сигнал
const SPEC_H = 84; // нижняя полоса: спектр

const draw = (canvas: HTMLCanvasElement, s: State): void => {
  const ctx = canvas.getContext('2d');
  if (ctx === null) return;
  ctx.fillStyle = CSS.ink;
  ctx.fillRect(0, 0, CW, CH);
  ctx.font = '12px "PT Mono", monospace';

  const fMax = s.mode === 'single' ? 2.05 : 2.7;

  // --- сигнал (сверху слева, до области круга) ---
  const sigW = CW - 210;
  ctx.fillStyle = CSS.paper;
  ctx.fillText(`сигнал f(x), период r = ${s.r}`, 8, 14);
  ctx.strokeStyle = CSS.pink;
  ctx.beginPath();
  for (let x = 0; x < Q; x += 1) {
    const px = 8 + (x / (Q - 1)) * (sigW - 16);
    const py = SIG_H - 6 - (signal(s.mode, s.r, x) / fMax) * (SIG_H - 30);
    if (x === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  // --- намотка (сверху справа) ---
  const ccx = CW - 105;
  const ccy = 105;
  const R = 88;
  ctx.strokeStyle = CSS.dim;
  ctx.beginPath();
  ctx.arc(ccx, ccy, R * 0.78, 0, 2 * Math.PI); // ориентир: радиус среднего
  ctx.stroke();
  ctx.fillStyle = CSS.paper;
  ctx.fillText(`намотка, k = ${s.k.toFixed(2)}`, ccx - 62, 14);

  // точки намотки, соединённые слабой линией
  ctx.strokeStyle = CSS.violet;
  ctx.beginPath();
  const pts: [number, number][] = [];
  for (let x = 0; x < Q; x += 1) {
    const f = signal(s.mode, s.r, x) / fMax;
    const ang = (-2 * Math.PI * s.k * x) / Q;
    const px = ccx + R * f * Math.cos(ang);
    const py = ccy + R * f * Math.sin(ang);
    pts.push([px, py]);
    if (x === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.fillStyle = CSS.acid;
  for (const [px, py] of pts) ctx.fillRect(Math.round(px) - 1, Math.round(py) - 1, 2, 2);

  // центр координат и центр масс
  const [mx, my] = centroid(s.mode, s.r, s.k);
  const cmx = ccx + (mx / fMax) * R;
  const cmy = ccy + (my / fMax) * R;
  ctx.strokeStyle = CSS.dim;
  ctx.beginPath();
  ctx.moveTo(ccx - 5, ccy);
  ctx.lineTo(ccx + 5, ccy);
  ctx.moveTo(ccx, ccy - 5);
  ctx.lineTo(ccx, ccy + 5);
  ctx.stroke();
  ctx.strokeStyle = CSS.pink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(ccx, ccy);
  ctx.lineTo(cmx, cmy);
  ctx.stroke();
  ctx.lineWidth = 1;
  ctx.fillStyle = CSS.pink;
  ctx.fillRect(Math.round(cmx) - 3, Math.round(cmy) - 3, 6, 6);

  // --- спектр |ĉ(k)| (нижняя полоса) ---
  const top = CH - SPEC_H;
  ctx.fillStyle = CSS.paper;
  ctx.fillText('|центр масс|(k) — спектр; метки: кратные Q/r', 8, top + 12);
  const magMax = fMax / 2 + 1.05; // |ĉ(0)| ≈ среднее ≈ 1, резонанс ≈ амплитуда/2
  // метки резонансов
  for (let mult = 1; mult * (Q / s.r) <= K_MAX; mult += 1) {
    const kx = 8 + ((mult * (Q / s.r)) / K_MAX) * (CW - 16);
    ctx.fillStyle = CSS.violet;
    ctx.fillRect(Math.round(kx), top + 16, 1, SPEC_H - 26);
  }
  ctx.strokeStyle = CSS.acid;
  ctx.beginPath();
  const steps = 320;
  for (let i = 0; i <= steps; i += 1) {
    const k = (i / steps) * K_MAX;
    const [x, y] = centroid(s.mode, s.r, k);
    const mag = Math.hypot(x, y);
    const px = 8 + (i / steps) * (CW - 16);
    const py = CH - 8 - (mag / magMax) * (SPEC_H - 26);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  // маркер текущего k
  const mk = 8 + (s.k / K_MAX) * (CW - 16);
  ctx.fillStyle = CSS.pink;
  ctx.fillRect(Math.round(mk) - 1, top + 16, 2, SPEC_H - 26);
};

export const mountFourierWind = (root: HTMLElement): void => {
  let state: State = { r: 12, k: 0, mode: 'single' };

  const canvas = h('canvas', { width: String(CW), height: String(CH) });
  const status = h('div', { class: 'widget-status' });

  // контролы создаются один раз: пересоздание в rerender обрывало бы
  // drag-жест слайдера (элемент заменялся бы под курсором)
  const slider = h('input', {
    type: 'range',
    min: '0',
    max: String(K_MAX),
    step: '0.02',
    value: String(state.k),
    style: 'width: 100%;',
    oninput: () => {
      state = { ...state, k: Number(slider.value) };
      rerender();
    },
  });

  const resButton = h('button', {
    onclick: () => {
      state = { ...state, k: Q / state.r };
      slider.value = String(state.k);
      rerender();
    },
  });

  const controls = h(
    'div',
    { class: 'widget-controls' },
    h(
      'label',
      {},
      'сигнал:',
      h(
        'select',
        {
          onchange: (e: Event) => {
            state = { ...state, mode: (e.target as HTMLSelectElement).value as Mode };
            rerender();
          },
        },
        h('option', { value: 'single', selected: true }, 'один период r'),
        h('option', { value: 'mix' }, 'смесь: r и r/2'),
      ),
    ),
    h(
      'label',
      {},
      'r =',
      h('input', {
        type: 'number',
        min: '6',
        max: '32',
        value: String(state.r),
        onchange: (e: Event) => {
          const v = Number((e.target as HTMLInputElement).value);
          if (Number.isInteger(v) && v >= 6 && v <= 32) {
            state = { ...state, r: v };
            rerender();
          }
        },
      }),
    ),
    h('label', { style: 'flex: 1 1 12em;' }, 'скорость k:', slider),
    resButton,
  );

  const rerender = (): void => {
    const { r, k, mode } = state;
    const [x, y] = centroid(mode, r, k);
    const mag = Math.hypot(x, y);
    const res = Q / r;

    resButton.textContent = `к резонансу k = ${res.toFixed(1)}`;
    replaceChildrenOf(
      status,
      h('span', { class: 'hl' }, `k = ${k.toFixed(2)} · |центр масс| = ${mag.toFixed(3)}`),
      ` · резонанс на k = Q/r = ${res.toFixed(2)}${mode === 'mix' ? ` и ${(2 * res).toFixed(2)}` : ''}`,
    );
    draw(canvas, state);
  };

  rerender();
  root.append(
    h('div', { class: 'widget-title' }, 'Фурье как намотка: центр масс против скорости'),
    h(
      'div',
      { class: 'widget-body' },
      controls,
      canvas,
      status,
      h(
        'div',
        { class: 'widget-hint' },
        'мимо резонанса точки намотки распределяются по кругу и гасятся; в резонансе виток ложится на виток и центр масс отлетает. Пик при k = 0 — среднее сигнала. DFT берёт только целые k',
      ),
    ),
  );
  root.classList.add('widget');
};

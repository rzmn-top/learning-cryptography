/**
 * QFT периодического состояния: сверху — гребёнка амплитуд с периодом r
 * и случайным сдвигом, снизу — распределение после QFT. Пики стоят
 * на кратных Q/r и не зависят от сдвига — это и извлекает Шор.
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

const Q = 128; // размер регистра 2^7
const CW = 520;
const CH = 240;

interface State {
  readonly r: number;
  readonly x0: number;
}

/** P(j) после QFT гребёнки {x0 + i·r} — от сдвига x0 не зависит. */
const qftDistribution = (r: number, x0: number): readonly number[] => {
  const m = Math.ceil((Q - x0) / r);
  const out: number[] = [];
  for (let j = 0; j < Q; j += 1) {
    let re = 0;
    let im = 0;
    for (let i = 0; i < m; i += 1) {
      const ang = (2 * Math.PI * j * (x0 + i * r)) / Q;
      re += Math.cos(ang);
      im += Math.sin(ang);
    }
    out.push((re * re + im * im) / (m * Q));
  }
  return out;
};

const draw = (canvas: HTMLCanvasElement, s: State): void => {
  const ctx = canvas.getContext('2d');
  if (ctx === null) return;
  ctx.fillStyle = CSS.ink;
  ctx.fillRect(0, 0, CW, CH);
  const mid = CH / 2;
  const slot = CW / Q;

  // верх: гребёнка |ψ_x|
  ctx.fillStyle = CSS.paper;
  ctx.font = '12px "PT Mono", monospace';
  ctx.fillText(`до QFT: |x⟩ на x = ${s.x0} + i·${s.r}`, 8, 16);
  for (let x = s.x0; x < Q; x += s.r) {
    ctx.fillStyle = CSS.pink;
    ctx.fillRect(Math.round(x * slot), 24, Math.max(2, slot - 1), mid - 34);
  }

  // низ: P(j) после QFT
  const dist = qftDistribution(s.r, s.x0);
  const maxP = Math.max(...dist);
  ctx.fillStyle = CSS.paper;
  ctx.fillText('после QFT: P(j), метки — кратные Q/r', 8, mid + 14);
  // метки кратных Q/r
  for (let sMul = 0; sMul < s.r; sMul += 1) {
    const j = Math.round((sMul * Q) / s.r) % Q;
    ctx.fillStyle = CSS.violet;
    ctx.fillRect(Math.round(j * slot), mid + 20, 1, CH - mid - 30);
  }
  for (let j = 0; j < Q; j += 1) {
    const p = (dist[j] ?? 0) / maxP;
    const bh = Math.round(p * (CH - mid - 34));
    ctx.fillStyle = CSS.acid;
    ctx.fillRect(Math.round(j * slot), CH - 10 - bh, Math.max(2, slot - 1), bh);
  }
};

export const mountQftPeriod = (root: HTMLElement): void => {
  let state: State = { r: 8, x0: 3 };

  const canvas = h('canvas', { width: String(CW), height: String(CH) });
  const body = h('div', { class: 'widget-body' });

  const rerender = (): void => {
    const { r } = state;
    const divides = Q % r === 0;

    const controls = h(
      'div',
      { class: 'widget-controls' },
      h(
        'label',
        {},
        'период r =',
        h('input', {
          type: 'number',
          min: '2',
          max: '32',
          value: String(r),
          onchange: (e: Event) => {
            const v = Number((e.target as HTMLInputElement).value);
            if (Number.isInteger(v) && v >= 2 && v <= 32) {
              state = { r: v, x0: Math.floor(Math.random() * v) };
              rerender();
            }
          },
        }),
      ),
      h(
        'button',
        {
          onclick: () => {
            state = { ...state, x0: Math.floor(Math.random() * state.r) };
            rerender();
          },
        },
        'случайный сдвиг',
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
          divides
            ? `r = ${r} делит Q = ${Q}: ровно ${r} пиков на кратных Q/r = ${Q / r}`
            : `r = ${r} не делит Q = ${Q}: пики размазаны около кратных Q/r ≈ ${(Q / r).toFixed(1)}`,
        ),
      ),
      h(
        'div',
        { class: 'widget-hint' },
        'сдвиг x₀ меняет верхнюю гребёнку и фазы амплитуд, но не |амплитуды|² внизу: период читается, сдвиг — нет',
      ),
    );
    draw(canvas, state);
  };

  rerender();
  root.append(h('div', { class: 'widget-title' }, 'QFT: период гребёнки → позиции пиков'), body);
  root.classList.add('widget');
};

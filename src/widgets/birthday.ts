/**
 * Симулятор парадокса дней рождения: сколько случайных выборок из N
 * нужно до первого повтора. Гистограмма по многим прогонам против
 * теоретического среднего √(πN/2) ≈ 1.2533·√N.
 */

import { h, replaceChildrenOf } from '../ui/dom';

interface State {
  readonly logN: number; // N = 2^logN
  readonly results: readonly number[]; // число выборок до коллизии в каждом прогоне
}

const TRIALS_PER_TICK = 40;
const TOTAL_TRIALS = 400;

const CSS = { ink: '#16130e', acid: '#b8e600', pink: '#ff2f92', soft: '#4c463b' } as const;

const runTrial = (n: number): number => {
  const seen = new Set<number>();
  for (let k = 1; ; k += 1) {
    const v = Math.floor(Math.random() * n);
    if (seen.has(v)) return k;
    seen.add(v);
  }
};

const drawHistogram = (canvas: HTMLCanvasElement, results: readonly number[], n: number): void => {
  const ctx = canvas.getContext('2d');
  if (ctx === null) return;
  const w = canvas.width;
  const hgt = canvas.height;
  ctx.clearRect(0, 0, w, hgt);
  if (results.length === 0) return;

  const maxK = Math.max(...results);
  const bins = 40;
  const binW = maxK / bins;
  const counts = new Array<number>(bins).fill(0);
  for (const k of results) {
    const b = Math.min(bins - 1, Math.floor(k / binW));
    counts[b] = (counts[b] ?? 0) + 1;
  }
  const maxCount = Math.max(...counts);

  const pad = 24;
  counts.forEach((c, b) => {
    const x = pad + (b / bins) * (w - 2 * pad);
    const barH = (c / maxCount) * (hgt - 2 * pad);
    ctx.fillStyle = CSS.acid;
    ctx.fillRect(x, hgt - pad - barH, (w - 2 * pad) / bins - 1, barH);
    ctx.strokeStyle = CSS.ink;
    ctx.strokeRect(x, hgt - pad - barH, (w - 2 * pad) / bins - 1, barH);
  });

  // теоретическое среднее
  const theory = Math.sqrt((Math.PI * n) / 2);
  const tx = pad + (theory / maxK) * (w - 2 * pad);
  ctx.strokeStyle = CSS.pink;
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(tx, pad / 2);
  ctx.lineTo(tx, hgt - pad);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = CSS.pink;
  ctx.font = '14px VT323, monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`√(πN/2) ≈ ${theory.toFixed(0)}`, tx + 6, pad);

  ctx.fillStyle = CSS.soft;
  ctx.textAlign = 'right';
  ctx.fillText(`${maxK}`, w - 4, hgt - 8);
  ctx.textAlign = 'left';
  ctx.fillText('0', pad, hgt - 8);
};

export const mountBirthday = (root: HTMLElement): void => {
  let state: State = { logN: 16, results: [] };
  let timer: number | undefined;

  const canvas = h('canvas', { width: '520', height: '220' });
  const body = h('div', { class: 'widget-body' });

  const stopAnim = (): void => {
    if (timer !== undefined) window.clearInterval(timer);
    timer = undefined;
  };

  const rerender = (): void => {
    const n = 2 ** state.logN;
    const mean =
      state.results.length === 0
        ? undefined
        : state.results.reduce((a, b) => a + b, 0) / state.results.length;

    const controls = h(
      'div',
      { class: 'widget-controls' },
      h(
        'label',
        {},
        'N = 2^',
        h(
          'select',
          {
            onchange: (e: Event) => {
              stopAnim();
              state = { logN: Number((e.target as HTMLSelectElement).value), results: [] };
              rerender();
            },
          },
          ...[8, 12, 16, 20].map((v) =>
            h('option', { value: String(v), selected: v === state.logN }, String(v)),
          ),
        ),
      ),
      h(
        'button',
        {
          onclick: () => {
            stopAnim();
            state = { ...state, results: [] };
            timer = window.setInterval(() => {
              if (state.results.length >= TOTAL_TRIALS) {
                stopAnim();
                return;
              }
              const fresh = Array.from({ length: TRIALS_PER_TICK }, () => runTrial(n));
              state = { ...state, results: [...state.results, ...fresh] };
              rerender();
            }, 60);
          },
        },
        `▶ ${TOTAL_TRIALS} прогонов`,
      ),
    );

    replaceChildrenOf(
      body,
      controls,
      canvas,
      h(
        'div',
        { class: 'widget-status' },
        mean === undefined
          ? `выборки из N = ${n.toLocaleString('ru')}: сколько шагов до первого повтора?`
          : h(
              'span',
              { class: 'hl' },
              `среднее по ${state.results.length} прогонам: ${mean.toFixed(0)} ≈ 1.25·√N = ${(1.2533 * Math.sqrt(n)).toFixed(0)}`,
            ),
      ),
      h('div', { class: 'widget-hint' }, 'коллизия наступает через ~√N выборок, а не N/2 — это и есть «парадокс»'),
    );
    drawHistogram(canvas, state.results, n);
  };

  rerender();
  root.append(h('div', { class: 'widget-title' }, 'парадокс дней рождения'), body);
  root.classList.add('widget');
};

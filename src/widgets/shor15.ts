/**
 * Алгоритм Шора на N = 15 по шагам: выбор a, период f(k) = a^k mod 15,
 * измерение после QFT (честная выборка из точного распределения),
 * непрерывные дроби, извлечение множителей.
 */

import { h, replaceChildrenOf } from '../ui/dom';
import { modPow, gcd, multOrder } from '../lib/math/mod';
import { convergents, periodCandidate } from '../lib/math/contfrac';

const CSS = {
  ink: '#16130e',
  acid: '#b8e600',
  pink: '#ff2f92',
  violet: '#6a1fd0',
  paper: '#f4efe2',
} as const;

const N = 15;
const Q = 256; // 2^8 ≥ N²

const CHOICES: readonly number[] = [2, 4, 7, 8, 11, 13, 14];

interface State {
  readonly a: number;
  readonly step: number; // 0..4
  readonly k0: number; // сдвиг гребёнки после измерения второго регистра
  readonly j: number; // исход измерения после QFT
}

/** Точное распределение исхода j для гребёнки {k0 + i·r} ⊂ [0, Q). */
const distribution = (r: number, k0: number): readonly number[] => {
  const m = Math.ceil((Q - k0) / r);
  const out: number[] = [];
  for (let j = 0; j < Q; j += 1) {
    let re = 0;
    let im = 0;
    for (let i = 0; i < m; i += 1) {
      const ang = (2 * Math.PI * j * i * r) / Q;
      re += Math.cos(ang);
      im += Math.sin(ang);
    }
    out.push((re * re + im * im) / (m * Q));
  }
  const sum = out.reduce((s, v) => s + v, 0);
  return out.map((v) => v / sum);
};

const sample = (dist: readonly number[]): number => {
  let u = Math.random();
  for (let j = 0; j < dist.length; j += 1) {
    u -= dist[j] ?? 0;
    if (u <= 0) return j;
  }
  return dist.length - 1;
};

const CW = 520;
const CH = 150;

const drawDist = (canvas: HTMLCanvasElement, dist: readonly number[], j: number): void => {
  const ctx = canvas.getContext('2d');
  if (ctx === null) return;
  ctx.fillStyle = CSS.ink;
  ctx.fillRect(0, 0, CW, CH);
  const slot = CW / dist.length;
  const maxP = Math.max(...dist);
  dist.forEach((p, i) => {
    const bh = Math.round((p / maxP) * (CH - 34));
    ctx.fillStyle = i === j ? CSS.pink : CSS.acid;
    ctx.fillRect(Math.round(i * slot), CH - 12 - bh, Math.max(2, slot - 1), bh);
  });
  ctx.fillStyle = CSS.paper;
  ctx.font = '12px "PT Mono", monospace';
  ctx.fillText(`P(j) после QFT · измерено j = ${j}`, 8, 16);
};

export const mountShor15 = (root: HTMLElement): void => {
  const fresh = (a: number): State => {
    const r = multOrder(a, N);
    const k0 = Math.floor(Math.random() * r);
    return { a, step: 0, k0, j: sample(distribution(r, k0)) };
  };
  let state: State = fresh(7);

  const canvas = h('canvas', { width: String(CW), height: String(CH) });
  const body = h('div', { class: 'widget-body' });

  const rerender = (): void => {
    const { a, step, k0, j } = state;
    const r = multOrder(a, N);
    const dist = distribution(r, k0);
    const cand = periodCandidate(j, Q, N);
    const good = cand !== undefined && modPow(a, cand, N) === 1 && cand % 2 === 0
      && modPow(a, cand / 2, N) !== N - 1;

    const lines: HTMLElement[] = [];
    lines.push(
      h('div', {}, `шаг 0 · параметры: N = ${N}, a = ${a}, gcd(a, N) = ${gcd(a, N)} — взаимно просты, работаем`),
    );
    if (step >= 1) {
      const row = Array.from({ length: 9 }, (_, k) => modPow(a, k, N)).join(', ');
      lines.push(
        h('div', {}, `шаг 1 · f(k) = ${a}^k mod 15: ${row}, … — период r = ${r} (машине он неизвестен)`),
      );
    }
    if (step >= 2) {
      lines.push(
        h(
          'div',
          {},
          `шаг 2 · регистр из ${Math.log2(Q)} кубитов: (1/√${Q})·Σ|k⟩|${a}^k mod 15⟩; измеряем второй регистр → ${modPow(a, k0, N)}; первый коллапсирует в гребёнку k = ${k0} + i·${r}`,
        ),
      );
    }
    if (step >= 3) {
      lines.push(
        h('div', {}, `шаг 3 · QFT первого регистра и измерение → j = ${j} (пики у кратных Q/r = ${(Q / r).toFixed(0)})`),
      );
    }
    if (step >= 4) {
      const cs = convergents(j, Q)
        .map((c) => `${c.h}/${c.k}`)
        .join(', ');
      lines.push(
        h('div', {}, `шаг 4 · j/Q = ${j}/${Q}, подходящие дроби: ${cs || '—'}; кандидат r' = ${cand ?? 'нет (j = 0)'}`),
      );
      if (cand === undefined || modPow(a, cand, N) !== 1) {
        lines.push(h('div', {}, `неудача: r' не является периодом — повторяем измерение (кнопка ниже)`));
      } else if (!good) {
        lines.push(h('div', {}, `неудача: r' = ${cand} нечётен или a^(r'/2) ≡ −1 — новое a или новое измерение`));
      } else {
        const half = modPow(a, cand / 2, N);
        const p = gcd(half - 1, N);
        const q = gcd(half + 1, N);
        lines.push(
          h(
            'div',
            {},
            `шаг 5 · r = ${cand} чётен, ${a}^${cand / 2} = ${half} mod 15 ≠ −1: gcd(${half}−1, 15) = ${p}, gcd(${half}+1, 15) = ${q} → 15 = ${p} · ${q}`,
          ),
        );
      }
    }

    const controls = h(
      'div',
      { class: 'widget-controls' },
      h(
        'label',
        {},
        'a =',
        h(
          'select',
          {
            onchange: (e: Event) => {
              state = fresh(Number((e.target as HTMLSelectElement).value));
              rerender();
            },
          },
          ...CHOICES.map((v) => h('option', { value: String(v), selected: v === a }, String(v))),
        ),
      ),
      h(
        'button',
        {
          onclick: () => {
            state = { ...state, step: Math.min(4, step + 1) };
            rerender();
          },
          disabled: step >= 4,
        },
        'шаг →',
      ),
      h(
        'button',
        {
          onclick: () => {
            const nk0 = Math.floor(Math.random() * r);
            state = { ...state, k0: nk0, j: sample(distribution(r, nk0)) };
            rerender();
          },
          disabled: step < 3,
        },
        'перемерить',
      ),
      h(
        'button',
        {
          onclick: () => {
            state = fresh(a);
            rerender();
          },
        },
        'сброс',
      ),
    );

    replaceChildrenOf(
      body,
      controls,
      h('div', { class: 'phi-derivation' }, ...lines),
      ...(step >= 3 ? [canvas] : []),
      h(
        'div',
        { class: 'widget-status' },
        h(
          'span',
          { class: 'hl' },
          step < 4
            ? `квантовая часть даёт j ≈ s·Q/r; классическая — восстанавливает r и множители`
            : good
              ? `успех: период найден за одно квантовое измерение`
              : `так выглядит негарантированность Шора: повторы — часть алгоритма`,
        ),
      ),
      h(
        'div',
        { class: 'widget-hint' },
        'вероятность каждого j считается точно по формуле из сноски о пиках; «перемерить» берёт новую выборку',
      ),
    );
    if (step >= 3) drawDist(canvas, dist, j);
  };

  rerender();
  root.append(h('div', { class: 'widget-title' }, 'алгоритм Шора: N = 15 по шагам'), body);
  root.classList.add('widget');
};

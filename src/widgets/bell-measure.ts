/**
 * Измерение пары кубитов: запутанное состояние |Φ⁺⟩ против
 * независимой пары H|0⟩ ⊗ H|0⟩. Одиночные измерения и серия
 * из 100 опытов со счётчиками исходов.
 */

import { h, replaceChildrenOf } from '../ui/dom';
import {
  QState,
  measureQubit,
  cabs2,
  fmtComplex,
  cpx,
  CZERO,
} from '../lib/math/quantum';

type Mode = 'bell' | 'prod';

const SQ = Math.SQRT1_2;

const freshState = (mode: Mode): QState =>
  mode === 'bell'
    ? [cpx(SQ), CZERO, CZERO, cpx(SQ)]
    : [cpx(0.5), cpx(0.5), cpx(0.5), cpx(0.5)];

type Counts = readonly [number, number, number, number];

interface State {
  readonly mode: Mode;
  readonly q: QState;
  readonly a: 0 | 1 | undefined;
  readonly b: 0 | 1 | undefined;
  readonly counts: Counts;
}

const bump = (counts: Counts, a: 0 | 1, b: 0 | 1): Counts => {
  const idx = a * 2 + b;
  return counts.map((v, i) => (i === idx ? v + 1 : v)) as unknown as Counts;
};

export const mountBellMeasure = (root: HTMLElement): void => {
  let state: State = {
    mode: 'bell',
    q: freshState('bell'),
    a: undefined,
    b: undefined,
    counts: [0, 0, 0, 0],
  };

  const body = h('div', { class: 'widget-body' });

  const measure = (target: 0 | 1): void => {
    const r = measureQubit(state.q, 2, target, Math.random());
    const a = target === 0 ? r.outcome : state.a;
    const b = target === 1 ? r.outcome : state.b;
    const counts =
      a !== undefined && b !== undefined ? bump(state.counts, a, b) : state.counts;
    state = { ...state, q: r.state, a, b, counts };
    rerender();
  };

  const series = (): void => {
    let counts = state.counts;
    for (let i = 0; i < 100; i += 1) {
      const first = measureQubit(freshState(state.mode), 2, 0, Math.random());
      const second = measureQubit(first.state, 2, 1, Math.random());
      counts = bump(counts, first.outcome, second.outcome);
    }
    state = { ...state, counts };
    rerender();
  };

  const rerender = (): void => {
    const { mode, q, a, b, counts } = state;
    const total = counts.reduce((s, v) => s + v, 0);

    const controls = h(
      'div',
      { class: 'widget-controls' },
      h(
        'label',
        {},
        'пара:',
        h(
          'select',
          {
            onchange: (e: Event) => {
              const m = (e.target as HTMLSelectElement).value as Mode;
              state = { mode: m, q: freshState(m), a: undefined, b: undefined, counts: [0, 0, 0, 0] };
              rerender();
            },
          },
          h('option', { value: 'bell', selected: mode === 'bell' }, '|Φ⁺⟩ = (|00⟩+|11⟩)/√2'),
          h('option', { value: 'prod', selected: mode === 'prod' }, 'H|0⟩ ⊗ H|0⟩ — незапутанная'),
        ),
      ),
      h('button', { onclick: () => measure(0), disabled: a !== undefined }, 'измерить A'),
      h('button', { onclick: () => measure(1), disabled: b !== undefined }, 'измерить B'),
      h(
        'button',
        {
          onclick: () => {
            state = { ...state, q: freshState(mode), a: undefined, b: undefined };
            rerender();
          },
        },
        'новая пара',
      ),
      h('button', { onclick: series }, 'серия ×100'),
    );

    const ampLine = q
      .map((amp, i) =>
        cabs2(amp) > 1e-9 ? `(${fmtComplex(amp)})·|${i.toString(2).padStart(2, '0')}⟩` : undefined,
      )
      .filter((s): s is string => s !== undefined)
      .join(' + ');

    const countRow = (i: number): HTMLElement => {
      const label = `${i >> 1}${i & 1}`;
      const v = counts[i] ?? 0;
      const frac = total === 0 ? 0 : v / total;
      return h(
        'div',
        {},
        `P(${label}) ≈ ${total === 0 ? '—' : frac.toFixed(2)} · ${'█'.repeat(Math.round(frac * 24))} ${v}`,
      );
    };

    replaceChildrenOf(
      body,
      controls,
      h(
        'div',
        { class: 'phi-derivation' },
        h('div', {}, `состояние: ${ampLine}`),
        h(
          'div',
          {},
          `исход: A = ${a ?? '?'} · B = ${b ?? '?'}`,
        ),
        ...(total > 0 ? [0, 1, 2, 3].map(countRow) : []),
      ),
      h(
        'div',
        { class: 'widget-status' },
        h(
          'span',
          { class: 'hl' },
          mode === 'bell'
            ? 'P(00) = P(11) = 1/2, P(01) = P(10) = 0: исходы совпадают всегда'
            : 'все четыре исхода по 1/4: измерение A не сужает B',
        ),
      ),
      h(
        'div',
        { class: 'widget-hint' },
        mode === 'bell'
          ? 'после измерения A состояние коллапсирует: B предопределён ещё до своего измерения'
          : 'незапутанная пара: та же равномерность одиночных исходов, но без корреляции',
      ),
    );
  };

  rerender();
  root.append(h('div', { class: 'widget-title' }, 'запутанная пара против независимой'), body);
  root.classList.add('widget');
};

/**
 * Пошаговый расширенный алгоритм Евклида: прямой ход (деления с остатком)
 * и обратный ход (коэффициенты Безу). Если gcd = 1 — обратный по модулю.
 */

import { h, replaceChildrenOf } from '../ui/dom';
import { numParam } from '../ui/widgets';
import { euclidSteps, bezoutTrace } from '../lib/math/euclid';
import { mod } from '../lib/math/mod';

interface State {
  readonly a: number;
  readonly b: number;
}

const table = (headers: readonly string[], rows: readonly (readonly (string | number)[])[]): HTMLTableElement =>
  h(
    'table',
    { class: 'steps' },
    h('tr', {}, ...headers.map((t) => h('th', {}, t))),
    ...rows.map((r) => h('tr', {}, ...r.map((c) => h('td', {}, String(c))))),
  );

export const mountEuclidTable = (root: HTMLElement): void => {
  let state: State = { a: numParam(root, 'a', 240), b: numParam(root, 'b', 46) };

  const body = h('div', { class: 'widget-body' });

  const rerender = (): void => {
    const { a, b } = state;
    const fwd = euclidSteps(a, b);
    const back = bezoutTrace(a, b);
    const last = back[back.length - 1];
    const g = fwd.length === 0 ? a : fwd[fwd.length - 1]?.b ?? a;

    const input = (label: string, value: number, set: (v: number) => State): HTMLElement =>
      h(
        'label',
        {},
        label,
        h('input', {
          type: 'number',
          min: '1',
          max: '99999',
          value: String(value),
          onchange: (e: Event) => {
            const v = Number((e.target as HTMLInputElement).value);
            if (Number.isInteger(v) && v >= 1 && v <= 99999) {
              state = set(v);
              rerender();
            }
          },
        }),
      );

    const controls = h(
      'div',
      { class: 'widget-controls' },
      input('a =', a, (v) => ({ ...state, a: v })),
      input('b =', b, (v) => ({ ...state, b: v })),
    );

    const forward = table(
      ['a', 'b', 'q = ⌊a/b⌋', 'r = a − q·b'],
      fwd.map((s) => [s.a, s.b, s.q, s.r]),
    );

    const backward = table(
      ['a', 'b', 'x', 'y', 'a·x + b·y'],
      back.map((r) => [r.a, r.b, r.x, r.y, r.a * r.x + r.b * r.y]),
    );

    const status =
      last === undefined
        ? h('div', { class: 'widget-status' })
        : h(
            'div',
            { class: 'widget-status' },
            h('span', { class: 'hl' }, `gcd(${a}, ${b}) = ${g} = ${a}·(${last.x}) + ${b}·(${last.y})`),
            g === 1 ? ` ⇒ ${a}⁻¹ ≡ ${mod(last.x, b)} (mod ${b})` : ' ⇒ обратного нет (gcd ≠ 1)',
          );

    replaceChildrenOf(
      body,
      controls,
      h('div', { class: 'steps-pair' },
        h('div', {}, h('div', { class: 'steps-caption' }, 'прямой ход'), forward),
        h('div', {}, h('div', { class: 'steps-caption' }, 'обратный ход: a·x + b·y = gcd'), backward),
      ),
      status,
      h('div', { class: 'widget-hint' }, 'обратный ход читается снизу вверх: база gcd(g, 0) = g·1 + 0·0, далее x ← y, y ← x − q·y'),
    );
  };

  rerender();
  root.append(h('div', { class: 'widget-title' }, 'расширенный алгоритм Евклида'), body);
  root.classList.add('widget');
};

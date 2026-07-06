/**
 * Калькулятор функции Эйлера: разложение n, формула n·∏(1 − 1/p),
 * подсветка обратимых элементов в строке 0..n−1 (для малых n).
 */

import { h, replaceChildrenOf } from '../ui/dom';
import { numParam } from '../ui/widgets';
import { factorize, phiFromFactors } from '../lib/math/factor';
import { gcd, range } from '../lib/math/mod';

interface State {
  readonly n: number;
}

export const mountPhiCalc = (root: HTMLElement): void => {
  let state: State = { n: numParam(root, 'n', 36) };

  const body = h('div', { class: 'widget-body' });

  const rerender = (): void => {
    const { n } = state;
    const factors = factorize(n);
    const phi = phiFromFactors(factors);
    const units = range(n).filter((a) => gcd(a, n) === 1);

    const controls = h(
      'div',
      { class: 'widget-controls' },
      h(
        'label',
        {},
        'n =',
        h('input', {
          type: 'number',
          min: '2',
          max: '9999',
          value: String(n),
          onchange: (e: Event) => {
            const v = Number((e.target as HTMLInputElement).value);
            if (Number.isInteger(v) && v >= 2 && v <= 9999) {
              state = { n: v };
              rerender();
            }
          },
        }),
      ),
    );

    const factorStr = factors.map(({ p, k }) => (k === 1 ? `${p}` : `${p}^${k}`)).join(' · ');
    const formulaStr = factors.map(({ p, k }) => `(${p}^${k} − ${p}^${k - 1})`).join(' · ');
    const valuesStr = factors.map(({ p, k }) => String(p ** k - p ** (k - 1))).join(' · ');

    const derivation = h(
      'div',
      { class: 'phi-derivation' },
      h('div', {}, `n = ${factorStr}`),
      h('div', {}, `φ(n) = ${formulaStr} = ${valuesStr} = ${phi}`),
    );

    const strip =
      n <= 72
        ? h(
            'div',
            { class: 'unit-strip' },
            ...range(n).map((a) =>
              h('span', { class: gcd(a, n) === 1 ? 'unit' : 'nonunit' }, String(a)),
            ),
          )
        : h(
            'div',
            { class: 'widget-hint' },
            `строка 0..n−1 показывается для n ≤ 72; обратимых элементов: ${units.length}`,
          );

    replaceChildrenOf(
      body,
      controls,
      derivation,
      strip,
      h(
        'div',
        { class: 'widget-status' },
        h('span', { class: 'hl' }, `|Z_${n}*| = ${units.length} = φ(${n})`),
        n <= 72 ? ' — подсвечены элементы с gcd(a, n) = 1' : '',
      ),
    );
  };

  rerender();
  root.append(h('div', { class: 'widget-title' }, 'функция Эйлера φ(n)'), body);
  root.classList.add('widget');
};

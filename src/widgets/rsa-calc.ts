/**
 * RSA на малых числах: полный цикл от выбора простых до расшифрования,
 * со всеми промежуточными значениями. Отдельно показано, что видит противник.
 */

import { h, replaceChildrenOf } from '../ui/dom';
import { numParam } from '../ui/widgets';
import { gcd, modInverse, modPow } from '../lib/math/mod';
import { isPrime } from '../lib/math/factor';

interface State {
  readonly p: number;
  readonly q: number;
  readonly e: number;
  readonly m: number;
}

export const mountRsaCalc = (root: HTMLElement): void => {
  let state: State = {
    p: numParam(root, 'p', 61),
    q: numParam(root, 'q', 53),
    e: numParam(root, 'e', 17),
    m: numParam(root, 'm', 1234),
  };

  const body = h('div', { class: 'widget-body' });

  const rerender = (): void => {
    const { p, q, e, m } = state;
    const problems: string[] = [];
    if (!isPrime(p)) problems.push(`p = ${p} не простое`);
    if (!isPrime(q)) problems.push(`q = ${q} не простое`);
    if (p === q) problems.push('p = q — модуль факторизуется извлечением корня');

    const n = p * q;
    const phi = (p - 1) * (q - 1);
    if (problems.length === 0 && gcd(e, phi) !== 1) {
      problems.push(`gcd(e, φ) = ${gcd(e, phi)} ≠ 1 — e необратим по модулю φ`);
    }
    if (m >= n) problems.push(`m = ${m} ≥ n — сообщение должно быть меньше модуля`);

    const input = (label: string, value: number, max: number, set: (v: number) => State): HTMLElement =>
      h(
        'label',
        {},
        label,
        h('input', {
          type: 'number',
          min: '2',
          max: String(max),
          value: String(value),
          onchange: (ev: Event) => {
            const v = Number((ev.target as HTMLInputElement).value);
            if (Number.isInteger(v) && v >= 0 && v <= max) {
              state = set(v);
              rerender();
            }
          },
        }),
      );

    const controls = h(
      'div',
      { class: 'widget-controls' },
      input('p =', p, 499, (v) => ({ ...state, p: v })),
      input('q =', q, 499, (v) => ({ ...state, q: v })),
      input('e =', e, 9999, (v) => ({ ...state, e: v })),
      input('m =', m, 999999, (v) => ({ ...state, m: v })),
    );

    if (problems.length > 0) {
      replaceChildrenOf(
        body,
        controls,
        h('div', { class: 'widget-status' }, `⚠ ${problems.join('; ')}`),
      );
      return;
    }

    const d = modInverse(e, phi);
    if (d === undefined) return;
    const c = modPow(m, e, n);
    const back = modPow(c, d, n);

    const lines = h(
      'div',
      { class: 'phi-derivation' },
      h('div', {}, `n = p·q = ${p}·${q} = ${n}`),
      h('div', {}, `φ(n) = (p−1)(q−1) = ${p - 1}·${q - 1} = ${phi}`),
      h('div', {}, `d = e⁻¹ mod φ = ${e}⁻¹ mod ${phi} = ${d}   (расширенный Евклид, гл. 2)`),
      h('div', {}, `шифрование: c = m^e mod n = ${m}^${e} mod ${n} = ${c}`),
      h('div', {}, `расшифрование: c^d mod n = ${c}^${d} mod ${n} = ${back}`),
    );

    replaceChildrenOf(
      body,
      controls,
      lines,
      h(
        'div',
        { class: 'widget-status' },
        back === m
          ? h('span', { class: 'hl' }, `m^(ed) = m: ${back} = ${m} ✓ (теорема из гл. 2)`)
          : `ошибка: ${back} ≠ ${m}`,
      ),
      h(
        'div',
        { class: 'widget-hint' },
        `противник видит только (n, e, c) = (${n}, ${e}, ${c}); для d ему нужна φ(${n}), то есть факторизация`,
      ),
    );
  };

  rerender();
  root.append(h('div', { class: 'widget-title' }, 'RSA на малых числах'), body);
  root.classList.add('widget');
};

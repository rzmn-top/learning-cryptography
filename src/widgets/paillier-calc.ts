/**
 * Калькулятор Пайе: два числа шифруются, их шифртексты ПЕРЕМНОЖАЮТСЯ —
 * и расшифровка даёт СУММУ открытых текстов. Плюс умножение
 * зашифрованного числа на открытый скаляр.
 */

import { h, replaceChildrenOf } from '../ui/dom';
import {
  paillierKeygen,
  paillierEncrypt,
  paillierDecrypt,
  paillierAdd,
  paillierScale,
  paillierRandomR,
  PaillierKeys,
} from '../lib/crypto/paillier';

const P = 47n;
const Q = 59n;

interface State {
  readonly keys: PaillierKeys;
  readonly m1: number;
  readonly m2: number;
  readonly k: number;
}

export const mountPaillierCalc = (root: HTMLElement): void => {
  let state: State = { keys: paillierKeygen(P, Q), m1: 1200, m2: 573, k: 3 };

  const derivation = h('div', { class: 'phi-derivation' });
  const status = h('div', { class: 'widget-status' });

  const numInput = (value: number, set: (v: number) => void): HTMLInputElement => {
    const input = h('input', {
      type: 'number',
      min: '0',
      max: String(Number(state.keys.n) - 1),
      value: String(value),
      onchange: () => {
        const v = Number(input.value);
        if (Number.isInteger(v) && v >= 0 && v < Number(state.keys.n)) {
          set(v);
          rerender();
        }
      },
    });
    return input;
  };

  const controls = h(
    'div',
    { class: 'widget-controls' },
    h('label', {}, 'm₁ =', numInput(state.m1, (v) => { state = { ...state, m1: v }; })),
    h('label', {}, 'm₂ =', numInput(state.m2, (v) => { state = { ...state, m2: v }; })),
    h('label', {}, 'скаляр k =', numInput(state.k, (v) => { state = { ...state, k: v }; })),
    h(
      'button',
      {
        onclick: () => rerender(), // новые случайные r
      },
      'перешифровать (новые r)',
    ),
  );

  const rerender = (): void => {
    const { keys, m1, m2, k } = state;
    const r1 = paillierRandomR(keys, Math.random);
    const r2 = paillierRandomR(keys, Math.random);
    const c1 = paillierEncrypt(keys, BigInt(m1), r1);
    const c2 = paillierEncrypt(keys, BigInt(m2), r2);
    const cSum = paillierAdd(keys, c1, c2);
    const cScaled = paillierScale(keys, c1, BigInt(k));
    const sum = paillierDecrypt(keys, cSum);
    const scaled = paillierDecrypt(keys, cScaled);
    const n = Number(keys.n);

    replaceChildrenOf(
      derivation,
      h('div', {}, `ключи: p = ${P}, q = ${Q}, n = ${keys.n}, n² = ${keys.n2}, g = n+1, λ = ${keys.lambda}`),
      h('div', {}, `E(m₁): c₁ = (n+1)^${m1}·r₁^n mod n² = ${c1}  (r₁ = ${r1})`),
      h('div', {}, `E(m₂): c₂ = (n+1)^${m2}·r₂^n mod n² = ${c2}  (r₂ = ${r2})`),
      h('div', {}, `произведение шифртекстов: c₁·c₂ mod n² = ${cSum}`),
      h('div', {}, `D(c₁·c₂) = ${sum} — это ${m1} + ${m2} mod ${n} ${Number(sum) === (m1 + m2) % n ? '✓' : '✗'}`),
      h('div', {}, `степень шифртекста: c₁^${k} mod n² → D = ${scaled} — это ${k}·${m1} mod ${n} ${Number(scaled) === (k * m1) % n ? '✓' : '✗'}`),
    );
    replaceChildrenOf(
      status,
      h(
        'span',
        { class: 'hl' },
        `умножение шифртекстов = сложение открытых текстов: сервер посчитал ${m1} + ${m2} = ${sum}, не увидев слагаемых`,
      ),
    );
  };

  rerender();
  root.append(
    h('div', { class: 'widget-title' }, 'калькулятор Пайе: сумма без расшифровки'),
    h(
      'div',
      { class: 'widget-body' },
      controls,
      derivation,
      status,
      h(
        'div',
        { class: 'widget-hint' },
        'нажмите «перешифровать»: те же m дают совершенно другие шифртексты (случайное r), но арифметика сходится — рандомизация лечит детерминированность, погубившую textbook RSA',
      ),
    ),
  );
  root.classList.add('widget');
};

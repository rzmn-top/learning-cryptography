/**
 * ECDSA на малой кривой: подпись, проверка и восстановление секретного
 * ключа при повторе nonce (атака на PS3).
 */

import { h, replaceChildrenOf } from '../ui/dom';
import { CurveFp, PointFp, mul, pointOrder } from '../lib/math/ec-fp';
import { EcdsaParams, sign, verify, recoverFromReusedNonce } from '../lib/crypto/ecdsa';

// малая кривая с генератором простого порядка
const curve: CurveFp = { a: 2, b: 2, p: 17 };
const G: PointFp = { x: 5, y: 1 };
const N = pointOrder(curve, G); // порядок G

const params: EcdsaParams = { curve, G, n: N };

interface State {
  readonly d: number;
  readonly z1: number;
  readonly k1: number;
  readonly z2: number;
  readonly k2: number;
}

export const mountEcdsaDemo = (root: HTMLElement): void => {
  let state: State = { d: 7, z1: 3, k1: 4, z2: 9, k2: 4 };

  const body = h('div', { class: 'widget-body' });

  const rerender = (): void => {
    const { d, z1, k1, z2, k2 } = state;
    const Q = mul(curve, d, G);
    const sig1 = sign(params, d, z1, k1);
    const sig2 = sign(params, d, z2, k2);

    const num = (label: string, value: number, max: number, set: (v: number) => State): HTMLElement =>
      h(
        'label',
        {},
        label,
        h('input', {
          type: 'number',
          min: '1',
          max: String(max),
          value: String(value),
          onchange: (e: Event) => {
            const v = Number((e.target as HTMLInputElement).value);
            if (Number.isInteger(v) && v >= 1 && v <= max) {
              state = set(v);
              rerender();
            }
          },
        }),
      );

    const paramLine = h(
      'div',
      { class: 'phi-derivation' },
      h('div', {}, `кривая y² = x³ + 2x + 2 над F_17 · G = (5,1) · n = ord(G) = ${N}`),
      h('div', {}, `секретный ключ d = ${d} · открытый Q = dG = ${Q === null ? 'O' : `(${Q.x},${Q.y})`}`),
    );

    const controls = h(
      'div',
      { class: 'widget-controls' },
      num('d =', d, N - 1, (v) => ({ ...state, d: v })),
    );

    const sigBlock = (title: string, z: number, k: number, sig: ReturnType<typeof sign>): HTMLElement =>
      h(
        'div',
        { class: 'dh-col' },
        h('div', { class: 'steps-caption' }, title),
        sig === undefined
          ? h('div', {}, `k = ${k} непригоден (r или s = 0), возьмите другой`)
          : h(
              'div',
              { class: 'phi-derivation' },
              h('div', {}, `R = kG, r = R.x mod n = ${sig.r}`),
              h('div', {}, `s = k⁻¹(z + r·d) mod n = ${sig.s}`),
              h('div', {}, `проверка: ${verify(params, Q, z, sig) ? '✓ валидна' : '✗'}`),
            ),
      );

    const signControls = h(
      'div',
      { class: 'widget-controls' },
      num('z₁ =', z1, N - 1, (v) => ({ ...state, z1: v })),
      num('k₁ =', k1, N - 1, (v) => ({ ...state, k1: v })),
      num('z₂ =', z2, N - 1, (v) => ({ ...state, z2: v })),
      num('k₂ =', k2, N - 1, (v) => ({ ...state, k2: v })),
    );

    // атака при k1 == k2
    let attack: HTMLElement;
    if (k1 === k2 && sig1 !== undefined && sig2 !== undefined && z1 !== z2) {
      const rec = recoverFromReusedNonce(params, z1, sig1, z2, sig2);
      attack = h(
        'div',
        { class: 'crypto-context' },
        h('span', { class: 'env-label' }, 'nonce reuse'),
        h(
          'div',
          { class: 'phi-derivation' },
          h('div', {}, `k₁ = k₂ ⇒ r₁ = r₂ = ${sig1.r} — один и тот же nonce`),
          h('div', {}, `k = (z₁ − z₂)/(s₁ − s₂) mod n = ${rec?.k ?? '?'}`),
          h('div', {}, `d = (s₁·k − z₁)/r mod n = ${rec?.d ?? '?'}`),
          h(
            'div',
            {},
            rec?.d === d
              ? `восстановленный ключ ${rec.d} = настоящий d ✓ — секрет раскрыт из двух подписей`
              : 'проверьте параметры',
          ),
        ),
      );
    } else {
      attack = h(
        'div',
        { class: 'widget-hint' },
        'поставьте k₁ = k₂ (при разных сообщениях z₁ ≠ z₂) — и секретный ключ восстановится из двух подписей',
      );
    }

    replaceChildrenOf(
      body,
      controls,
      paramLine,
      signControls,
      h('div', { class: 'dh-cols' }, sigBlock('подпись 1', z1, k1, sig1), sigBlock('подпись 2', z2, k2, sig2)),
      attack,
    );
  };

  rerender();
  root.append(h('div', { class: 'widget-title' }, 'ECDSA: подпись, проверка, атака nonce reuse'), body);
  root.classList.add('widget');
};

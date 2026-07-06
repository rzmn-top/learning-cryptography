/**
 * Криптосистема Регева на малых параметрах: шифрование бита случайным
 * подмножеством уравнений, расшифрование по расстоянию до 0 / q/2.
 * Регулятор уровня шума показывает границу корректности |шум| < q/4.
 */

import { h, replaceChildrenOf } from '../ui/dom';
import {
  makeSystem,
  regevEncrypt,
  regevDecrypt,
  LweSystem,
} from '../lib/crypto/lwe';

const N = 4;
const M = 8;
const Q = 97;

interface State {
  readonly noise: number;
  readonly sys: LweSystem;
  readonly bit: 0 | 1;
}

export const mountRegevDemo = (root: HTMLElement): void => {
  const gen = (noise: number, bit: 0 | 1): State => ({
    noise,
    bit,
    sys: makeSystem(N, M, Q, noise, Math.random),
  });
  let state: State = gen(2, 1);

  const derivation = h('div', { class: 'phi-derivation' });
  const status = h('div', { class: 'widget-status' });

  const noiseInput = h('input', {
    type: 'number',
    min: '0',
    max: '24',
    value: String(state.noise),
    onchange: () => {
      const v = Number(noiseInput.value);
      if (Number.isInteger(v) && v >= 0 && v <= 24) {
        state = gen(v, state.bit);
        rerender();
      }
    },
  });

  const controls = h(
    'div',
    { class: 'widget-controls' },
    h(
      'label',
      {},
      'бит:',
      h(
        'select',
        {
          onchange: (e: Event) => {
            state = { ...state, bit: Number((e.target as HTMLSelectElement).value) as 0 | 1 };
            rerender();
          },
        },
        h('option', { value: '1', selected: true }, '1'),
        h('option', { value: '0' }, '0'),
      ),
    ),
    h('label', {}, 'шум e ∈ ±', noiseInput),
    h(
      'button',
      {
        onclick: () => rerender(),
      },
      'зашифровать заново',
    ),
    h(
      'button',
      {
        onclick: () => {
          let errors = 0;
          for (let i = 0; i < 100; i += 1) {
            const b: 0 | 1 = Math.random() < 0.5 ? 0 : 1;
            const ct = regevEncrypt(state.sys, Q, b, Math.random);
            if (regevDecrypt(ct, state.sys.s, Q).bit !== b) errors += 1;
          }
          replaceChildrenOf(
            status,
            h(
              'span',
              { class: 'hl' },
              `серия из 100 шифрований: ${errors} ошибок расшифрования при e ∈ ±${state.noise}`,
            ),
          );
        },
      },
      '×100',
    ),
  );

  const rerender = (): void => {
    const { sys, bit } = state;
    const ct = regevEncrypt(sys, Q, bit, Math.random);
    const dec = regevDecrypt(ct, sys.s, Q);
    const eSum = ct.subset.reduce((acc, i) => acc + (sys.e[i] ?? 0), 0);

    replaceChildrenOf(
      derivation,
      h('div', {}, `параметры: n = ${N}, m = ${M}, q = ${Q}, ⌊q/2⌋ = ${Math.floor(Q / 2)}, порог q/4 ≈ ${(Q / 4).toFixed(0)}`),
      h('div', {}, `открытый ключ: ${M} строк (a_i, b_i = ⟨a_i, s⟩ + e_i); секрет s = (${sys.s.join(', ')})`),
      h('div', {}, `шифрование бита ${bit}: подмножество S = {${ct.subset.map((i) => i + 1).join(', ')}}`),
      h('div', {}, `c = (Σa_i, Σb_i + ${bit}·${Math.floor(Q / 2)}) → c₂ = ${ct.c2}`),
      h(
        'div',
        {},
        `расшифрование: c₂ − ⟨c₁, s⟩ = ${dec.centered} (mod ${Q}, центрировано) — это ${bit}·${Math.floor(Q / 2)} + Σe_i, где Σe_i = ${eSum}`,
      ),
      h(
        'div',
        {},
        `|${dec.centered}| ${Math.abs(dec.centered) > Q / 4 ? '>' : '≤'} q/4 → бит ${dec.bit} ${dec.bit === bit ? '— верно' : '— ОШИБКА: шум перевалил порог'}`,
      ),
    );
    replaceChildrenOf(
      status,
      h(
        'span',
        { class: 'hl' },
        dec.bit === bit
          ? `корректно: |Σe_i| = ${Math.abs(eSum)} < q/4 ≈ ${(Q / 4).toFixed(0)}`
          : `сбой: |Σe_i| = ${Math.abs(eSum)} ≥ q/4 — условие теоремы о корректности нарушено`,
      ),
    );
  };

  rerender();
  root.append(
    h('div', { class: 'widget-title' }, 'криптосистема Регева: бит против шума'),
    h(
      'div',
      { class: 'widget-body' },
      controls,
      derivation,
      status,
      h(
        'div',
        { class: 'widget-hint' },
        'поднимите шум до ±10–24 и запустите ×100: как только |Σe_i| добирается до q/4, расшифрование начинает ошибаться — весь дизайн параметров LWE-схем крутится вокруг этого бюджета',
      ),
    ),
  );
  root.classList.add('widget');
};

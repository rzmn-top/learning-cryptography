/**
 * Diffie–Hellman в Z_p^*: обе стороны считают общий секрет,
 * противник видит только (p, g, A, B).
 */

import { h, replaceChildrenOf } from '../ui/dom';
import { modPow } from '../lib/math/mod';

/** Безопасные простые: p = 2q + 1. */
const SAFE_PRIMES: readonly number[] = [23, 59, 83, 107, 227, 467];

interface State {
  readonly p: number;
  readonly g: number;
  readonly a: number;
  readonly b: number;
}

const randomExp = (p: number): number => 2 + Math.floor(Math.random() * (p - 3));

export const mountDhDemo = (root: HTMLElement): void => {
  let state: State = { p: 227, g: 2, a: 41, b: 174 };

  const body = h('div', { class: 'widget-body' });

  const rerender = (): void => {
    const { p, g, a, b } = state;
    const bigA = modPow(g, a, p);
    const bigB = modPow(g, b, p);
    const sharedAlice = modPow(bigB, a, p);
    const sharedBob = modPow(bigA, b, p);

    const controls = h(
      'div',
      { class: 'widget-controls' },
      h(
        'label',
        {},
        'p =',
        h(
          'select',
          {
            onchange: (e: Event) => {
              const v = Number((e.target as HTMLSelectElement).value);
              state = { ...state, p: v, a: randomExp(v), b: randomExp(v) };
              rerender();
            },
          },
          ...SAFE_PRIMES.map((v) =>
            h('option', { value: String(v), selected: v === state.p }, `${v} = 2·${(v - 1) / 2}+1`),
          ),
        ),
      ),
      h(
        'label',
        {},
        'g =',
        h('input', {
          type: 'number',
          min: '2',
          max: String(p - 1),
          value: String(g),
          onchange: (e: Event) => {
            const v = Number((e.target as HTMLInputElement).value);
            if (Number.isInteger(v) && v >= 2 && v < p) {
              state = { ...state, g: v };
              rerender();
            }
          },
        }),
      ),
      h(
        'button',
        {
          onclick: () => {
            state = { ...state, a: randomExp(p), b: randomExp(p) };
            rerender();
          },
        },
        '⟳ новые секреты',
      ),
    );

    const cols = h(
      'div',
      { class: 'dh-cols' },
      h(
        'div',
        { class: 'dh-col' },
        h('div', { class: 'steps-caption' }, 'Алиса'),
        h('div', { class: 'phi-derivation' },
          h('div', {}, `секрет a = ${a}`),
          h('div', {}, `A = g^a = ${g}^${a} mod ${p} = ${bigA}`),
          h('div', {}, `S = B^a = ${bigB}^${a} mod ${p} = ${sharedAlice}`),
        ),
      ),
      h(
        'div',
        { class: 'dh-col dh-eve' },
        h('div', { class: 'steps-caption' }, 'Ева (канал)'),
        h('div', { class: 'phi-derivation' },
          h('div', {}, `видит p = ${p}, g = ${g}`),
          h('div', {}, `видит A = ${bigA} →`),
          h('div', {}, `← видит B = ${bigB}`),
          h('div', {}, `нужен a из A = g^a — DLP`),
        ),
      ),
      h(
        'div',
        { class: 'dh-col' },
        h('div', { class: 'steps-caption' }, 'Боб'),
        h('div', { class: 'phi-derivation' },
          h('div', {}, `секрет b = ${b}`),
          h('div', {}, `B = g^b = ${g}^${b} mod ${p} = ${bigB}`),
          h('div', {}, `S = A^b = ${bigA}^${b} mod ${p} = ${sharedBob}`),
        ),
      ),
    );

    replaceChildrenOf(
      body,
      controls,
      cols,
      h(
        'div',
        { class: 'widget-status' },
        sharedAlice === sharedBob
          ? h('span', { class: 'hl' }, `общий секрет: B^a = A^b = g^(ab) = ${sharedAlice}`)
          : 'ошибка',
      ),
      h('div', { class: 'widget-hint' }, 'p — безопасное простое (p = 2q+1): у Z_p* нет малых подгрупп, кроме {1, p−1}'),
    );
  };

  rerender();
  root.append(h('div', { class: 'widget-title' }, 'обмен ключами Diffie–Hellman'), body);
  root.classList.add('widget');
};

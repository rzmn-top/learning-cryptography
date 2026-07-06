/**
 * График x ↦ g^x mod p против x ↦ g·x mod p: линейная функция даёт
 * регулярные полосы, экспоненциальная — визуальный шум. Отсутствие
 * видимой структуры — качественная причина трудности DLP.
 */

import { h, replaceChildrenOf } from '../ui/dom';
import { modPow, mod, multOrder, gcd } from '../lib/math/mod';

const PRIMES: readonly number[] = [61, 127, 251, 509];

interface State {
  readonly p: number;
  readonly g: number;
  readonly kind: 'exp' | 'lin';
}

const CSS = { ink: '#16130e', acid: '#b8e600', pink: '#ff2f92', paper: '#f4efe2' } as const;

const draw = (canvas: HTMLCanvasElement, s: State): void => {
  const ctx = canvas.getContext('2d');
  if (ctx === null) return;
  const w = canvas.width;
  const hgt = canvas.height;
  ctx.fillStyle = CSS.ink;
  ctx.fillRect(0, 0, w, hgt);

  const count = s.p - 1;
  for (let x = 0; x < count; x += 1) {
    const y = s.kind === 'exp' ? modPow(s.g, x, s.p) : mod(s.g * x, s.p);
    const px = (x / count) * (w - 8) + 4;
    const py = hgt - 4 - (y / s.p) * (hgt - 8);
    ctx.fillStyle = s.kind === 'exp' ? CSS.acid : CSS.pink;
    ctx.fillRect(Math.round(px), Math.round(py), 2, 2);
  }
};

export const mountDlogScatter = (root: HTMLElement): void => {
  let state: State = { p: 251, g: 6, kind: 'exp' };

  const canvas = h('canvas', { width: '520', height: '240' });
  const body = h('div', { class: 'widget-body' });

  const rerender = (): void => {
    const { p, g, kind } = state;
    const ord = gcd(g, p) === 1 ? multOrder(g, p) : undefined;

    const controls = h(
      'div',
      { class: 'widget-controls' },
      h(
        'label',
        {},
        'функция:',
        h(
          'select',
          {
            onchange: (e: Event) => {
              state = { ...state, kind: (e.target as HTMLSelectElement).value as State['kind'] };
              rerender();
            },
          },
          h('option', { value: 'exp', selected: kind === 'exp' }, 'x ↦ g^x mod p'),
          h('option', { value: 'lin', selected: kind === 'lin' }, 'x ↦ g·x mod p'),
        ),
      ),
      h(
        'label',
        {},
        'p =',
        h(
          'select',
          {
            onchange: (e: Event) => {
              state = { ...state, p: Number((e.target as HTMLSelectElement).value) };
              rerender();
            },
          },
          ...PRIMES.map((v) => h('option', { value: String(v), selected: v === p }, String(v))),
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
    );

    replaceChildrenOf(
      body,
      controls,
      canvas,
      h(
        'div',
        { class: 'widget-status' },
        kind === 'exp'
          ? h('span', { class: 'hl' }, `ord(${g}) = ${ord ?? '—'} из ${p - 1}${ord === p - 1 ? ' — генератор' : ''}`)
          : 'линейную функцию обращает один расширенный Евклид (гл. 2)',
      ),
      h(
        'div',
        { class: 'widget-hint' },
        kind === 'exp'
          ? 'найти x по g^x — искать точку на нужной высоте без какой-либо структуры'
          : 'та же «перемешивающая» операция, но полосы выдают линейную структуру',
      ),
    );
    draw(canvas, state);
  };

  rerender();
  root.append(h('div', { class: 'widget-title' }, 'дискретный логарифм: g^x против g·x'), body);
  root.classList.add('widget');
};

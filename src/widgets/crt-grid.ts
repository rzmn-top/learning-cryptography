/**
 * Сетка остатков: x ∈ Z_mn размещается в клетке (x mod m, x mod n).
 * При gcd(m, n) = 1 числа 0..mn−1 заполняют сетку без повторов (биекция CRT);
 * иначе часть клеток пуста, часть переполнена. Клик — реконструкция x
 * из пары остатков. Обход — анимация «диагонального» заполнения.
 */

import { h, replaceChildrenOf } from '../ui/dom';
import { numParam } from '../ui/widgets';
import { gcd, mod, modInverse } from '../lib/math/mod';

interface State {
  readonly m: number;
  readonly n: number;
  readonly step: number; // сколько чисел 0..mn−1 размещено
  readonly picked: readonly [number, number] | undefined; // (r1, r2)
}

export const mountCrtGrid = (root: HTMLElement): void => {
  let state: State = {
    m: numParam(root, 'm', 4),
    n: numParam(root, 'n', 9),
    step: 0,
    picked: undefined,
  };
  let timer: number | undefined;

  const body = h('div', { class: 'widget-body' });

  const stopAnim = (): void => {
    if (timer !== undefined) window.clearInterval(timer);
    timer = undefined;
  };

  const rerender = (): void => {
    const { m, n, step, picked } = state;
    const total = m * n;
    const coprime = gcd(m, n) === 1;

    // содержимое клеток: (r1, r2) → числа x, размещённые к текущему шагу
    const cells = new Map<string, number[]>();
    for (let x = 0; x < Math.min(step, total); x += 1) {
      const key = `${x % m},${x % n}`;
      const list = cells.get(key) ?? [];
      list.push(x);
      cells.set(key, list);
    }

    const input = (label: string, value: number, set: (v: number) => State): HTMLElement =>
      h(
        'label',
        {},
        label,
        h('input', {
          type: 'number',
          min: '2',
          max: '12',
          value: String(value),
          onchange: (e: Event) => {
            const v = Number((e.target as HTMLInputElement).value);
            if (Number.isInteger(v) && v >= 2 && v <= 12) {
              stopAnim();
              state = { ...set(v), step: 0, picked: undefined };
              rerender();
            }
          },
        }),
      );

    const controls = h(
      'div',
      { class: 'widget-controls' },
      input('m =', m, (v) => ({ ...state, m: v })),
      input('n =', n, (v) => ({ ...state, n: v })),
      h(
        'button',
        {
          onclick: () => {
            stopAnim();
            state = { ...state, step: 0, picked: undefined };
            rerender();
            timer = window.setInterval(() => {
              if (state.step >= state.m * state.n) {
                stopAnim();
                return;
              }
              state = { ...state, step: state.step + 1 };
              rerender();
            }, 120);
          },
        },
        '▶ разместить 0..mn−1',
      ),
      h(
        'button',
        {
          onclick: () => {
            stopAnim();
            state = { ...state, step: total, picked: undefined };
            rerender();
          },
        },
        'всё сразу',
      ),
    );

    const header = h(
      'tr',
      {},
      h('th', {}, 'x mod n \\ m'),
      ...Array.from({ length: m }, (_, r1) => h('th', {}, String(r1))),
    );

    const rows = Array.from({ length: n }, (_, r2) =>
      h(
        'tr',
        {},
        h('th', {}, String(r2)),
        ...Array.from({ length: m }, (_, r1) => {
          const list = cells.get(`${r1},${r2}`) ?? [];
          const isPicked = picked !== undefined && picked[0] === r1 && picked[1] === r2;
          const cls =
            list.length > 1 ? 'crt-clash' : list.length === 1 ? 'crt-filled' : 'crt-empty';
          return h(
            'td',
            {
              class: `${cls}${isPicked ? ' flash' : ''}`,
              onclick: () => {
                state = { ...state, picked: [r1, r2] };
                rerender();
              },
            },
            list.length === 0 ? '·' : list.join(','),
          );
        }),
      ),
    );

    const grid = h('table', { class: 'cayley crt' }, header, ...rows);

    let statusChildren: (string | Node)[];
    if (picked !== undefined && coprime) {
      const [r1, r2] = picked;
      const mInv = modInverse(m, n);
      const nInv = modInverse(n, m);
      const x =
        mInv === undefined || nInv === undefined
          ? undefined
          : mod(r1 * n * nInv + r2 * m * mInv, total);
      statusChildren =
        x === undefined
          ? []
          : [
              h(
                'span',
                { class: 'hl' },
                `x ≡ ${r1} (mod ${m}), x ≡ ${r2} (mod ${n}) ⇒ x = ${x}`,
              ),
              ` = (${r1}·${n}·${nInv} + ${r2}·${m}·${mInv}) mod ${total}`,
            ];
    } else if (!coprime) {
      statusChildren = [
        `gcd(${m}, ${n}) = ${gcd(m, n)} ≠ 1: числа сталкиваются в одних клетках, другие пусты — биекции нет`,
      ];
    } else {
      statusChildren = [
        step >= total
          ? `все ${total} чисел разместились без повторов — биекция Z_${total} ↔ Z_${m} × Z_${n}`
          : 'клик по клетке — восстановить x из пары остатков',
      ];
    }

    replaceChildrenOf(
      body,
      controls,
      grid,
      h('div', { class: 'widget-status' }, ...statusChildren),
      h('div', { class: 'widget-hint' }, 'x идёт по «диагонали»: каждый шаг сдвигает обе координаты на 1'),
    );
  };

  rerender();
  root.append(h('div', { class: 'widget-title' }, 'сетка остатков (CRT)'), body);
  root.classList.add('widget');
};

/**
 * Одноразовая подпись Лэмпорта на 8-битном toy-хэше: пары секретов,
 * раскрытие половинок при подписи, проверка, и наглядный провал
 * при подписи второго сообщения тем же ключом.
 */

import { h, replaceChildrenOf } from '../ui/dom';

/** Toy-хэш FNV-1a (32 бита), для дайджеста сообщения берём младшие 8. */
const fnv = (input: string): number => {
  let acc = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    acc ^= input.charCodeAt(i);
    acc = Math.imul(acc, 0x01000193) >>> 0;
  }
  return acc >>> 0;
};

const hash8 = (msg: string): readonly (0 | 1)[] => {
  const d = fnv(msg) & 0xff;
  return Array.from({ length: 8 }, (_, i): 0 | 1 => (((d >> (7 - i)) & 1) === 1 ? 1 : 0));
};

const hex = (v: number): string => (v >>> 0).toString(16).padStart(8, '0');

interface State {
  /** Секреты: 8 пар 32-битных значений. */
  readonly sk: readonly (readonly [number, number])[];
  /** Раскрытые половинки: revealed[i][b] = true, если x_{i,b} показан. */
  readonly revealed: readonly (readonly [boolean, boolean])[];
  readonly msg: string;
  readonly signedCount: number;
}

const freshKeys = (): State => ({
  sk: Array.from({ length: 8 }, () => [
    Math.floor(Math.random() * 0xffffffff),
    Math.floor(Math.random() * 0xffffffff),
  ]),
  revealed: Array.from({ length: 8 }, () => [false, false]),
  msg: 'перевести 100',
  signedCount: 0,
});

export const mountLamport = (root: HTMLElement): void => {
  let state: State = freshKeys();

  const table = h('div', { class: 'phi-derivation' });
  const status = h('div', { class: 'widget-status' });

  const msgInput = h('input', {
    type: 'text',
    value: state.msg,
    style: 'min-width: 12em;',
    onchange: () => {
      state = { ...state, msg: msgInput.value };
      rerender();
    },
  });

  const controls = h(
    'div',
    { class: 'widget-controls' },
    h('label', {}, 'сообщение:', msgInput),
    h(
      'button',
      {
        onclick: () => {
          const bits = hash8(state.msg);
          state = {
            ...state,
            revealed: state.revealed.map(
              ([r0, r1], i): readonly [boolean, boolean] =>
                bits[i] === 0 ? [true, r1] : [r0, true],
            ),
            signedCount: state.signedCount + 1,
          };
          rerender();
        },
      },
      'подписать',
    ),
    h(
      'button',
      {
        onclick: () => {
          state = freshKeys();
          msgInput.value = state.msg;
          rerender();
        },
      },
      'новый ключ',
    ),
  );

  const rerender = (): void => {
    const { sk, revealed, msg, signedCount } = state;
    const bits = hash8(msg);

    const rows = sk.map(([x0, x1], i) => {
      const [r0, r1] = revealed[i] ?? [false, false];
      const cell = (x: number, shown: boolean, used: boolean): string =>
        `${used ? '▶' : ' '}${shown ? hex(x) : '········'}`;
      return h(
        'div',
        {},
        `бит ${i}=${bits[i]} · x[${i},0]=${cell(x0, r0, bits[i] === 0)} · x[${i},1]=${cell(x1, r1, bits[i] === 1)} · pk: H(x₀)=${hex(fnv(hex(x0)))}, H(x₁)=${hex(fnv(hex(x1)))}`,
      );
    });

    // сколько сообщений теперь можно подделать: по каждому биту доступны
    // раскрытые половинки; произведение вариантов
    const forgeable = revealed.reduce(
      (acc, [r0, r1]) => acc * ((r0 ? 1 : 0) + (r1 ? 1 : 0)),
      1,
    );

    replaceChildrenOf(
      table,
      h('div', {}, `H(m) = ${bits.join('')} (toy-хэш 8 бит) — подпись раскрывает по половинке на бит:`),
      ...rows,
    );
    replaceChildrenOf(
      status,
      h(
        'span',
        { class: 'hl' },
        signedCount === 0
          ? 'ключ свежий: ничего не раскрыто'
          : signedCount === 1
            ? 'одна подпись: раскрыто ровно 8 половинок из 16 — проверка пересчитывает H(x) и сверяет с pk'
            : `подписей: ${signedCount} — раскрытых половинок хватает на ${forgeable} различных дайджестов: подделка возможна`,
      ),
    );
  };

  rerender();
  root.append(
    h('div', { class: 'widget-title' }, 'подпись Лэмпорта: одна — можно, две — компрометация'),
    h(
      'div',
      { class: 'widget-body' },
      controls,
      table,
      status,
      h(
        'div',
        { class: 'widget-hint' },
        'поменяйте сообщение и подпишите второй раз тем же ключом: раскрытые половинки начнут покрывать чужие дайджесты — счётчик подделываемых сообщений растёт с 1',
      ),
    ),
  );
  root.classList.add('widget');
};

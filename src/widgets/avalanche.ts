/**
 * Лавинный эффект SHA-256: флип одного бита входа меняет в среднем
 * половину битов хэша. Хэш считается настоящим WebCrypto.
 */

import { h, replaceChildrenOf } from '../ui/dom';

interface State {
  readonly text: string;
  readonly bit: number; // номер бита, который флипается
}

const sha256 = async (bytes: Uint8Array): Promise<Uint8Array> => {
  const buf = await crypto.subtle.digest('SHA-256', bytes as BufferSource);
  return new Uint8Array(buf);
};

const flipBit = (bytes: Uint8Array, bit: number): Uint8Array => {
  const out = new Uint8Array(bytes);
  const idx = Math.floor(bit / 8);
  if (idx < out.length) out[idx] = (out[idx] ?? 0) ^ (1 << (bit % 8));
  return out;
};

const hex = (bytes: Uint8Array): string =>
  [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');

const bitDiff = (a: Uint8Array, b: Uint8Array): number => {
  let count = 0;
  for (let i = 0; i < a.length; i += 1) {
    let x = (a[i] ?? 0) ^ (b[i] ?? 0);
    while (x !== 0) {
      count += x & 1;
      x >>>= 1;
    }
  }
  return count;
};

/** Hex-строка с подсветкой символов, отличающихся от эталона. */
const diffHex = (value: string, reference: string): HTMLElement =>
  h(
    'span',
    { class: 'hash-hex' },
    ...[...value].map((ch, i) =>
      h('span', { class: ch === reference[i] ? '' : 'hash-diff' }, ch),
    ),
  );

export const mountAvalanche = (root: HTMLElement): void => {
  let state: State = { text: 'attack at dawn', bit: 0 };

  const body = h('div', { class: 'widget-body' });

  const rerender = (): void => {
    const bytes = new TextEncoder().encode(state.text);
    const maxBit = Math.max(0, bytes.length * 8 - 1);
    const bit = Math.min(state.bit, maxBit);
    const flipped = flipBit(bytes, bit);

    void Promise.all([sha256(bytes), sha256(flipped)]).then(([h1, h2]) => {
      const hex1 = hex(h1);
      const hex2 = hex(h2);
      const diff = bitDiff(h1, h2);

      const controls = h(
        'div',
        { class: 'widget-controls' },
        h(
          'label',
          {},
          'вход:',
          h('input', {
            type: 'text',
            size: '24',
            value: state.text,
            onchange: (e: Event) => {
              const v = (e.target as HTMLInputElement).value;
              if (v.length > 0) {
                state = { ...state, text: v };
                rerender();
              }
            },
          }),
        ),
        h(
          'label',
          {},
          'флип бита №',
          h('input', {
            type: 'number',
            min: '0',
            max: String(maxBit),
            value: String(bit),
            onchange: (e: Event) => {
              const v = Number((e.target as HTMLInputElement).value);
              if (Number.isInteger(v) && v >= 0 && v <= maxBit) {
                state = { ...state, bit: v };
                rerender();
              }
            },
          }),
        ),
      );

      const flippedText = new TextDecoder().decode(flipped);

      replaceChildrenOf(
        body,
        controls,
        h(
          'div',
          { class: 'hash-rows' },
          h('div', {}, h('span', { class: 'steps-caption' }, `SHA-256("${state.text}")`), diffHex(hex1, hex1)),
          h('div', {}, h('span', { class: 'steps-caption' }, `SHA-256(вход с флипом бита ${bit}) = SHA-256(${JSON.stringify(flippedText)})`), diffHex(hex2, hex1)),
        ),
        h(
          'div',
          { class: 'widget-status' },
          h('span', { class: 'hl' }, `различаются ${diff} бит из 256`),
          ' — при идеальном хэше в среднем 128',
        ),
      );
    });
  };

  rerender();
  root.append(h('div', { class: 'widget-title' }, 'лавинный эффект SHA-256'), body);
  root.classList.add('widget');
};

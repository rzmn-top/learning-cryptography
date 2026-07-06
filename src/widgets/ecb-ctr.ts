/**
 * ECB vs CTR на изображении: одинаковые блоки открытого текста в ECB
 * дают одинаковый шифртекст — структура картинки сохраняется.
 * В CTR той же картинки не видно.
 */

import { h, replaceChildrenOf } from '../ui/dom';
import { spnEncrypt, encryptCtr } from '../lib/crypto/spn';

const SIZE = 56; // пикселей по стороне
const SCALE = 3;

interface State {
  readonly key: number;
  readonly nonce: number;
}

/** Тестовая картинка: индекс палитры (0..3) для каждого пикселя. */
const makeImage = (): readonly number[] => {
  const img: number[] = [];
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const d = Math.hypot(x - cx, y - cy);
      let c = Math.floor((x + y) / 7) % 2; // диагональные полосы 0/1
      if (d < SIZE * 0.32) c = 2; // круг
      if (d < SIZE * 0.32 && Math.abs(x - cx) < SIZE * 0.06) c = 3; // вертикальная полоса в круге
      if (x < 2 || y < 2 || x >= SIZE - 2 || y >= SIZE - 2) c = 3; // рамка
      img.push(c);
    }
  }
  return img;
};

const PALETTE: readonly string[] = ['#f4efe2', '#b8e600', '#16130e', '#ff2f92'];

const drawIndexed = (canvas: HTMLCanvasElement, data: readonly number[], colors: (v: number) => string): void => {
  const ctx = canvas.getContext('2d');
  if (ctx === null) return;
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      ctx.fillStyle = colors(data[y * SIZE + x] ?? 0);
      ctx.fillRect(x * SCALE, y * SCALE, SCALE, SCALE);
    }
  }
};

/** Цвет для 16-битного шифртекста: детерминированное «псевдослучайное» RGB. */
const cipherColor = (v: number): string => {
  const r = (v * 2654435761) & 0xffffff;
  return `#${r.toString(16).padStart(6, '0')}`;
};

export const mountEcbCtr = (root: HTMLElement): void => {
  let state: State = { key: 0x3a94, nonce: 0x1111 };
  const image = makeImage();

  const cPlain = h('canvas', { width: String(SIZE * SCALE), height: String(SIZE * SCALE) });
  const cEcb = h('canvas', { width: String(SIZE * SCALE), height: String(SIZE * SCALE) });
  const cCtr = h('canvas', { width: String(SIZE * SCALE), height: String(SIZE * SCALE) });
  const body = h('div', { class: 'widget-body' });

  const rerender = (): void => {
    // блок открытого текста = индекс палитры пикселя
    const ecb = image.map((b) => spnEncrypt(b, state.key));
    const ctr = encryptCtr(image, state.key, state.nonce);

    drawIndexed(cPlain, image, (v) => PALETTE[v] ?? '#000');
    drawIndexed(cEcb, ecb, cipherColor);
    drawIndexed(cCtr, ctr, cipherColor);

    const controls = h(
      'div',
      { class: 'widget-controls' },
      h(
        'button',
        {
          onclick: () => {
            state = { key: Math.floor(Math.random() * 0x10000), nonce: Math.floor(Math.random() * 0x10000) };
            rerender();
          },
        },
        'новый ключ',
      ),
      h('span', {}, `key = 0x${state.key.toString(16).padStart(4, '0')}`),
    );

    replaceChildrenOf(
      body,
      controls,
      h(
        'div',
        { class: 'cipher-canvases' },
        h('figure', {}, cPlain, h('figcaption', { class: 'steps-caption' }, 'открытый текст')),
        h('figure', {}, cEcb, h('figcaption', { class: 'steps-caption' }, 'ECB: блок ↦ E(блок)')),
        h('figure', {}, cCtr, h('figcaption', { class: 'steps-caption' }, 'CTR: блок ⊕ E(счётчик)')),
      ),
      h(
        'div',
        { class: 'widget-status' },
        'одинаковые пиксели в ECB шифруются одинаково — контуры сохраняются при любом ключе',
      ),
    );
  };

  rerender();
  root.append(h('div', { class: 'widget-title' }, 'режимы шифрования: ECB vs CTR'), body);
  root.classList.add('widget');
};

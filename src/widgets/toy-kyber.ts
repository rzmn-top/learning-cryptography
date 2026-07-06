/**
 * Toy-Kyber по шагам: генерация ключей, инкапсуляция 8 бит,
 * декапсуляция. Столбцы — центрированные коэффициенты w = v − u·s:
 * бит читается по расстоянию до 0 или ±q/2, полосы ±q/4 — порог.
 * Тумблер сжатия v показывает, как округление тратит шумовой бюджет.
 */

import { h, replaceChildrenOf } from '../ui/dom';
import { TOY, keygen, encaps, decaps, compressRound, KeyPair, Ciphertext } from '../lib/crypto/kyber-toy';
import { polyStr } from '../lib/math/polyring';

const CSS = {
  ink: '#16130e',
  acid: '#b8e600',
  pink: '#ff2f92',
  violet: '#6a1fd0',
  paper: '#f4efe2',
  dim: '#5a5648',
} as const;

const CW = 520;
const CH = 200;

interface State {
  readonly keys: KeyPair;
  readonly bits: readonly (0 | 1)[];
  readonly ct: Ciphertext;
  readonly compress: boolean;
}

const randBits = (): readonly (0 | 1)[] =>
  Array.from({ length: TOY.n }, (): 0 | 1 => (Math.random() < 0.5 ? 0 : 1));

const draw = (canvas: HTMLCanvasElement, w: readonly number[], bits: readonly (0 | 1)[], decoded: readonly (0 | 1)[]): void => {
  const ctx = canvas.getContext('2d');
  if (ctx === null) return;
  const { q } = TOY;
  ctx.fillStyle = CSS.ink;
  ctx.fillRect(0, 0, CW, CH);
  const mid = CH / 2;
  const scale = (CH - 40) / q; // на весь диапазон (−q/2, q/2]
  const slot = CW / w.length;

  // направляющие: 0, ±q/4, ±q/2
  const line = (level: number, color: string, label: string): void => {
    const y = mid - level * scale;
    ctx.strokeStyle = color;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(36, y);
    ctx.lineTo(CW - 4, y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = color;
    ctx.font = '11px "PT Mono", monospace';
    ctx.fillText(label, 4, y + 4);
  };
  line(0, CSS.dim, '0');
  line(q / 4, CSS.violet, 'q/4');
  line(-q / 4, CSS.violet, '−q/4');
  line(q / 2 - 1, CSS.dim, 'q/2');
  line(-(q / 2 - 1), CSS.dim, '−q/2');

  w.forEach((c, i) => {
    const x = 36 + slot * 0.15 + i * ((CW - 44) / w.length);
    const barW = ((CW - 44) / w.length) * 0.55;
    const y0 = mid;
    const y1 = mid - c * scale;
    const ok = decoded[i] === bits[i];
    ctx.fillStyle = ok ? CSS.acid : CSS.pink;
    ctx.fillRect(Math.round(x), Math.round(Math.min(y0, y1)), Math.round(barW), Math.max(2, Math.round(Math.abs(y1 - y0))));
    ctx.fillStyle = CSS.paper;
    ctx.font = '12px "PT Mono", monospace';
    ctx.fillText(`${bits[i]}→${decoded[i]}`, x, CH - 6);
  });
};

export const mountToyKyber = (root: HTMLElement): void => {
  const freshKeys = keygen(TOY, Math.random);
  const freshBits = randBits();
  let state: State = {
    keys: freshKeys,
    bits: freshBits,
    ct: encaps(TOY, freshKeys, freshBits, Math.random),
    compress: false,
  };

  const canvas = h('canvas', { width: String(CW), height: String(CH) });
  const derivation = h('div', { class: 'phi-derivation' });
  const status = h('div', { class: 'widget-status' });

  const controls = h(
    'div',
    { class: 'widget-controls' },
    h(
      'button',
      {
        onclick: () => {
          const keys = keygen(TOY, Math.random);
          state = { ...state, keys, ct: encaps(TOY, keys, state.bits, Math.random) };
          rerender();
        },
      },
      'новые ключи',
    ),
    h(
      'button',
      {
        onclick: () => {
          const bits = randBits();
          state = { ...state, bits, ct: encaps(TOY, state.keys, bits, Math.random) };
          rerender();
        },
      },
      'новое сообщение',
    ),
    h(
      'button',
      {
        onclick: () => {
          state = { ...state, ct: encaps(TOY, state.keys, state.bits, Math.random) };
          rerender();
        },
      },
      'переинкапсулировать',
    ),
    h(
      'label',
      {},
      'сжимать v до 3 бит:',
      h('input', {
        type: 'checkbox',
        onchange: (e: Event) => {
          state = { ...state, compress: (e.target as HTMLInputElement).checked };
          rerender();
        },
      }),
    ),
  );

  const rerender = (): void => {
    const { keys, bits, ct, compress } = state;
    const { q } = TOY;
    const v = compress ? compressRound(ct.v, 3, q) : ct.v;
    const dec = decaps(TOY, { u: ct.u, v }, keys.s);
    const errors = dec.bits.filter((b, i) => b !== bits[i]).length;
    const maxNoise = Math.max(
      ...dec.w.map((c, i) => Math.abs(c - (bits[i] ?? 0) * Math.round(q / 2)) % q),
    );

    replaceChildrenOf(
      derivation,
      h('div', {}, `R_${q} = Z_${q}[x]/(x^${TOY.n}+1) · секрет s = ${polyStr(keys.s, q)}`),
      h('div', {}, `ключи: a случайный, b = a·s + e, e = ${polyStr(keys.e, q)}`),
      h('div', {}, `инкапсуляция m = (${bits.join('')}): u = a·r + e₁, v = b·r + e₂ + ⌊q/2⌉·m${compress ? ' → v сжат до 3 бит' : ''}`),
      h('div', {}, `декапсуляция: w = v − u·s = e·r + e₂ − s·e₁${compress ? ' + ошибка округления' : ''} + ⌊q/2⌉·m`),
    );
    replaceChildrenOf(
      status,
      h(
        'span',
        { class: 'hl' },
        errors === 0
          ? `все ${TOY.n} бит расшифрованы верно · max |шум| = ${maxNoise} < q/4 ≈ ${(q / 4).toFixed(0)}`
          : `ошибок: ${errors} — шум пересёк q/4`,
      ),
      compress ? ' · сжатие съело часть бюджета' : '',
    );
    draw(canvas, dec.w, bits, dec.bits);
  };

  rerender();
  root.append(
    h('div', { class: 'widget-title' }, 'toy-Kyber: KEM на Ring-LWE по шагам'),
    h(
      'div',
      { class: 'widget-body' },
      controls,
      derivation,
      canvas,
      status,
      h(
        'div',
        { class: 'widget-hint' },
        'столбец у нуля — бит 0, у ±q/2 — бит 1; расстояние от столбца до идеала — накопленный шум. Включите сжатие и посмотрите, как столбцы уходят от идеальных уровней',
      ),
    ),
  );
  root.classList.add('widget');
};

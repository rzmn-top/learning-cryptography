/**
 * Сравнение размеров: открытый ключ и шифртекст/подпись классических
 * и постквантовых схем. Логарифмическая шкала по умолчанию —
 * иначе McEliece делает остальных невидимыми.
 */

import { h, replaceChildrenOf } from '../ui/dom';

const CSS = {
  ink: '#16130e',
  acid: '#b8e600',
  pink: '#ff2f92',
  violet: '#6a1fd0',
  paper: '#f4efe2',
  dim: '#5a5648',
} as const;

interface Scheme {
  readonly name: string;
  readonly pk: number; // байты
  readonly out: number; // шифртекст (KEM) или подпись
  readonly family: 'classical' | 'lattice' | 'hash' | 'code';
}

const KEMS: readonly Scheme[] = [
  { name: 'X25519', pk: 32, out: 32, family: 'classical' },
  { name: 'RSA-3072', pk: 384, out: 384, family: 'classical' },
  { name: 'ML-KEM-512', pk: 800, out: 768, family: 'lattice' },
  { name: 'ML-KEM-768', pk: 1184, out: 1088, family: 'lattice' },
  { name: 'ML-KEM-1024', pk: 1568, out: 1568, family: 'lattice' },
  { name: 'HQC-128', pk: 2249, out: 4433, family: 'code' },
  { name: 'McEliece-348864', pk: 261120, out: 96, family: 'code' },
];

const SIGS: readonly Scheme[] = [
  { name: 'Ed25519', pk: 32, out: 64, family: 'classical' },
  { name: 'ECDSA P-256', pk: 64, out: 64, family: 'classical' },
  { name: 'RSA-3072', pk: 384, out: 384, family: 'classical' },
  { name: 'Falcon-512', pk: 897, out: 666, family: 'lattice' },
  { name: 'ML-DSA-44', pk: 1312, out: 2420, family: 'lattice' },
  { name: 'ML-DSA-65', pk: 1952, out: 3309, family: 'lattice' },
  { name: 'SLH-DSA-128s', pk: 32, out: 7856, family: 'hash' },
  { name: 'SLH-DSA-128f', pk: 32, out: 17088, family: 'hash' },
];

const FAMILY_COLOR: Record<Scheme['family'], string> = {
  classical: CSS.pink,
  lattice: CSS.acid,
  hash: CSS.violet,
  code: CSS.paper,
};

const CW = 520;
const ROW = 34;

interface State {
  readonly kind: 'kem' | 'sig';
  readonly log: boolean;
}

const draw = (canvas: HTMLCanvasElement, s: State): void => {
  const data = s.kind === 'kem' ? KEMS : SIGS;
  const ctx = canvas.getContext('2d');
  if (ctx === null) return;
  const chH = data.length * ROW + 30;
  canvas.height = chH;
  ctx.fillStyle = CSS.ink;
  ctx.fillRect(0, 0, CW, chH);
  ctx.font = '12px "PT Mono", monospace';

  const maxVal = Math.max(...data.flatMap((d) => [d.pk, d.out]));
  const scale = (v: number): number => {
    const usable = CW - 190;
    if (s.log) return (Math.log10(Math.max(1, v)) / Math.log10(maxVal)) * usable;
    return (v / maxVal) * usable;
  };
  const fmt = (v: number): string => (v >= 1024 ? `${(v / 1024).toFixed(v >= 10240 ? 0 : 1)} КиБ` : `${v} Б`);

  data.forEach((d, i) => {
    const y = 24 + i * ROW;
    ctx.fillStyle = CSS.paper;
    ctx.fillText(d.name, 6, y + 10);
    // ключ
    ctx.fillStyle = FAMILY_COLOR[d.family];
    ctx.fillRect(150, y, Math.max(2, Math.round(scale(d.pk))), 9);
    // шифртекст/подпись — штрихованная полоса тем же цветом, ниже
    const w2 = Math.max(2, Math.round(scale(d.out)));
    for (let x = 0; x < w2; x += 5) {
      ctx.fillRect(150 + x, y + 12, 3, 9);
    }
    ctx.fillStyle = CSS.dim;
    ctx.fillText(`pk ${fmt(d.pk)} · ${s.kind === 'kem' ? 'ct' : 'sig'} ${fmt(d.out)}`, 150, y + 32 - 2);
  });
  ctx.fillStyle = CSS.paper;
  ctx.fillText(s.log ? 'шкала: log' : 'шкала: линейная', CW - 120, 14);
};

export const mountKeySizes = (root: HTMLElement): void => {
  let state: State = { kind: 'kem', log: true };

  const canvas = h('canvas', { width: String(CW), height: '300' });
  const status = h('div', { class: 'widget-status' });

  const controls = h(
    'div',
    { class: 'widget-controls' },
    h(
      'label',
      {},
      'тип:',
      h(
        'select',
        {
          onchange: (e: Event) => {
            state = { ...state, kind: (e.target as HTMLSelectElement).value as State['kind'] };
            rerender();
          },
        },
        h('option', { value: 'kem', selected: true }, 'KEM / обмен ключами'),
        h('option', { value: 'sig' }, 'подписи'),
      ),
    ),
    h(
      'label',
      {},
      'лог-шкала:',
      h('input', {
        type: 'checkbox',
        checked: true,
        onchange: (e: Event) => {
          state = { ...state, log: (e.target as HTMLInputElement).checked };
          rerender();
        },
      }),
    ),
  );

  const legend = h(
    'div',
    { class: 'legend' },
    h('span', {}, h('span', { class: 'chip', style: `background:${CSS.pink}` }), 'классика (ломается Шором)'),
    h('span', {}, h('span', { class: 'chip', style: `background:${CSS.acid}` }), 'решётки'),
    h('span', {}, h('span', { class: 'chip', style: `background:${CSS.violet}` }), 'хэши'),
    h('span', {}, h('span', { class: 'chip', style: `background:${CSS.paper}` }), 'коды'),
  );

  const rerender = (): void => {
    replaceChildrenOf(
      status,
      h(
        'span',
        { class: 'hl' },
        state.kind === 'kem'
          ? 'сплошная полоса — открытый ключ, штриховая — шифртекст (FIPS 203, RFC; уровень ~128 бит)'
          : 'сплошная — открытый ключ, штриховая — подпись (FIPS 204/205)',
      ),
    );
    draw(canvas, state);
  };

  rerender();
  root.append(
    h('div', { class: 'widget-title' }, 'цена постквантовости: размеры ключей и выходов'),
    h(
      'div',
      { class: 'widget-body' },
      controls,
      canvas,
      legend,
      status,
      h(
        'div',
        { class: 'widget-hint' },
        'выключите лог-шкалу, чтобы почувствовать масштаб McEliece; заметьте SLH-DSA: ключ 32 байта — подпись 7–17 КиБ',
      ),
    ),
  );
  root.classList.add('widget');
};

/**
 * Таймлайн криптографии: ключевые события с привязкой к главам курса.
 * События расставлены равномерно (не по годам — после 1970-х стало бы
 * не читаемо); клик по точке раскрывает описание.
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

interface Event {
  readonly year: string;
  readonly title: string;
  readonly detail: string;
  readonly chapter: string;
  readonly kind: 'build' | 'break' | 'shift';
}

const EVENTS: readonly Event[] = [
  { year: '1917', title: 'шифр Вернама', detail: 'одноразовый блокнот; в 1949 Шеннон докажет его совершенную секретность', chapter: 'гл. 3', kind: 'build' },
  { year: '1940-е', title: 'взлом Энигмы', detail: 'Блетчли-парк: криптоанализ решает исход конвойной войны; рождение вычислительной техники', chapter: 'гл. 0', kind: 'break' },
  { year: '1949', title: 'Шеннон', detail: '«Теория связи в секретных системах»: криптография становится математикой', chapter: 'гл. 3', kind: 'shift' },
  { year: '1976', title: 'Diffie–Hellman', detail: 'обмен ключами без общего секрета; асимметричная криптография', chapter: 'гл. 4', kind: 'build' },
  { year: '1977', title: 'RSA', detail: 'шифрование и подпись на факторизации', chapter: 'гл. 4', kind: 'build' },
  { year: '1982', title: 'LLL', detail: 'редукция решёток ломает ранцевые схемы — и через 40 лет станет фундаментом PQC', chapter: 'гл. 8', kind: 'break' },
  { year: '1985', title: 'эллиптические кривые', detail: 'Коблиц и Миллер: та же DLP при ключах в разы короче', chapter: 'гл. 5', kind: 'build' },
  { year: '1994', title: 'алгоритм Шора', detail: 'факторизация и DLP за полином на квантовом компьютере — которого ещё нет', chapter: 'гл. 7', kind: 'break' },
  { year: '1996', title: 'алгоритм Гровера', detail: 'квадратичное ускорение перебора: симметрике достаточно удвоить ключ', chapter: 'гл. 7', kind: 'break' },
  { year: '2001', title: 'AES', detail: 'Rijndael выигрывает открытый конкурс NIST — модель для всех будущих', chapter: 'гл. 3', kind: 'build' },
  { year: '2005', title: 'LWE', detail: 'Регев: обучение с ошибками, худший случай ≤ средний; криптография решёток становится строгой', chapter: 'гл. 8', kind: 'shift' },
  { year: '2009', title: 'FHE', detail: 'Джентри: полностью гомоморфное шифрование через bootstrapping', chapter: 'гл. 10', kind: 'build' },
  { year: '2010', title: 'взлом PS3', detail: 'fail0verflow: повтор нонса ECDSA раскрывает корневой ключ Sony', chapter: 'гл. 5', kind: 'break' },
  { year: '2016', title: 'конкурс NIST PQC', detail: '69 заявок; начинается публичный отбор постквантовых стандартов', chapter: 'гл. 9', kind: 'shift' },
  { year: '2022', title: 'падение SIKE и Rainbow', detail: 'два финалиста конкурса сломаны классически — за час и за выходные', chapter: 'гл. 9', kind: 'break' },
  { year: '2024', title: 'FIPS 203–205', detail: 'ML-KEM, ML-DSA, SLH-DSA — постквантовые стандарты; гибриды включаются в TLS', chapter: 'гл. 9', kind: 'shift' },
];

const KIND_COLOR: Record<Event['kind'], string> = {
  build: CSS.acid,
  break: CSS.pink,
  shift: CSS.violet,
};

const CW = 660;
const CH = 120;

const slotX = (i: number): number => 24 + (i / (EVENTS.length - 1)) * (CW - 48);

const draw = (canvas: HTMLCanvasElement, selected: number): void => {
  const ctx = canvas.getContext('2d');
  if (ctx === null) return;
  ctx.fillStyle = CSS.ink;
  ctx.fillRect(0, 0, CW, CH);

  // ось
  ctx.strokeStyle = CSS.dim;
  ctx.beginPath();
  ctx.moveTo(12, CH / 2);
  ctx.lineTo(CW - 12, CH / 2);
  ctx.stroke();

  ctx.font = '11px "PT Mono", monospace';
  EVENTS.forEach((ev, i) => {
    const x = slotX(i);
    const active = i === selected;
    const size = active ? 9 : 5;
    ctx.fillStyle = KIND_COLOR[ev.kind];
    ctx.fillRect(Math.round(x - size / 2), Math.round(CH / 2 - size / 2), size, size);
    // год — поочерёдно сверху и снизу, чтобы не слипались
    ctx.fillStyle = active ? CSS.paper : CSS.dim;
    const label = ev.year;
    const ty = i % 2 === 0 ? CH / 2 - 16 : CH / 2 + 24;
    ctx.save();
    ctx.translate(x, ty);
    ctx.rotate(-Math.PI / 5);
    ctx.fillText(label, -ctx.measureText(label).width / 2, 0);
    ctx.restore();
  });
};

export const mountTimeline = (root: HTMLElement): void => {
  let selected = 3; // Diffie–Hellman

  const canvas = h('canvas', { width: String(CW), height: String(CH) });
  const detail = h('div', { class: 'phi-derivation' });

  const toIndex = (e: MouseEvent): number => {
    const rect = canvas.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * CW;
    let best = 0;
    let bestD = Infinity;
    EVENTS.forEach((_, i) => {
      const d = Math.abs(slotX(i) - px);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    return best;
  };

  canvas.addEventListener('click', (e: MouseEvent) => {
    selected = toIndex(e);
    rerender();
  });
  canvas.style.cursor = 'pointer';

  const rerender = (): void => {
    const ev = EVENTS[selected];
    replaceChildrenOf(
      detail,
      h('div', {}, ev === undefined ? '' : `${ev.year} · ${ev.title} → ${ev.chapter}`),
      h('div', {}, ev?.detail ?? ''),
    );
    draw(canvas, selected);
  };

  rerender();
  root.append(
    h('div', { class: 'widget-title' }, 'таймлайн: сто лет наступлений и обороны'),
    h(
      'div',
      { class: 'widget-body' },
      canvas,
      detail,
      h(
        'div',
        { class: 'legend' },
        h('span', {}, h('span', { class: 'chip', style: `background:${CSS.acid}` }), 'построено'),
        h('span', {}, h('span', { class: 'chip', style: `background:${CSS.pink}` }), 'сломано'),
        h('span', {}, h('span', { class: 'chip', style: `background:${CSS.violet}` }), 'сдвиг парадигмы'),
      ),
      h(
        'div',
        { class: 'widget-hint' },
        'клик по точке — подробность; заметьте ритм: каждое «сломано» рождает следующее «построено»',
      ),
    ),
  );
  root.classList.add('widget');
};

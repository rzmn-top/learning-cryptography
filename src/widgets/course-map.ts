/**
 * Карта курса: граф зависимостей глав. Узел — глава, ребро — пререквизит.
 * Наведение подсвечивает главу и её входящие рёбра, клик открывает главу.
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

interface ChapterNode {
  readonly no: number;
  readonly title: string;
  readonly href: string;
  /** Координаты на холсте (логическая сетка). */
  readonly x: number;
  readonly y: number;
}

const NODES: readonly ChapterNode[] = [
  { no: 0, title: 'введение', href: 'ch00-intro.html', x: 40, y: 120 },
  { no: 1, title: 'группы', href: 'ch01-groups.html', x: 120, y: 60 },
  { no: 2, title: 'кольца', href: 'ch02-rings.html', x: 200, y: 60 },
  { no: 3, title: 'симметрика', href: 'ch03-symmetric.html', x: 120, y: 190 },
  { no: 4, title: 'RSA · DH', href: 'ch04-rsa-dh.html', x: 280, y: 120 },
  { no: 5, title: 'кривые', href: 'ch05-elliptic.html', x: 360, y: 60 },
  { no: 6, title: 'кубиты', href: 'ch06-qubits.html', x: 360, y: 190 },
  { no: 7, title: 'Шор · Гровер', href: 'ch07-shor-grover.html', x: 440, y: 120 },
  { no: 8, title: 'решётки', href: 'ch08-lattices.html', x: 520, y: 60 },
  { no: 9, title: 'PQC', href: 'ch09-pqc.html', x: 600, y: 120 },
  { no: 10, title: 'FHE', href: 'ch10-fhe.html', x: 600, y: 220 },
];

/** Рёбра «пререквизит → глава» (ключевые, без транзитивных). */
const EDGES: readonly (readonly [number, number])[] = [
  [0, 1],
  [0, 3],
  [1, 2],
  [2, 4],
  [3, 4],
  [4, 5],
  [4, 6],
  [5, 6],
  [6, 7],
  [2, 7],
  [7, 8],
  [2, 8],
  [8, 9],
  [3, 9],
  [8, 10],
  [2, 10],
];

const CW = 660;
const CH = 260;
const NODE_R = 13;

const nodeAt = (px: number, py: number): ChapterNode | undefined =>
  NODES.find((n) => Math.abs(n.x - px) <= NODE_R + 4 && Math.abs(n.y - py) <= NODE_R + 4);

const draw = (canvas: HTMLCanvasElement, hover: number | undefined): void => {
  const ctx = canvas.getContext('2d');
  if (ctx === null) return;
  ctx.fillStyle = CSS.ink;
  ctx.fillRect(0, 0, CW, CH);

  // рёбра
  for (const [from, to] of EDGES) {
    const a = NODES.find((n) => n.no === from);
    const b = NODES.find((n) => n.no === to);
    if (a === undefined || b === undefined) continue;
    const active = hover !== undefined && (to === hover || from === hover);
    ctx.strokeStyle = active ? CSS.pink : CSS.dim;
    ctx.lineWidth = active ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    // стрелка-точка у конца
    const t = 0.82;
    ctx.fillStyle = active ? CSS.pink : CSS.dim;
    ctx.fillRect(
      Math.round(a.x + (b.x - a.x) * t) - 1,
      Math.round(a.y + (b.y - a.y) * t) - 1,
      3,
      3,
    );
  }
  ctx.lineWidth = 1;

  // узлы
  ctx.font = '13px "PT Mono", monospace';
  for (const n of NODES) {
    const active = n.no === hover;
    ctx.fillStyle = active ? CSS.acid : CSS.ink;
    ctx.strokeStyle = active ? CSS.acid : CSS.paper;
    ctx.fillRect(n.x - NODE_R, n.y - NODE_R, NODE_R * 2, NODE_R * 2);
    ctx.strokeRect(n.x - NODE_R + 0.5, n.y - NODE_R + 0.5, NODE_R * 2 - 1, NODE_R * 2 - 1);
    ctx.fillStyle = active ? CSS.ink : CSS.paper;
    const label = String(n.no).padStart(2, '0');
    ctx.fillText(label, n.x - ctx.measureText(label).width / 2, n.y + 4);
    ctx.fillStyle = active ? CSS.acid : CSS.dim;
    ctx.fillText(n.title, n.x - ctx.measureText(n.title).width / 2, n.y + NODE_R + 14);
  }
};

export const mountCourseMap = (root: HTMLElement): void => {
  let hover: number | undefined;

  const canvas = h('canvas', { width: String(CW), height: String(CH) });
  const status = h('div', { class: 'widget-status' });

  const toLogical = (e: MouseEvent): readonly [number, number] => {
    const rect = canvas.getBoundingClientRect();
    return [
      ((e.clientX - rect.left) / rect.width) * CW,
      ((e.clientY - rect.top) / rect.height) * CH,
    ];
  };

  canvas.addEventListener('mousemove', (e: MouseEvent) => {
    const [px, py] = toLogical(e);
    const n = nodeAt(px, py);
    const next = n?.no;
    if (next !== hover) {
      hover = next;
      canvas.style.cursor = n === undefined ? 'default' : 'pointer';
      rerender();
    }
  });
  canvas.addEventListener('mouseleave', () => {
    hover = undefined;
    rerender();
  });
  canvas.addEventListener('click', (e: MouseEvent) => {
    const [px, py] = toLogical(e);
    const n = nodeAt(px, py);
    if (n !== undefined) window.location.href = n.href;
  });

  const rerender = (): void => {
    const n = NODES.find((v) => v.no === hover);
    const prereqs = n === undefined ? [] : EDGES.filter(([, to]) => to === n.no).map(([f]) => f);
    replaceChildrenOf(
      status,
      n === undefined
        ? ' '
        : h(
            'span',
            { class: 'hl' },
            `глава ${n.no} «${n.title}» ← пререквизиты: ${prereqs.length === 0 ? 'нет' : prereqs.join(', ')}`,
          ),
    );
    draw(canvas, hover);
  };

  rerender();
  root.append(
    h('div', { class: 'widget-title' }, 'карта курса: главы и зависимости'),
    h(
      'div',
      { class: 'widget-body' },
      canvas,
      status,
      h(
        'div',
        { class: 'widget-hint' },
        'две нити: алгебра (1→2→4→5) и квант (6→7), сходятся в решётках (8) — фундаменте PQC (9) и FHE (10)',
      ),
    ),
  );
  root.classList.add('widget');
};

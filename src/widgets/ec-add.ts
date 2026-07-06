/**
 * Интерактивное сложение точек на кривой y² = x³ + ax + b над R.
 * Пользователь перетаскивает P и Q по кривой; отрисовываются секущая
 * (или касательная при удвоении), третья точка пересечения и её
 * отражение R = P + Q.
 */

import { h, replaceChildrenOf } from '../ui/dom';
import { CurveR, PointR, yAt, addGeometry } from '../lib/math/ec-real';

interface State {
  readonly curve: CurveR;
  readonly px: number; // x-координаты P и Q (точки живут на кривой)
  readonly pUpper: boolean; // верхняя/нижняя ветвь
  readonly qx: number;
  readonly qUpper: boolean;
  readonly dragging: 'P' | 'Q' | null;
}

const CSS = {
  ink: '#16130e',
  soft: '#4c463b',
  rule: '#c9c0aa',
  acid: '#b8e600',
  acidDeep: '#7da300',
  pink: '#ff2f92',
  violet: '#6a1fd0',
  paper: '#f4efe2',
} as const;

const VIEW = 6; // диапазон [−VIEW, VIEW] по обеим осям
const SIZE = 460;

const toScreen = (x: number, y: number): readonly [number, number] => [
  ((x + VIEW) / (2 * VIEW)) * SIZE,
  SIZE - ((y + VIEW) / (2 * VIEW)) * SIZE,
];
const fromScreenX = (sx: number): number => (sx / SIZE) * 2 * VIEW - VIEW;

const pointOnCurve = (c: CurveR, x: number, upper: boolean): PointR => {
  const ys = yAt(c, x);
  if (ys.length === 0) return null;
  const y = upper ? Math.max(...ys) : Math.min(...ys);
  return { x, y };
};

/** Ближайший к x аргумент, где кривая определена (rhs ≥ 0). */
const projectX = (c: CurveR, x: number): number => {
  if (yAt(c, x).length > 0) return Math.max(-VIEW, Math.min(VIEW, x));
  for (let d = 0.03; d < 2 * VIEW; d += 0.03) {
    if (yAt(c, x + d).length > 0) return Math.min(VIEW, x + d);
    if (yAt(c, x - d).length > 0) return Math.max(-VIEW, x - d);
  }
  return x;
};

const drawCurve = (ctx: CanvasRenderingContext2D, c: CurveR): void => {
  // Кривая рисуется по связным сегментам, где rhs = x³+ax+b ≥ 0.
  // Внутри сегмента строим замкнутый контур: верхняя ветвь слева-направо,
  // затем нижняя справа-налево. На корнях (rhs = 0) ветви смыкаются на оси x —
  // это убирает разрыв у y ≈ 0.
  const rhsOf = (x: number): number => x ** 3 + c.a * x + c.b;
  const STEP = (2 * VIEW) / (SIZE * 3); // мельче пикселя — гладко у поворотов

  interface Seg { readonly xs: number[]; readonly leftRoot: boolean; readonly rightRoot: boolean; }
  const segments: Seg[] = [];
  let cur: number[] | null = null;
  for (let x = -VIEW; x <= VIEW + STEP; x += STEP) {
    const pos = rhsOf(x) >= 0;
    if (pos && cur === null) {
      cur = [];
      // левая граница — корень, если сегмент начался не от края экрана
      segments.push({ xs: cur, leftRoot: x > -VIEW + STEP, rightRoot: false });
    }
    if (pos && cur !== null) cur.push(x);
    if (!pos && cur !== null) {
      const last = segments[segments.length - 1];
      if (last !== undefined) (last as { rightRoot: boolean }).rightRoot = true;
      cur = null;
    }
  }

  ctx.strokeStyle = CSS.ink;
  ctx.lineWidth = 2;
  for (const seg of segments) {
    if (seg.xs.length < 2) continue;
    ctx.beginPath();
    // верхняя ветвь L→R
    seg.xs.forEach((x, i) => {
      const y = Math.sqrt(Math.max(0, rhsOf(x)));
      const [px, py] = toScreen(x, y);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    // нижняя ветвь R→L
    for (let i = seg.xs.length - 1; i >= 0; i -= 1) {
      const x = seg.xs[i] as number;
      const y = -Math.sqrt(Math.max(0, rhsOf(x)));
      const [px, py] = toScreen(x, y);
      ctx.lineTo(px, py);
    }
    if (seg.leftRoot) ctx.closePath(); // овал / левое смыкание на корне
    ctx.stroke();
  }
};

const drawAxes = (ctx: CanvasRenderingContext2D): void => {
  ctx.strokeStyle = CSS.rule;
  ctx.lineWidth = 1;
  const [ox, oy] = toScreen(0, 0);
  ctx.beginPath();
  ctx.moveTo(0, oy);
  ctx.lineTo(SIZE, oy);
  ctx.moveTo(ox, 0);
  ctx.lineTo(ox, SIZE);
  ctx.stroke();
};

const dot = (ctx: CanvasRenderingContext2D, p: PointR, color: string, label: string): void => {
  if (p === null) return;
  const [sx, sy] = toScreen(p.x, p.y);
  ctx.beginPath();
  ctx.arc(sx, sy, 6, 0, 2 * Math.PI);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = CSS.ink;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = CSS.ink;
  ctx.font = 'bold 16px STIX Two Text, serif';
  ctx.fillText(label, sx + 9, sy - 8);
};

export const mountEcAdd = (root: HTMLElement): void => {
  let state: State = {
    curve: { a: -1, b: 3 },
    px: -1.6,
    pUpper: true,
    qx: 1.1,
    qUpper: true,
    dragging: null,
  };

  const canvas = h('canvas', { width: String(SIZE), height: String(SIZE) });
  const body = h('div', { class: 'widget-body' });

  const getP = (): PointR => pointOnCurve(state.curve, state.px, state.pUpper);
  const getQ = (): PointR => pointOnCurve(state.curve, state.qx, state.qUpper);

  const redraw = (): void => {
    const ctx = canvas.getContext('2d');
    if (ctx === null) return;
    ctx.fillStyle = CSS.paper;
    ctx.fillRect(0, 0, SIZE, SIZE);
    drawAxes(ctx);
    drawCurve(ctx, state.curve);

    const P = getP();
    const Q = getQ();
    const geo = addGeometry(state.curve, P, Q);

    // прямая P–Q (секущая или касательная)
    if (P !== null && Q !== null) {
      if (geo.slope === null) {
        // вертикаль: P + (−P) = O
        const [sx] = toScreen(P.x, 0);
        ctx.strokeStyle = CSS.violet;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(sx, 0);
        ctx.lineTo(sx, SIZE);
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        const m = geo.slope;
        const x0 = -VIEW;
        const y0 = P.y + m * (x0 - P.x);
        const x1 = VIEW;
        const y1 = P.y + m * (x1 - P.x);
        const [ax, ay] = toScreen(x0, y0);
        const [bx, by] = toScreen(x1, y1);
        ctx.strokeStyle = CSS.pink;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.stroke();

        // вертикаль от третьей точки к результату (отражение)
        if (geo.third !== null && geo.result !== null) {
          const [tx, ty] = toScreen(geo.third.x, geo.third.y);
          const [, ry] = toScreen(geo.result.x, geo.result.y);
          ctx.strokeStyle = CSS.acidDeep;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(tx, ty);
          ctx.lineTo(tx, ry);
          ctx.stroke();
          ctx.setLineDash([]);
          // третья точка (−R) полупрозрачно
          ctx.beginPath();
          ctx.arc(tx, ty, 4, 0, 2 * Math.PI);
          ctx.fillStyle = CSS.soft;
          ctx.fill();
        }
      }
    }

    const isDouble = Math.abs(state.px - state.qx) < 1e-6 && state.pUpper === state.qUpper;
    if (isDouble) {
      dot(ctx, P, CSS.acid, 'P = Q');
    } else {
      dot(ctx, P, CSS.acid, 'P');
      dot(ctx, Q, CSS.acid, 'Q');
    }
    dot(ctx, geo.result, CSS.pink, 'R = P+Q');
  };

  const nearest = (mx: number, my: number): 'P' | 'Q' | null => {
    const P = getP();
    const Q = getQ();
    const near = (pt: PointR): number => {
      if (pt === null) return Infinity;
      const [sx, sy] = toScreen(pt.x, pt.y);
      return Math.hypot(sx - mx, sy - my);
    };
    const dP = near(P);
    const dQ = near(Q);
    if (Math.min(dP, dQ) > 22) return null;
    return dP <= dQ ? 'P' : 'Q';
  };

  const pointerXY = (e: PointerEvent): readonly [number, number] => {
    const rect = canvas.getBoundingClientRect();
    return [
      ((e.clientX - rect.left) / rect.width) * SIZE,
      ((e.clientY - rect.top) / rect.height) * SIZE,
    ];
  };

  canvas.addEventListener('pointerdown', (e) => {
    const [mx, my] = pointerXY(e);
    const which = nearest(mx, my);
    if (which !== null) {
      state = { ...state, dragging: which };
      canvas.setPointerCapture(e.pointerId);
    }
  });

  canvas.addEventListener('pointermove', (e) => {
    if (state.dragging === null) return;
    const [mx, my] = pointerXY(e);
    const x = Math.max(-VIEW, Math.min(VIEW, fromScreenX(mx)));
    const worldY = VIEW - (my / SIZE) * 2 * VIEW;
    const vx = projectX(state.curve, x);
    const upper = worldY >= 0;
    state = state.dragging === 'P'
      ? { ...state, px: vx, pUpper: upper }
      : { ...state, qx: vx, qUpper: upper };
    redraw();
    updateStatus();
  });

  const endDrag = (): void => {
    if (state.dragging !== null) state = { ...state, dragging: null };
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  const status = h('div', { class: 'widget-status' });
  const fmt = (p: PointR): string => (p === null ? 'O (беск.)' : `(${p.x.toFixed(2)}, ${p.y.toFixed(2)})`);

  const updateStatus = (): void => {
    const P = getP();
    const Q = getQ();
    const geo = addGeometry(state.curve, P, Q);
    const isDouble = Math.abs(state.px - state.qx) < 1e-6 && state.pUpper === state.qUpper;
    replaceChildrenOf(
      status,
      h('span', { class: 'hl' }, `P + Q = ${fmt(geo.result)}`),
      `  P = ${fmt(P)}, Q = ${fmt(Q)}`,
      isDouble ? '  · совпали ⇒ касательная (удвоение 2P)' : '',
      geo.result === null ? '  · P = −Q ⇒ сумма = O' : '',
    );
  };

  const rerender = (): void => {
    const curveSelect = h(
      'label',
      {},
      'кривая:',
      h(
        'select',
        {
          onchange: (e: Event) => {
            const [a, b] = (e.target as HTMLSelectElement).value.split(',').map(Number);
            const curve: CurveR = { a: a ?? -1, b: b ?? 3 };
            // перенести точки на допустимые x новой кривой
            state = { ...state, curve, px: projectX(curve, state.px), qx: projectX(curve, state.qx) };
            redraw();
            updateStatus();
          },
        },
        h('option', { value: '-1,3' }, 'y² = x³ − x + 3'),
        h('option', { value: '-3,3' }, 'y² = x³ − 3x + 3'),
        h('option', { value: '0,2' }, 'y² = x³ + 2'),
        h('option', { value: '-2,0' }, 'y² = x³ − 2x'),
      ),
    );
    const controls = h(
      'div',
      { class: 'widget-controls' },
      curveSelect,
      h(
        'button',
        {
          onclick: () => {
            state = { ...state, px: state.qx, pUpper: state.qUpper };
            redraw();
            updateStatus();
          },
        },
        'P := Q (удвоение)',
      ),
    );
    replaceChildrenOf(
      body,
      controls,
      canvas,
      status,
      h('div', { class: 'widget-hint' }, 'перетаскивайте точки P и Q вдоль кривой мышью · секущая (розовая) пересекает кривую в третьей точке, её отражение — сумма R'),
    );
    redraw();
    updateStatus();
  };

  rerender();
  root.append(h('div', { class: 'widget-title' }, 'сложение точек над ℝ'), body);
  root.classList.add('widget');
};

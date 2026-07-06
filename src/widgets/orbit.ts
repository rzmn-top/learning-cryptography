/**
 * Орбита элемента: n точек на окружности, шаги a, a∘a, a∘a∘a, …
 * Генератор обходит всё; не-генератор замыкается в правильный «под-полигон» —
 * это и есть подгруппа. Видно теорему Лагранжа глазами.
 */

import { h, replaceChildrenOf } from '../ui/dom';
import { numParam } from '../ui/widgets';
import { FiniteGroup, Zn, ZnStar, orbit, isGenerator } from '../lib/math/group';

type Kind = 'add' | 'mul';

interface State {
  readonly n: number;
  readonly kind: Kind;
  readonly a: number;
  readonly step: number; // сколько шагов орбиты показано
}

const CSS = {
  ink: '#16130e',
  soft: '#4c463b',
  rule: '#c9c0aa',
  acid: '#b8e600',
  pink: '#ff2f92',
  paper: '#f4efe2',
} as const;

const makeGroup = (s: State): FiniteGroup<number> => (s.kind === 'add' ? Zn(s.n) : ZnStar(s.n));

const positions = (
  g: FiniteGroup<number>,
  cx: number,
  cy: number,
  r: number,
): ReadonlyMap<number, readonly [number, number]> => {
  const m = new Map<number, readonly [number, number]>();
  const k = g.elements.length;
  g.elements.forEach((el, i) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / k;
    m.set(el, [cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
  });
  return m;
};

const draw = (canvas: HTMLCanvasElement, g: FiniteGroup<number>, s: State): void => {
  const ctx = canvas.getContext('2d');
  if (ctx === null) return;
  const w = canvas.width;
  const hgt = canvas.height;
  const cx = w / 2;
  const cy = hgt / 2;
  const r = Math.min(w, hgt) / 2 - 36;

  ctx.clearRect(0, 0, w, hgt);
  const pos = positions(g, cx, cy, r);
  const orb = orbit(g, s.a); // [e, a, a², …]
  const path = [...orb.slice(1), g.identity]; // a → a² → … → e
  const shown = path.slice(0, Math.min(s.step, path.length));

  // хорды орбиты
  ctx.lineWidth = 2;
  let prev = pos.get(g.identity);
  // старт: e → a → a² ...
  const chain = [g.identity, ...shown];
  for (let i = 1; i < chain.length; i += 1) {
    const from = pos.get(chain[i - 1] as number);
    const to = pos.get(chain[i] as number);
    if (from === undefined || to === undefined) continue;
    ctx.strokeStyle = i === chain.length - 1 ? CSS.pink : CSS.soft;
    ctx.beginPath();
    ctx.moveTo(from[0], from[1]);
    ctx.lineTo(to[0], to[1]);
    ctx.stroke();
    prev = to;
  }
  void prev;

  // точки
  const inOrbit = new Set(chain.map((x) => g.show(x)));
  for (const el of g.elements) {
    const p = pos.get(el);
    if (p === undefined) continue;
    const hit = inOrbit.has(g.show(el));
    ctx.beginPath();
    ctx.arc(p[0], p[1], hit ? 10 : 6, 0, 2 * Math.PI);
    ctx.fillStyle = hit ? CSS.acid : CSS.paper;
    ctx.fill();
    ctx.strokeStyle = CSS.ink;
    ctx.lineWidth = hit ? 2 : 1;
    ctx.stroke();

    const lx = cx + (p[0] - cx) * 1.16;
    const ly = cy + (p[1] - cy) * 1.16;
    ctx.fillStyle = CSS.ink;
    ctx.font = '15px VT323, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(g.show(el), lx, ly);
  }
};

export const mountOrbit = (root: HTMLElement): void => {
  const initialN = numParam(root, 'n', 12);
  let state: State = {
    n: initialN,
    kind: (root.dataset['kind'] as Kind | undefined) ?? 'add',
    a: numParam(root, 'a', 5),
    step: 1,
  };
  let timer: number | undefined;

  const canvas = h('canvas', { width: '420', height: '420' });
  const body = h('div', { class: 'widget-body' });

  const stopAnim = (): void => {
    if (timer !== undefined) window.clearInterval(timer);
    timer = undefined;
  };

  const rerender = (): void => {
    const g = makeGroup(state);
    const safeA = g.elements.some((x) => g.eq(x, state.a))
      ? state.a
      : (g.elements[1] ?? g.identity);
    state = { ...state, a: safeA };

    const orb = orbit(g, state.a);
    const gen = isGenerator(g, state.a);

    const controls = h(
      'div',
      { class: 'widget-controls' },
      h(
        'label',
        {},
        'группа:',
        h(
          'select',
          {
            onchange: (e: Event) => {
              stopAnim();
              state = { ...state, kind: (e.target as HTMLSelectElement).value as Kind, step: 1 };
              rerender();
            },
          },
          h('option', { value: 'add', selected: state.kind === 'add' }, '(Z_n, +)'),
          h('option', { value: 'mul', selected: state.kind === 'mul' }, '(Z_n*, ·)'),
        ),
      ),
      h(
        'label',
        {},
        'n =',
        h('input', {
          type: 'number',
          min: '2',
          max: '30',
          value: String(state.n),
          onchange: (e: Event) => {
            const n = Number((e.target as HTMLInputElement).value);
            if (Number.isInteger(n) && n >= 2 && n <= 30) {
              stopAnim();
              state = { ...state, n, step: 1 };
              rerender();
            }
          },
        }),
      ),
      h(
        'label',
        {},
        'a =',
        h(
          'select',
          {
            onchange: (e: Event) => {
              stopAnim();
              state = { ...state, a: Number((e.target as HTMLSelectElement).value), step: 1 };
              rerender();
            },
          },
          ...g.elements
            .filter((x) => !g.eq(x, g.identity))
            .map((x) =>
              h('option', { value: String(x), selected: x === state.a }, g.show(x)),
            ),
        ),
      ),
      h(
        'button',
        {
          onclick: () => {
            stopAnim();
            state = { ...state, step: 1 };
            rerender();
            timer = window.setInterval(() => {
              if (state.step >= orb.length) {
                stopAnim();
                return;
              }
              state = { ...state, step: state.step + 1 };
              rerender();
            }, 550);
          },
        },
        '▶ обход',
      ),
    );

    const status = h(
      'div',
      { class: 'widget-status' },
      h('span', { class: 'hl' }, `ord(${g.show(state.a)}) = ${orb.length}`),
      ` из |${g.name}| = ${g.elements.length} — `,
      gen ? 'генератор: орбита покрывает всю группу' : `подгруппа из ${orb.length} элементов (${orb.length} | ${g.elements.length})`,
    );

    replaceChildrenOf(body, controls, canvas, status);
    draw(canvas, g, state);
  };

  rerender();
  root.append(h('div', { class: 'widget-title' }, 'орбита элемента ⟨a⟩'), body);
  root.classList.add('widget');
};

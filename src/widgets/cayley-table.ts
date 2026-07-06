/**
 * Таблица Кэли для Z_n / Z_n^*.
 * Клик по элементу — подсветка его циклической подгруппы ⟨a⟩ и разбиения
 * на смежные классы (наглядная теорема Лагранжа).
 */

import { h, replaceChildrenOf } from '../ui/dom';
import { numParam } from '../ui/widgets';
import {
  FiniteGroup,
  Zn,
  ZnStar,
  cyclicSubgroup,
  cosets,
  elementOrder,
} from '../lib/math/group';

type Kind = 'add' | 'mul';

interface State {
  readonly n: number;
  readonly kind: Kind;
  readonly selected: number | undefined; // элемент, чья подгруппа подсвечена
  readonly hover: readonly [number, number] | undefined; // [row, col]
}

const makeGroup = (s: State): FiniteGroup<number> => (s.kind === 'add' ? Zn(s.n) : ZnStar(s.n));

const cosetClassOf = (
  g: FiniteGroup<number>,
  classes: readonly (readonly number[])[],
  x: number,
): number => classes.findIndex((c) => c.some((y) => g.eq(x, y)));

const renderTable = (
  g: FiniteGroup<number>,
  s: State,
  onSelect: (a: number) => void,
  onHover: (cell: readonly [number, number] | undefined) => void,
): HTMLTableElement => {
  const els = g.elements;
  const sub = s.selected === undefined ? undefined : cyclicSubgroup(g, s.selected);
  const classes = sub === undefined ? undefined : cosets(g, sub);
  const opSign = g.name.includes('*') ? '·' : '+';

  const header = h(
    'tr',
    {},
    h('th', {}, opSign),
    ...els.map((x, j) =>
      h('th', { class: s.hover?.[1] === j ? 'axis-hl' : '' }, g.show(x)),
    ),
  );

  const rows = els.map((a, i) =>
    h(
      'tr',
      {},
      h('th', { class: s.hover?.[0] === i ? 'axis-hl' : '' }, g.show(a)),
      ...els.map((b, j) => {
        const value = g.op(a, b);
        const cls: string[] = [];
        if (classes !== undefined && g.elements.length > 0) {
          const k = cosetClassOf(g, classes, value);
          if (k >= 0) cls.push(`coset-${k % 6}`);
        }
        if (s.hover !== undefined && s.hover[0] === i && s.hover[1] === j) cls.push('flash');
        return h(
          'td',
          {
            class: cls.join(' '),
            onclick: () => onSelect(value),
            onmouseenter: () => onHover([i, j]),
            onmouseleave: () => onHover(undefined),
          },
          g.show(value),
        );
      }),
    ),
  );

  return h('table', { class: 'cayley' }, header, ...rows);
};

const renderStatus = (g: FiniteGroup<number>, s: State): HTMLElement => {
  if (s.selected === undefined) {
    return h('div', { class: 'widget-status' }, 'клик по клетке — подсветить подгруппу ⟨a⟩ и её смежные классы');
  }
  const sub = cyclicSubgroup(g, s.selected);
  const ord = elementOrder(g, s.selected);
  const index = g.elements.length / sub.length;
  return h(
    'div',
    { class: 'widget-status' },
    h('span', { class: 'hl' }, `⟨${g.show(s.selected)}⟩ = {${sub.map(g.show).join(', ')}}`),
    ` порядок ${ord} · классов ${index} · ${ord} × ${index} = ${g.elements.length} = |${g.name}| ✓`,
  );
};

export const mountCayleyTable = (root: HTMLElement): void => {
  let state: State = {
    n: numParam(root, 'n', 8),
    kind: (root.dataset['kind'] as Kind | undefined) ?? 'add',
    selected: undefined,
    hover: undefined,
  };

  const body = h('div', { class: 'widget-body' });

  const rerender = (): void => {
    const g = makeGroup(state);
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
              state = { ...state, kind: (e.target as HTMLSelectElement).value as Kind, selected: undefined };
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
          max: '16',
          value: String(state.n),
          onchange: (e: Event) => {
            const n = Number((e.target as HTMLInputElement).value);
            if (Number.isInteger(n) && n >= 2 && n <= 16) {
              state = { ...state, n, selected: undefined };
              rerender();
            }
          },
        }),
      ),
      h(
        'button',
        {
          onclick: () => {
            state = { ...state, selected: undefined };
            rerender();
          },
        },
        'сброс',
      ),
    );

    const table = renderTable(
      g,
      state,
      (a) => {
        state = { ...state, selected: a };
        rerender();
      },
      (cell) => {
        state = { ...state, hover: cell };
        rerender();
      },
    );

    replaceChildrenOf(
      body,
      controls,
      table,
      renderStatus(g, state),
      h(
        'div',
        { class: 'widget-hint' },
        state.kind === 'mul'
          ? `Z_${state.n}* содержит только обратимые: {${g.elements.join(', ')}}. Заметьте: |Z_n*| = φ(n).`
          : 'наведение — как получилась клетка (строка ∘ столбец)',
      ),
    );
  };

  rerender();
  root.append(h('div', { class: 'widget-title' }, 'таблица Кэли'), body);
  root.classList.add('widget');
};

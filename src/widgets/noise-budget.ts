/**
 * Шумовой бюджет FHE: каждая гомоморфная операция наращивает шум,
 * порог q/4 — смерть шифртекста. Сложение дёшево, умножение дорого,
 * bootstrap сбрасывает шум к константе — если успеть до провала.
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

const FRESH = 5; // бит шума в свежем шифртексте
const BOOT = 24; // бит шума после bootstrap
const MUL_COST = 5; // добавка релинеаризации, бит
const LEVELS: readonly number[] = [60, 120, 240];

interface State {
  readonly logq: number;
  readonly noise: number; // текущий шум в битах
  readonly ops: readonly string[];
  readonly dead: boolean;
  readonly time: number; // условное время
}

const CW = 520;
const CH = 64;

const draw = (canvas: HTMLCanvasElement, s: State): void => {
  const ctx = canvas.getContext('2d');
  if (ctx === null) return;
  ctx.fillStyle = CSS.ink;
  ctx.fillRect(0, 0, CW, CH);
  const limit = s.logq - 2; // порог q/4
  const scale = (CW - 16) / s.logq;

  // полоса бюджета
  ctx.strokeStyle = CSS.dim;
  ctx.strokeRect(8.5, 18.5, s.logq * scale, 26);
  // заполнение шумом
  ctx.fillStyle = s.dead ? CSS.pink : s.noise > limit * 0.75 ? CSS.violet : CSS.acid;
  ctx.fillRect(9, 19, Math.min(s.noise, s.logq) * scale, 25);
  // порог q/4
  const lx = 8 + limit * scale;
  ctx.fillStyle = CSS.pink;
  ctx.fillRect(Math.round(lx), 12, 2, 38);
  ctx.font = '12px "PT Mono", monospace';
  ctx.fillStyle = CSS.paper;
  ctx.fillText(`шум: ${s.noise} бит из ${limit} допустимых (log q = ${s.logq})`, 8, 10);
  ctx.fillStyle = CSS.pink;
  ctx.fillText('q/4', lx - 10, 60);
};

export const mountNoiseBudget = (root: HTMLElement): void => {
  let state: State = { logq: 120, noise: FRESH, ops: [], dead: false, time: 0 };

  const canvas = h('canvas', { width: String(CW), height: String(CH) });
  const derivation = h('div', { class: 'phi-derivation' });
  const status = h('div', { class: 'widget-status' });

  const apply = (op: string, nextNoise: number, cost: number): void => {
    if (state.dead) return;
    const limit = state.logq - 2;
    const noise = Math.min(nextNoise, state.logq);
    const dead = noise >= limit;
    state = {
      ...state,
      noise,
      dead,
      ops: [...state.ops, op].slice(-14),
      time: state.time + cost,
    };
    rerender();
  };

  const addBtn = h(
    'button',
    { onclick: () => apply('＋', Math.max(state.noise, FRESH) + 1, 1) },
    '＋ сложить со свежим',
  );
  const mulBtn = h(
    'button',
    { onclick: () => apply('×', state.noise + FRESH + MUL_COST, 30) },
    '× умножить на свежий',
  );
  const bootBtn = h(
    'button',
    { onclick: () => apply('⟳', BOOT, 10000) },
    '⟳ bootstrap',
  );

  const controls = h(
    'div',
    { class: 'widget-controls' },
    h(
      'label',
      {},
      'log q:',
      h(
        'select',
        {
          onchange: (e: Event) => {
            state = {
              logq: Number((e.target as HTMLSelectElement).value),
              noise: FRESH,
              ops: [],
              dead: false,
              time: 0,
            };
            rerender();
          },
        },
        ...LEVELS.map((v) =>
          h('option', { value: String(v), selected: v === 120 }, String(v)),
        ),
      ),
    ),
    addBtn,
    mulBtn,
    bootBtn,
    h(
      'button',
      {
        onclick: () => {
          state = { ...state, noise: FRESH, ops: [], dead: false, time: 0 };
          rerender();
        },
      },
      'свежий шифртекст',
    ),
  );

  const rerender = (): void => {
    const { logq, noise, ops, dead, time } = state;
    const limit = logq - 2;
    const mulsLeft = dead ? 0 : Math.max(0, Math.floor((limit - noise) / (FRESH + MUL_COST)));

    addBtn.toggleAttribute('disabled', dead);
    mulBtn.toggleAttribute('disabled', dead);
    bootBtn.toggleAttribute('disabled', dead);

    replaceChildrenOf(
      derivation,
      h('div', {}, `модель: свежий шум ${FRESH} бит · сложение → max+1 · умножение → ν₁+ν₂+${MUL_COST} · bootstrap → ${BOOT} бит`),
      h('div', {}, `история: ${ops.length === 0 ? '—' : ops.join(' ')} · условное время: ${time} (＋=1, ×=30, ⟳=10000)`),
      h(
        'div',
        {},
        dead
          ? 'шум пересёк q/4: расшифрование выдаёт мусор, bootstrap уже НЕ спасает — он сам должен расшифровывать'
          : `запас: ещё ≈ ${mulsLeft} умножений до провала (или bootstrap заранее)`,
      ),
    );
    replaceChildrenOf(
      status,
      h(
        'span',
        { class: 'hl' },
        dead
          ? 'шифртекст мёртв — только начать заново'
          : noise === BOOT && ops[ops.length - 1] === '⟳'
            ? 'bootstrap: шум сброшен к константе — глубина вычисления больше не ограничена'
            : `бюджет: ${limit - noise} бит · глубина умножений — главный расход`,
      ),
    );
    draw(canvas, state);
  };

  rerender();
  root.append(
    h('div', { class: 'widget-title' }, 'шумовой бюджет: сложение, умножение, bootstrap'),
    h(
      'div',
      { class: 'widget-body' },
      controls,
      canvas,
      derivation,
      status,
      h(
        'div',
        { class: 'widget-hint' },
        'попробуйте: сколько умножений выдержит log q = 60 без bootstrap? а если делать bootstrap при заполнении наполовину? обратите внимание на условное время — bootstrap дороже умножения на порядки',
      ),
    ),
  );
  root.classList.add('widget');
};

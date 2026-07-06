/**
 * LWE против Гаусса: система линейных уравнений над Z_q решается
 * исключением за секунды — пока в правых частях нет шума ±e.
 * С шумом восстановленный «секрет» не имеет отношения к настоящему.
 */

import { h, replaceChildrenOf } from '../ui/dom';
import { makeSystem, gaussSolve, dotMod, LweSystem } from '../lib/crypto/lwe';

const N = 4;
const M = 5; // n уравнений на решение + 1 контрольное
const Q = 97;

interface State {
  readonly noise: number; // 0 — точная система
  readonly sys: LweSystem;
}

export const mountLweDemo = (root: HTMLElement): void => {
  const gen = (noise: number): State => ({
    noise,
    sys: makeSystem(N, M, Q, noise, Math.random),
  });
  let state: State = gen(0);

  const derivation = h('div', { class: 'phi-derivation' });
  const status = h('div', { class: 'widget-status' });
  const hint = h('div', { class: 'widget-hint' });

  const controls = h(
    'div',
    { class: 'widget-controls' },
    h(
      'label',
      {},
      'шум:',
      h(
        'select',
        {
          onchange: (e: Event) => {
            state = gen(Number((e.target as HTMLSelectElement).value));
            rerender();
          },
        },
        h('option', { value: '0', selected: true }, 'нет (обычная система)'),
        h('option', { value: '3' }, '±3 (LWE)'),
      ),
    ),
    h(
      'button',
      {
        onclick: () => {
          state = gen(state.noise);
          rerender();
        },
      },
      'новая система',
    ),
  );

  const rerender = (): void => {
    const { sys, noise } = state;
    const solved = gaussSolve(sys.A.slice(0, N), sys.b.slice(0, N), Q);
    const correct =
      solved !== undefined && solved.every((v, i) => v === (sys.s[i] ?? -1));

    const eqLine = (i: number): HTMLElement => {
      const row = sys.A[i] ?? [];
      const terms = row.map((a, j) => `${a}·s${j + 1}`).join(' + ');
      const noiseMark = noise > 0 ? ` (e = ${sys.e[i] ?? 0})` : '';
      return h('div', {}, `${terms} ≡ ${sys.b[i] ?? 0}${noiseMark}  (mod ${Q})`);
    };

    const checkRow = sys.A[N] ?? [];
    const predicted = solved === undefined ? undefined : dotMod(checkRow, solved, Q);
    const actual = sys.b[N] ?? 0;

    replaceChildrenOf(
      derivation,
      ...Array.from({ length: N }, (_, i) => eqLine(i)),
      h('div', {}, '— решаем эти четыре исключением Гаусса, пятое оставляем на проверку —'),
      eqLine(N),
      h(
        'div',
        {},
        `Гаусс: s = (${(solved ?? []).join(', ')}) · истинный секрет: s = (${sys.s.join(', ')}) ${correct ? '— совпало' : '— НЕ совпало'}`,
      ),
      h(
        'div',
        {},
        `проверка пятым уравнением: предсказано ${predicted ?? '—'}, в системе ${actual}${
          predicted === undefined ? '' : predicted === actual ? ' — сходится' : ' — не сходится'
        }`,
      ),
    );

    replaceChildrenOf(
      status,
      h(
        'span',
        { class: 'hl' },
        noise === 0
          ? 'без шума секрет восстанавливается за O(n³) — системы уравнений не бывают односторонними'
          : 'шум ±3 в правых частях — и Гаусс выдаёт мусор: исключение умножает и складывает ошибки',
      ),
    );
    replaceChildrenOf(
      hint,
      noise === 0
        ? 'включите шум и сравните: те же четыре уравнения перестают выдавать секрет'
        : 'комбинации строк раздувают шум на величину коэффициентов ∈ Z_97 — после исключения он заполняет весь Z_q',
    );
  };

  rerender();
  root.append(
    h('div', { class: 'widget-title' }, `LWE: система над Z_${Q} с шумом и без`),
    h('div', { class: 'widget-body' }, controls, derivation, status, hint),
  );
  root.classList.add('widget');
};

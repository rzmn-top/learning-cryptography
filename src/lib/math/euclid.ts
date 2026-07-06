/** Трассировка алгоритма Евклида — данные для пошагового виджета. */

export interface EuclidStep {
  readonly a: number;
  readonly b: number;
  readonly q: number; // a = q·b + r
  readonly r: number;
}

/** Прямой ход: последовательность делений с остатком до r = 0. */
export const euclidSteps = (a: number, b: number): readonly EuclidStep[] => {
  const steps: EuclidStep[] = [];
  let x = a;
  let y = b;
  while (y !== 0) {
    const q = Math.floor(x / y);
    const r = x - q * y;
    steps.push({ a: x, b: y, q, r });
    x = y;
    y = r;
  }
  return steps;
};

export interface BezoutRow {
  readonly a: number;
  readonly b: number;
  readonly x: number; // a·x + b·y = g на этом уровне
  readonly y: number;
}

/**
 * Обратный ход: коэффициенты Безу для каждого уровня рекурсии,
 * от базы (b = 0) вверх к исходной паре. Инвариант каждой строки:
 * a·x + b·y = gcd(a, b).
 */
export const bezoutTrace = (a: number, b: number): readonly BezoutRow[] => {
  const steps = euclidSteps(a, b);
  const rows: BezoutRow[] = [];
  // база: gcd(g, 0) = g = g·1 + 0·0
  const g = steps.length === 0 ? a : steps[steps.length - 1]?.b ?? a;
  let x = 1;
  let y = 0;
  rows.push({ a: g, b: 0, x, y });
  for (let i = steps.length - 1; i >= 0; i -= 1) {
    const s = steps[i];
    if (s === undefined) continue;
    // из b·x' + r·y' = g и r = a − q·b: a·y' + b·(x' − q·y') = g
    const nx = y;
    const ny = x - s.q * y;
    x = nx;
    y = ny;
    rows.push({ a: s.a, b: s.b, x, y });
  }
  return rows;
};

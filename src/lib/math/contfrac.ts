/**
 * Непрерывные дроби: разложение рационального числа и подходящие дроби.
 * Используется классической частью алгоритма Шора для восстановления
 * периода r из измеренного j ≈ s·Q/r.
 */

/** Неполные частные разложения p/q (алгоритм Евклида). */
export const contFrac = (p: number, q: number): readonly number[] => {
  const out: number[] = [];
  let a = p;
  let b = q;
  while (b > 0) {
    out.push(Math.floor(a / b));
    [a, b] = [b, a % b];
  }
  return out;
};

export interface Convergent {
  /** Числитель h_i. */
  readonly h: number;
  /** Знаменатель k_i. */
  readonly k: number;
}

/** Подходящие дроби h_i/k_i разложения p/q (стандартная рекуррента). */
export const convergents = (p: number, q: number): readonly Convergent[] => {
  const as = contFrac(p, q);
  const out: Convergent[] = [];
  let hPrev = 1;
  let hPrevPrev = 0;
  let kPrev = 0;
  let kPrevPrev = 1;
  for (const a of as) {
    const hi = a * hPrev + hPrevPrev;
    const ki = a * kPrev + kPrevPrev;
    out.push({ h: hi, k: ki });
    [hPrevPrev, hPrev] = [hPrev, hi];
    [kPrevPrev, kPrev] = [kPrev, ki];
  }
  return out;
};

/**
 * Кандидат в периоды: знаменатель последней подходящей дроби j/Q
 * со знаменателем < bound (теорема Лежандра гарантирует, что s/r
 * с |j/Q − s/r| ≤ 1/(2r²) окажется среди подходящих дробей).
 */
export const periodCandidate = (j: number, Q: number, bound: number): number | undefined => {
  if (j === 0) return undefined;
  const cs = convergents(j, Q).filter((c) => c.k > 0 && c.k < bound);
  const last = cs[cs.length - 1];
  return last?.k;
};

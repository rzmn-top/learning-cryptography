/** Разложение на простые и функция Эйлера через формулу (учебные размеры). */

export interface PrimePower {
  readonly p: number;
  readonly k: number;
}

export const factorize = (n: number): readonly PrimePower[] => {
  const result: PrimePower[] = [];
  let m = n;
  for (let p = 2; p * p <= m; p += 1) {
    if (m % p !== 0) continue;
    let k = 0;
    while (m % p === 0) {
      m /= p;
      k += 1;
    }
    result.push({ p, k });
  }
  if (m > 1) result.push({ p: m, k: 1 });
  return result;
};

/** φ(n) по формуле n·∏(1 − 1/p) = ∏ p^k − p^(k−1). */
export const phiFromFactors = (factors: readonly PrimePower[]): number =>
  factors.reduce((acc, { p, k }) => acc * (p ** k - p ** (k - 1)), 1);

export const isPrime = (n: number): boolean => n >= 2 && factorize(n).length === 1 && factorize(n)[0]?.k === 1;

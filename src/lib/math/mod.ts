/** Модулярная арифметика: чистые функции, без DOM. */

/** Математический остаток: всегда в [0, n). */
export const mod = (a: number, n: number): number => ((a % n) + n) % n;

export const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));

export interface Bezout {
  readonly g: number; // gcd(a, b)
  readonly x: number; // коэффициент при a
  readonly y: number; // коэффициент при b
}

/** Расширенный алгоритм Евклида: g = ax + by. */
export const extendedGcd = (a: number, b: number): Bezout => {
  if (b === 0) return { g: a, x: 1, y: 0 };
  const { g, x, y } = extendedGcd(b, a % b);
  return { g, x: y, y: x - Math.floor(a / b) * y };
};

/** Обратный по модулю, если существует. */
export const modInverse = (a: number, n: number): number | undefined => {
  const { g, x } = extendedGcd(mod(a, n), n);
  return g === 1 ? mod(x, n) : undefined;
};

/** Быстрое возведение в степень по модулю (square-and-multiply). */
export const modPow = (base: number, exp: number, n: number): number => {
  let result = 1;
  let b = mod(base, n);
  let e = exp;
  while (e > 0) {
    if (e % 2 === 1) result = mod(result * b, n);
    b = mod(b * b, n);
    e = Math.floor(e / 2);
  }
  return result;
};

export const range = (n: number): readonly number[] => Array.from({ length: n }, (_, i) => i);

/** Обратимые элементы Z_n. */
export const unitsMod = (n: number): readonly number[] =>
  range(n).filter((a) => gcd(a, n) === 1);

/** Функция Эйлера (наивно — для учебных размеров). */
export const eulerPhi = (n: number): number => unitsMod(n).length;

/** Мультипликативный порядок a по модулю n (gcd(a, n) = 1, учебные размеры). */
export const multOrder = (a: number, n: number): number => {
  let acc = mod(a, n);
  let k = 1;
  while (acc !== 1) {
    acc = mod(acc * a, n);
    k += 1;
    if (k > n) throw new Error('порядок не найден: gcd(a, n) ≠ 1?');
  }
  return k;
};

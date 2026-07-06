/**
 * Арифметика в R_q = Z_q[x]/(x^n + 1): сложение, негациклическое
 * умножение (x^n = −1), центрирование, генерация случайных многочленов.
 * Коэффициенты хранятся приведёнными в [0, q).
 */

import { mod } from './mod';

export type Poly = readonly number[];

export const polyAdd = (a: Poly, b: Poly, q: number): Poly =>
  a.map((v, i) => mod(v + (b[i] ?? 0), q));

export const polySub = (a: Poly, b: Poly, q: number): Poly =>
  a.map((v, i) => mod(v - (b[i] ?? 0), q));

/** Негациклическая свёртка: перенос через x^n возвращается со знаком минус. */
export const polyMulNeg = (a: Poly, b: Poly, q: number): Poly => {
  const n = a.length;
  const out = new Array<number>(n).fill(0);
  for (let i = 0; i < n; i += 1) {
    const ai = a[i] ?? 0;
    if (ai === 0) continue;
    for (let j = 0; j < n; j += 1) {
      const prod = ai * (b[j] ?? 0);
      const k = i + j;
      if (k < n) out[k] = mod((out[k] ?? 0) + prod, q);
      else out[k - n] = mod((out[k - n] ?? 0) - prod, q);
    }
  }
  return out;
};

/** Умножение многочлена на скаляр. */
export const polyScale = (a: Poly, c: number, q: number): Poly => a.map((v) => mod(v * c, q));

/** Центрированный представитель: из [0, q) в (−q/2, q/2]. */
export const centered = (v: number, q: number): number => (v > q / 2 ? v - q : v);

export const polyCentered = (a: Poly, q: number): readonly number[] =>
  a.map((v) => centered(v, q));

/** Равномерный многочлен из R_q. */
export const randUniform = (n: number, q: number, rnd: () => number): Poly =>
  Array.from({ length: n }, () => Math.floor(rnd() * q));

/** «Маленький» многочлен: коэффициенты из [−B, B], приведённые mod q. */
export const randSmall = (n: number, B: number, q: number, rnd: () => number): Poly =>
  Array.from({ length: n }, () => mod(Math.floor(rnd() * (2 * B + 1)) - B, q));

/** Печать многочлена для статусных строк (центрированные коэффициенты). */
export const polyStr = (a: Poly, q: number): string =>
  polyCentered(a, q)
    .map((v, i) => (i === 0 ? `${v}` : `${v < 0 ? '−' : '+'}${Math.abs(v)}x${i > 1 ? `^${i}` : ''}`))
    .join('');

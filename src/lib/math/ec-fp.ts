/**
 * Эллиптическая кривая y² = x³ + ax + b над конечным полем F_p.
 * Рабочая среда ECDH/ECDSA. Точка на бесконечности — null.
 */

import { mod, modInverse } from './mod';

export interface CurveFp {
  readonly a: number;
  readonly b: number;
  readonly p: number;
}

export type PointFp = { readonly x: number; readonly y: number } | null;

export const eqFp = (p1: PointFp, p2: PointFp): boolean =>
  p1 === null || p2 === null ? p1 === p2 : p1.x === p2.x && p1.y === p2.y;

export const isOnCurve = ({ a, b, p }: CurveFp, pt: PointFp): boolean =>
  pt === null || mod(pt.y * pt.y, p) === mod(pt.x ** 3 + a * pt.x + b, p);

/** Все аффинные точки кривы (учебные размеры). */
export const points = (c: CurveFp): readonly PointFp[] => {
  const result: PointFp[] = [null];
  for (let x = 0; x < c.p; x += 1) {
    const rhs = mod(x ** 3 + c.a * x + c.b, c.p);
    for (let y = 0; y < c.p; y += 1) {
      if (mod(y * y, c.p) === rhs) result.push({ x, y });
    }
  }
  return result;
};

export const negate = (c: CurveFp, pt: PointFp): PointFp =>
  pt === null ? null : { x: pt.x, y: mod(-pt.y, c.p) };

/** Групповое сложение над F_p. */
export const add = (c: CurveFp, p1: PointFp, p2: PointFp): PointFp => {
  if (p1 === null) return p2;
  if (p2 === null) return p1;
  const { p } = c;
  if (p1.x === p2.x && mod(p1.y + p2.y, p) === 0) return null;

  let m: number;
  if (p1.x === p2.x && p1.y === p2.y) {
    const inv = modInverse(2 * p1.y, p);
    if (inv === undefined) return null;
    m = mod((3 * p1.x ** 2 + c.a) * inv, p);
  } else {
    const inv = modInverse(mod(p2.x - p1.x, p), p);
    if (inv === undefined) return null;
    m = mod((p2.y - p1.y) * inv, p);
  }
  const x = mod(m * m - p1.x - p2.x, p);
  const y = mod(m * (p1.x - x) - p1.y, p);
  return { x, y };
};

/** Скалярное умножение kP (double-and-add). */
export const mul = (c: CurveFp, k: number, pt: PointFp): PointFp => {
  let result: PointFp = null;
  let addend = pt;
  let n = k;
  while (n > 0) {
    if (n & 1) result = add(c, result, addend);
    addend = add(c, addend, addend);
    n = Math.floor(n / 2);
  }
  return result;
};

/** Порядок точки: наименьшее k с kP = O. */
export const pointOrder = (c: CurveFp, pt: PointFp): number => {
  let acc = pt;
  let k = 1;
  while (acc !== null) {
    acc = add(c, acc, pt);
    k += 1;
    if (k > c.p * 2 + 4) throw new Error('порядок не найден');
  }
  return k;
};

/** Последовательные кратные P, 2P, 3P, … до O включительно. */
export const multiples = (c: CurveFp, pt: PointFp): readonly PointFp[] => {
  const result: PointFp[] = [];
  let acc: PointFp = pt;
  do {
    result.push(acc);
    acc = add(c, acc, pt);
  } while (acc !== null && result.length < c.p * 2 + 4);
  result.push(null); // O замыкает цикл
  return result;
};

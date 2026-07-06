/**
 * Игрушечное LWE и криптосистема Регева над Z_q: генерация системы
 * «уравнения с шумом», решение точной системы исключением Гаусса,
 * шифрование/расшифрование бита. Чистые функции; случайность —
 * через переданный генератор rnd: () => number из [0, 1).
 */

import { mod, modPow } from '../math/mod';

export interface LweSystem {
  /** Строки коэффициентов a_i ∈ Z_q^n. */
  readonly A: readonly (readonly number[])[];
  /** Правые части b_i = ⟨a_i, s⟩ + e_i mod q. */
  readonly b: readonly number[];
  /** Секрет s ∈ Z_q^n. */
  readonly s: readonly number[];
  /** Шумы e_i ∈ [−noise, noise]. */
  readonly e: readonly number[];
}

export const dotMod = (a: readonly number[], s: readonly number[], q: number): number =>
  mod(
    a.reduce((acc, ai, i) => acc + ai * (s[i] ?? 0), 0),
    q,
  );

/** Система из m уравнений с шумом уровня noise (0 — точная система). */
export const makeSystem = (
  n: number,
  m: number,
  q: number,
  noise: number,
  rnd: () => number,
): LweSystem => {
  const s = Array.from({ length: n }, () => Math.floor(rnd() * q));
  const A = Array.from({ length: m }, () =>
    Array.from({ length: n }, () => Math.floor(rnd() * q)),
  );
  const e = Array.from({ length: m }, () =>
    noise === 0 ? 0 : Math.floor(rnd() * (2 * noise + 1)) - noise,
  );
  const b = A.map((row, i) => mod(dotMod(row, s, q) + (e[i] ?? 0), q));
  return { A, b, s, e };
};

/**
 * Исключение Гаусса по модулю простого q для квадратной системы
 * из первых n уравнений. Возвращает решение или undefined
 * (вырожденная матрица).
 */
export const gaussSolve = (
  A: readonly (readonly number[])[],
  b: readonly number[],
  q: number,
): readonly number[] | undefined => {
  const n = A[0]?.length ?? 0;
  if (A.length < n) return undefined;
  // расширенная матрица n × (n+1)
  const M: number[][] = Array.from({ length: n }, (_, i) => [
    ...(A[i] ?? []).map((v) => mod(v, q)),
    mod(b[i] ?? 0, q),
  ]);
  for (let col = 0; col < n; col += 1) {
    const pivotRow = M.findIndex((row, r) => r >= col && mod(row[col] ?? 0, q) !== 0);
    if (pivotRow === -1) return undefined;
    const tmp = M[col];
    const pr = M[pivotRow];
    if (tmp === undefined || pr === undefined) return undefined;
    [M[col], M[pivotRow]] = [pr, tmp];
    const pivot = M[col]?.[col] ?? 0;
    const inv = modPow(pivot, q - 2, q); // обратный по Ферма (q простое)
    for (let j = col; j <= n; j += 1) {
      const row = M[col];
      if (row !== undefined) row[j] = mod((row[j] ?? 0) * inv, q);
    }
    for (let r = 0; r < n; r += 1) {
      if (r === col) continue;
      const factor = M[r]?.[col] ?? 0;
      if (factor === 0) continue;
      for (let j = col; j <= n; j += 1) {
        const rr = M[r];
        if (rr !== undefined) rr[j] = mod((rr[j] ?? 0) - factor * (M[col]?.[j] ?? 0), q);
      }
    }
  }
  return M.map((row) => row[n] ?? 0);
};

export interface RegevCiphertext {
  /** Сумма выбранных строк a_i. */
  readonly c1: readonly number[];
  /** Сумма выбранных b_i плюс кодировка бита. */
  readonly c2: number;
  /** Индексы выбранного подмножества (для показа в виджете). */
  readonly subset: readonly number[];
}

/** Шифрование бита: случайное подмножество уравнений + сдвиг на ⌊q/2⌋·bit. */
export const regevEncrypt = (
  sys: LweSystem,
  q: number,
  bit: 0 | 1,
  rnd: () => number,
): RegevCiphertext => {
  const subset = sys.A.map((_, i) => i).filter(() => rnd() < 0.5);
  const n = sys.A[0]?.length ?? 0;
  const c1 = Array.from({ length: n }, (_, j) =>
    mod(subset.reduce((acc, i) => acc + (sys.A[i]?.[j] ?? 0), 0), q),
  );
  const c2 = mod(
    subset.reduce((acc, i) => acc + (sys.b[i] ?? 0), 0) + bit * Math.floor(q / 2),
    q,
  );
  return { c1, c2, subset };
};

export interface RegevDecryption {
  readonly bit: 0 | 1;
  /** Центрированный остаток d = c2 − ⟨c1, s⟩: шум + кодировка бита. */
  readonly centered: number;
  /** Накопленный шум: centered минус вклад бита. */
  readonly noiseTotal: number;
}

/** Расшифрование: ближе к 0 — бит 0, ближе к ±q/2 — бит 1. */
export const regevDecrypt = (
  ct: RegevCiphertext,
  s: readonly number[],
  q: number,
): RegevDecryption => {
  const d = mod(ct.c2 - dotMod(ct.c1, s, q), q);
  const centered = d > q / 2 ? d - q : d;
  const bit: 0 | 1 = Math.abs(centered) > q / 4 ? 1 : 0;
  const noiseTotal =
    bit === 0 ? Math.abs(centered) : Math.abs(Math.abs(centered) - Math.floor(q / 2));
  return { bit, centered, noiseTotal };
};

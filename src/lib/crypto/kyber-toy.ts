/**
 * Игрушечный KEM в духе ML-KEM (Kyber) поверх Ring-LWE в
 * R_q = Z_q[x]/(x^n + 1): генерация ключей, инкапсуляция битовой строки,
 * декапсуляция, опциональное сжатие v (источник дополнительного шума).
 * Без NTT, без Module-структуры, без FO — ядро схемы в чистом виде.
 */

import {
  Poly,
  polyAdd,
  polySub,
  polyMulNeg,
  polyCentered,
  randUniform,
  randSmall,
} from '../math/polyring';
import { mod } from '../math/mod';

export interface KyberToyParams {
  readonly n: number;
  readonly q: number;
  /** Граница коэффициентов малых многочленов. */
  readonly eta: number;
}

export const TOY: KyberToyParams = { n: 8, q: 97, eta: 1 };

export interface KeyPair {
  readonly a: Poly;
  readonly b: Poly; // b = a·s + e
  readonly s: Poly; // секрет
  readonly e: Poly;
}

export interface Ciphertext {
  readonly u: Poly; // u = a·r + e1
  readonly v: Poly; // v = b·r + e2 + ⌊q/2⌉·m
  readonly r: Poly;
  readonly e1: Poly;
  readonly e2: Poly;
}

export const keygen = (p: KyberToyParams, rnd: () => number): KeyPair => {
  const a = randUniform(p.n, p.q, rnd);
  const s = randSmall(p.n, p.eta, p.q, rnd);
  const e = randSmall(p.n, p.eta, p.q, rnd);
  const b = polyAdd(polyMulNeg(a, s, p.q), e, p.q);
  return { a, b, s, e };
};

/** Кодировка битов: m_i · ⌊q/2⌉ в i-м коэффициенте. */
export const encodeBits = (bits: readonly (0 | 1)[], p: KyberToyParams): Poly =>
  bits.map((bit) => bit * Math.round(p.q / 2));

export const encaps = (
  p: KyberToyParams,
  pk: Pick<KeyPair, 'a' | 'b'>,
  bits: readonly (0 | 1)[],
  rnd: () => number,
): Ciphertext => {
  const r = randSmall(p.n, p.eta, p.q, rnd);
  const e1 = randSmall(p.n, p.eta, p.q, rnd);
  const e2 = randSmall(p.n, p.eta, p.q, rnd);
  const u = polyAdd(polyMulNeg(pk.a, r, p.q), e1, p.q);
  const v = polyAdd(polyAdd(polyMulNeg(pk.b, r, p.q), e2, p.q), encodeBits(bits, p), p.q);
  return { u, v, r, e1, e2 };
};

/** Compress_d: округление коэффициента до d бит; возвращает восстановленный многочлен. */
export const compressRound = (a: Poly, d: number, q: number): Poly =>
  a.map((v) => {
    const compressed = mod(Math.round((v * (1 << d)) / q), 1 << d);
    return mod(Math.round((compressed * q) / (1 << d)), q);
  });

export interface Decapsulation {
  /** Центрированные коэффициенты w = v − u·s: шум + кодировка бита. */
  readonly w: readonly number[];
  readonly bits: readonly (0 | 1)[];
}

export const decaps = (p: KyberToyParams, ct: Pick<Ciphertext, 'u' | 'v'>, s: Poly): Decapsulation => {
  const w = polyCentered(polySub(ct.v, polyMulNeg(ct.u, s, p.q), p.q), p.q);
  const bits = w.map((c): 0 | 1 => (Math.abs(c) > p.q / 4 ? 1 : 0));
  return { w, bits };
};

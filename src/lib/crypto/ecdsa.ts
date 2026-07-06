/**
 * Учебная ECDSA над малой кривой. Демонстрирует подпись, проверку
 * и восстановление секрета при повторе nonce (атака PS3).
 */

import { CurveFp, PointFp, mul, add } from '../math/ec-fp';
import { mod, modInverse } from '../math/mod';

export interface EcdsaParams {
  readonly curve: CurveFp;
  readonly G: PointFp; // генератор
  readonly n: number; // порядок G (простой)
}

export interface Signature {
  readonly r: number;
  readonly s: number;
}

/** Подпись сообщения с хэшем z и nonce k. */
export const sign = (params: EcdsaParams, d: number, z: number, k: number): Signature | undefined => {
  const { curve, G, n } = params;
  const R = mul(curve, k, G);
  if (R === null) return undefined;
  const r = mod(R.x, n);
  if (r === 0) return undefined;
  const kInv = modInverse(k, n);
  if (kInv === undefined) return undefined;
  const s = mod(kInv * (z + r * d), n);
  if (s === 0) return undefined;
  return { r, s };
};

/** Проверка подписи открытым ключом Q = dG. */
export const verify = (params: EcdsaParams, Q: PointFp, z: number, sig: Signature): boolean => {
  const { curve, G, n } = params;
  const { r, s } = sig;
  if (r <= 0 || r >= n || s <= 0 || s >= n) return false;
  const sInv = modInverse(s, n);
  if (sInv === undefined) return false;
  const u1 = mod(z * sInv, n);
  const u2 = mod(r * sInv, n);
  const P = add(curve, mul(curve, u1, G), mul(curve, u2, Q));
  if (P === null) return false;
  return mod(P.x, n) === r;
};

/**
 * Восстановление секретного ключа из двух подписей с одним nonce k.
 * Возвращает { k, d } либо undefined.
 */
export const recoverFromReusedNonce = (
  params: EcdsaParams,
  z1: number,
  sig1: Signature,
  z2: number,
  sig2: Signature,
): { readonly k: number; readonly d: number } | undefined => {
  const { n } = params;
  if (sig1.r !== sig2.r) return undefined; // один nonce ⇒ один r
  const sDiff = modInverse(mod(sig1.s - sig2.s, n), n);
  if (sDiff === undefined) return undefined;
  const k = mod((z1 - z2) * sDiff, n); // k = (z1 − z2)/(s1 − s2)
  const rInv = modInverse(sig1.r, n);
  if (rInv === undefined) return undefined;
  const d = mod((mod(sig1.s * k, n) - z1) * rInv, n); // d = (s1·k − z1)/r
  return { k, d };
};

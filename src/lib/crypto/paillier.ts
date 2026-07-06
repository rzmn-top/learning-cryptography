/**
 * Криптосистема Пайе на BigInt: g = n + 1, шифрование
 * c = (1+n)^m · r^n mod n², расшифрование через L(x) = (x−1)/n.
 * Аддитивно гомоморфна: E(m₁)·E(m₂) = E(m₁+m₂ mod n),
 * E(m)^k = E(k·m mod n). Чистые функции.
 */

export const bmodpow = (base: bigint, exp: bigint, m: bigint): bigint => {
  let b = ((base % m) + m) % m;
  let e = exp;
  let acc = 1n;
  while (e > 0n) {
    if (e & 1n) acc = (acc * b) % m;
    b = (b * b) % m;
    e >>= 1n;
  }
  return acc;
};

export const bgcd = (a: bigint, b: bigint): bigint => (b === 0n ? a : bgcd(b, a % b));

/** Обратный по модулю (расширенный Евклид). */
export const bmodinv = (a: bigint, m: bigint): bigint => {
  let [old_r, r] = [((a % m) + m) % m, m];
  let [old_s, s] = [1n, 0n];
  while (r !== 0n) {
    const qt = old_r / r;
    [old_r, r] = [r, old_r - qt * r];
    [old_s, s] = [s, old_s - qt * s];
  }
  return ((old_s % m) + m) % m;
};

export interface PaillierKeys {
  readonly p: bigint;
  readonly q: bigint;
  readonly n: bigint;
  readonly n2: bigint;
  /** λ = lcm(p−1, q−1). */
  readonly lambda: bigint;
  /** μ = λ⁻¹ mod n (для g = n+1). */
  readonly mu: bigint;
}

export const paillierKeygen = (p: bigint, q: bigint): PaillierKeys => {
  const n = p * q;
  const n2 = n * n;
  const lambda = ((p - 1n) * (q - 1n)) / bgcd(p - 1n, q - 1n);
  const mu = bmodinv(lambda % n, n);
  return { p, q, n, n2, lambda, mu };
};

/** Шифрование: требует gcd(r, n) = 1. */
export const paillierEncrypt = (keys: PaillierKeys, m: bigint, r: bigint): bigint => {
  const { n, n2 } = keys;
  const gm = bmodpow(n + 1n, m, n2);
  const rn = bmodpow(r, n, n2);
  return (gm * rn) % n2;
};

/** Случайное r, взаимно простое с n. */
export const paillierRandomR = (keys: PaillierKeys, rnd: () => number): bigint => {
  for (;;) {
    const r = BigInt(2 + Math.floor(rnd() * (Number(keys.n) - 3)));
    if (bgcd(r, keys.n) === 1n) return r;
  }
};

export const paillierDecrypt = (keys: PaillierKeys, c: bigint): bigint => {
  const { n, n2, lambda, mu } = keys;
  const x = bmodpow(c, lambda, n2);
  const L = (x - 1n) / n;
  return (((L % n) * mu) % n + n) % n;
};

/** Гомоморфное сложение открытых текстов: произведение шифртекстов. */
export const paillierAdd = (keys: PaillierKeys, c1: bigint, c2: bigint): bigint =>
  (c1 * c2) % keys.n2;

/** Гомоморфное умножение на открытый скаляр: возведение в степень. */
export const paillierScale = (keys: PaillierKeys, c: bigint, k: bigint): bigint =>
  bmodpow(c, k, keys.n2);

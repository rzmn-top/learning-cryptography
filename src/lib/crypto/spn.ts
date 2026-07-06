/**
 * Учебный 16-битный SPN-шифр (структура из туториала Хейса): 4 раунда
 * «подстановка → перестановка → ключ». НЕ криптостоек — используется
 * только для демонстрации режимов шифрования (ECB vs CTR) и лавинного эффекта.
 */

/** 4-битный S-box (Heys). */
const SBOX: readonly number[] = [
  0xe, 0x4, 0xd, 0x1, 0x2, 0xf, 0xb, 0x8, 0x3, 0xa, 0x6, 0xc, 0x5, 0x9, 0x0, 0x7,
];

/** Перестановка битов: бит i уходит в позицию (i mod 4)·4 + ⌊i/4⌋. */
const permute = (x: number): number => {
  let out = 0;
  for (let i = 0; i < 16; i += 1) {
    const bit = (x >> i) & 1;
    const j = (i % 4) * 4 + Math.floor(i / 4);
    out |= bit << j;
  }
  return out;
};

const substitute = (x: number): number => {
  let out = 0;
  for (let nibble = 0; nibble < 4; nibble += 1) {
    const v = (x >> (nibble * 4)) & 0xf;
    out |= (SBOX[v] ?? 0) << (nibble * 4);
  }
  return out;
};

const rot16 = (x: number, r: number): number => ((x << r) | (x >>> (16 - r))) & 0xffff;

/** Раундовые ключи из 16-битного ключа. */
const roundKeys = (key: number): readonly number[] =>
  Array.from({ length: 5 }, (_, r) => rot16(key, (r * 5) % 16) ^ ((r * 0x9e37) & 0xffff));

/** Шифрование одного 16-битного блока. */
export const spnEncrypt = (block: number, key: number): number => {
  const ks = roundKeys(key);
  let x = block & 0xffff;
  for (let r = 0; r < 4; r += 1) {
    x ^= ks[r] ?? 0;
    x = substitute(x);
    if (r < 3) x = permute(x);
  }
  return x ^ (ks[4] ?? 0);
};

/** ECB: каждый блок шифруется независимо — одинаковые блоки дают одинаковый шифртекст. */
export const encryptEcb = (blocks: readonly number[], key: number): readonly number[] =>
  blocks.map((b) => spnEncrypt(b, key));

/** CTR: шифруется счётчик, результат XOR-ится с блоком — позиция влияет на шифртекст. */
export const encryptCtr = (
  blocks: readonly number[],
  key: number,
  nonce: number,
): readonly number[] =>
  blocks.map((b, i) => (b ^ spnEncrypt((nonce + i) & 0xffff, key)) & 0xffff);

/** Расстояние Хэмминга между 16-битными значениями (для демонстраций). */
export const hamming16 = (a: number, b: number): number => {
  let x = (a ^ b) & 0xffff;
  let count = 0;
  while (x !== 0) {
    count += x & 1;
    x >>>= 1;
  }
  return count;
};

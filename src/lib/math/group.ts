/**
 * Конечная группа как значение: чистая алгебра, без DOM.
 * Один интерфейс обслуживает Z_n, Z_n^*, а позже — точки эллиптических кривых.
 */

import { gcd, mod, modInverse, range, unitsMod } from './mod';

export interface FiniteGroup<T> {
  readonly name: string;
  readonly elements: readonly T[];
  readonly identity: T;
  readonly op: (a: T, b: T) => T;
  readonly inverse: (a: T) => T;
  readonly eq: (a: T, b: T) => boolean;
  readonly show: (a: T) => string;
}

/** Аддитивная группа (Z_n, +). */
export const Zn = (n: number): FiniteGroup<number> => ({
  name: `Z_${n}`,
  elements: range(n),
  identity: 0,
  op: (a, b) => mod(a + b, n),
  inverse: (a) => mod(-a, n),
  eq: (a, b) => a === b,
  show: String,
});

/** Мультипликативная группа (Z_n^*, ·). */
export const ZnStar = (n: number): FiniteGroup<number> => ({
  name: `Z_${n}^*`,
  elements: unitsMod(n),
  identity: 1,
  op: (a, b) => mod(a * b, n),
  inverse: (a) => {
    const inv = modInverse(a, n);
    if (inv === undefined) throw new Error(`${a} необратим по модулю ${n}`);
    return inv;
  },
  eq: (a, b) => a === b,
  show: String,
});

/** Порядок элемента: наименьшее k ≥ 1 с a^k = e. */
export const elementOrder = <T>(g: FiniteGroup<T>, a: T): number => {
  let acc = a;
  let k = 1;
  while (!g.eq(acc, g.identity)) {
    acc = g.op(acc, a);
    k += 1;
    if (k > g.elements.length + 1) throw new Error('порядок не найден: не группа?');
  }
  return k;
};

/** Орбита элемента: ⟨a⟩ = { a, a², …, e } в порядке обхода. */
export const orbit = <T>(g: FiniteGroup<T>, a: T): readonly T[] => {
  const result: T[] = [g.identity];
  let acc = a;
  while (!g.eq(acc, g.identity)) {
    result.push(acc);
    acc = g.op(acc, a);
  }
  return result;
};

/** Циклическая подгруппа ⟨a⟩ как множество. */
export const cyclicSubgroup = <T>(g: FiniteGroup<T>, a: T): readonly T[] => orbit(g, a);

/** Является ли элемент генератором всей группы. */
export const isGenerator = <T>(g: FiniteGroup<T>, a: T): boolean =>
  orbit(g, a).length === g.elements.length;

/** Левые смежные классы по подгруппе H: разбиение G. */
export const cosets = <T>(g: FiniteGroup<T>, subgroup: readonly T[]): readonly (readonly T[])[] => {
  const seen: T[] = [];
  const classes: (readonly T[])[] = [];
  for (const a of g.elements) {
    if (seen.some((s) => g.eq(s, a))) continue;
    const coset = subgroup.map((h) => g.op(a, h));
    classes.push(coset);
    seen.push(...coset);
  }
  return classes;
};

/** Все подгруппы циклической группы = ⟨a⟩ для каждого a (для учебных размеров). */
export const allCyclicSubgroups = <T>(g: FiniteGroup<T>): readonly (readonly T[])[] => {
  const canon = (s: readonly T[]): string =>
    s
      .map((x) => g.show(x))
      .sort()
      .join(',');
  const map = new Map<string, readonly T[]>();
  for (const a of g.elements) {
    const s = cyclicSubgroup(g, a);
    map.set(canon(s), s);
  }
  return [...map.values()].sort((a, b) => a.length - b.length);
};

/** Наибольший общий делитель порядка элемента и порядка группы и т.п. — реэкспорт для удобства. */
export { gcd };

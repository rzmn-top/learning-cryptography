/**
 * Двумерные решётки: базисы, координаты, округление Бабаи, точный CVP
 * перебором вокруг кандидата Бабаи. Чистые функции без DOM.
 * Базис хранится как пара векторов-столбцов: точка = c₁b₁ + c₂b₂.
 */

export type Vec2 = readonly [number, number];
export type Basis2 = readonly [Vec2, Vec2];

export const cross = (a: Vec2, b: Vec2): number => a[0] * b[1] - a[1] * b[0];

/** Определитель базиса (ориентированная площадь фундаментального параллелограмма). */
export const det2 = (B: Basis2): number => cross(B[0], B[1]);

/** Точка решётки с целыми (в общем случае — любыми) координатами c. */
export const apply = (B: Basis2, c: Vec2): Vec2 => [
  c[0] * B[0][0] + c[1] * B[1][0],
  c[0] * B[0][1] + c[1] * B[1][1],
];

/** Координаты произвольной точки t в базисе B (решение 2×2 по Крамеру). */
export const coords = (B: Basis2, t: Vec2): Vec2 => {
  const d = det2(B);
  return [cross(t, B[1]) / d, cross(B[0], t) / d];
};

/** Умножение базиса на целочисленную матрицу U (столбцы u₁, u₂): B·U. */
export const transform = (B: Basis2, U: Basis2): Basis2 => [apply(B, U[0]), apply(B, U[1])];

export const sub = (a: Vec2, b: Vec2): Vec2 => [a[0] - b[0], a[1] - b[1]];
export const norm = (a: Vec2): number => Math.hypot(a[0], a[1]);
export const dist = (a: Vec2, b: Vec2): number => norm(sub(a, b));

/** Округление Бабаи: ближайшие целые координаты в данном базисе. */
export const babai = (B: Basis2, t: Vec2): Vec2 => {
  const [c1, c2] = coords(B, t);
  return [Math.round(c1), Math.round(c2)];
};

/** Точный CVP перебором целых координат в окне вокруг кандидата Бабаи. */
export const closest = (B: Basis2, t: Vec2, window = 6): Vec2 => {
  const [b1, b2] = babai(B, t);
  let best: Vec2 = [b1, b2];
  let bestD = dist(apply(B, best), t);
  for (let i = b1 - window; i <= b1 + window; i += 1) {
    for (let j = b2 - window; j <= b2 + window; j += 1) {
      const d = dist(apply(B, [i, j]), t);
      if (d < bestD - 1e-9) {
        bestD = d;
        best = [i, j];
      }
    }
  }
  return best;
};

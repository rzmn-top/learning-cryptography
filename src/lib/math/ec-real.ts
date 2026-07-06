/**
 * Эллиптическая кривая y² = x³ + ax + b над вещественными числами.
 * Для визуализации геометрического закона сложения. Точка на бесконечности —
 * null (нейтральный элемент O).
 */

export interface CurveR {
  readonly a: number;
  readonly b: number;
}

export type PointR = { readonly x: number; readonly y: number } | null;

export const discriminant = ({ a, b }: CurveR): number => -16 * (4 * a ** 3 + 27 * b ** 2);

export const isSingular = (c: CurveR): boolean => Math.abs(discriminant(c)) < 1e-9;

/** Значения y на кривой при данном x (0, 1 или 2 точки). */
export const yAt = ({ a, b }: CurveR, x: number): readonly number[] => {
  const rhs = x ** 3 + a * x + b;
  if (rhs < 0) return [];
  if (rhs === 0) return [0];
  const r = Math.sqrt(rhs);
  return [r, -r];
};

const EPS = 1e-9;

export const negate = (p: PointR): PointR => (p === null ? null : { x: p.x, y: -p.y });

/** Наклон секущей/касательной для сложения P + Q. */
const slope = (c: CurveR, p: { x: number; y: number }, q: { x: number; y: number }): number =>
  p.x === q.x && p.y === q.y
    ? (3 * p.x ** 2 + c.a) / (2 * p.y) // касательная (удвоение)
    : (q.y - p.y) / (q.x - p.x); // секущая

/** Групповое сложение точек над R. */
export const add = (c: CurveR, p: PointR, q: PointR): PointR => {
  if (p === null) return q;
  if (q === null) return p;
  // P + (−P) = O
  if (Math.abs(p.x - q.x) < EPS && Math.abs(p.y + q.y) < EPS) return null;
  const m = slope(c, p, q);
  const x = m ** 2 - p.x - q.x;
  const y = m * (p.x - x) - p.y;
  return { x, y };
};

/**
 * Геометрия сложения для отрисовки: третья точка пересечения прямой
 * с кривой (до отражения) и результат R = P + Q (после отражения).
 */
export interface AddGeometry {
  readonly slope: number | null; // null — вертикальная прямая (P + (−P))
  readonly third: PointR; // точка −R на кривой
  readonly result: PointR; // R = P + Q
}

export const addGeometry = (c: CurveR, p: PointR, q: PointR): AddGeometry => {
  if (p === null || q === null) return { slope: null, third: null, result: add(c, p, q) };
  if (Math.abs(p.x - q.x) < EPS && Math.abs(p.y + q.y) < EPS) {
    return { slope: null, third: null, result: null };
  }
  const m = slope(c, p, q);
  const result = add(c, p, q);
  const third = result === null ? null : { x: result.x, y: -result.y };
  return { slope: m, third, result };
};

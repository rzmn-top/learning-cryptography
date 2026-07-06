/**
 * Кубиты и гейты: комплексная арифметика, векторы состояний,
 * унитарные однокубитные гейты, CNOT, измерение. Чистые функции без DOM.
 * Соглашение об индексации: кубит 0 — старший (левый) бит базисного индекса.
 */

export interface Complex {
  readonly re: number;
  readonly im: number;
}

export const cpx = (re: number, im = 0): Complex => ({ re, im });
export const CZERO: Complex = cpx(0);
export const CONE: Complex = cpx(1);

export const cadd = (a: Complex, b: Complex): Complex => cpx(a.re + b.re, a.im + b.im);
export const cmul = (a: Complex, b: Complex): Complex =>
  cpx(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
export const cscale = (a: Complex, s: number): Complex => cpx(a.re * s, a.im * s);
export const cabs2 = (a: Complex): number => a.re * a.re + a.im * a.im;
export const carg = (a: Complex): number => Math.atan2(a.im, a.re);
export const cexp = (phi: number): Complex => cpx(Math.cos(phi), Math.sin(phi));

/** Вектор состояния n кубитов: массив из 2^n амплитуд. */
export type QState = readonly Complex[];

export interface Gate1 {
  readonly name: string;
  /** Матрица 2×2 по строкам: [m00, m01, m10, m11]. */
  readonly m: readonly [Complex, Complex, Complex, Complex];
}

const SQ = Math.SQRT1_2;

export const GATE_X: Gate1 = { name: 'X', m: [CZERO, CONE, CONE, CZERO] };
export const GATE_Z: Gate1 = { name: 'Z', m: [CONE, CZERO, CZERO, cpx(-1)] };
export const GATE_H: Gate1 = { name: 'H', m: [cpx(SQ), cpx(SQ), cpx(SQ), cpx(-SQ)] };
export const GATE_S: Gate1 = { name: 'S', m: [CONE, CZERO, CZERO, cpx(0, 1)] };
export const GATE_T: Gate1 = { name: 'T', m: [CONE, CZERO, CZERO, cexp(Math.PI / 4)] };

/** |0…0⟩ из n кубитов. */
export const zeroState = (n: number): QState => {
  const st: Complex[] = Array.from({ length: 1 << n }, () => CZERO);
  st[0] = CONE;
  return st;
};

/** Применить однокубитный гейт g к кубиту t состояния из n кубитов. */
export const applyGate = (state: QState, n: number, t: number, g: Gate1): QState => {
  const bit = 1 << (n - 1 - t);
  const [m00, m01, m10, m11] = g.m;
  const out: Complex[] = state.slice();
  for (let i = 0; i < state.length; i += 1) {
    if ((i & bit) !== 0) continue;
    const a = state[i] ?? CZERO;
    const b = state[i | bit] ?? CZERO;
    out[i] = cadd(cmul(m00, a), cmul(m01, b));
    out[i | bit] = cadd(cmul(m10, a), cmul(m11, b));
  }
  return out;
};

/** CNOT: контрольный кубит c, целевой t. */
export const applyCnot = (state: QState, n: number, c: number, t: number): QState => {
  const cb = 1 << (n - 1 - c);
  const tb = 1 << (n - 1 - t);
  const out: Complex[] = state.slice();
  for (let i = 0; i < state.length; i += 1) {
    if ((i & cb) !== 0 && (i & tb) === 0) {
      const j = i | tb;
      out[i] = state[j] ?? CZERO;
      out[j] = state[i] ?? CZERO;
    }
  }
  return out;
};

export const probabilities = (state: QState): readonly number[] => state.map(cabs2);

export interface MeasureResult {
  readonly outcome: 0 | 1;
  readonly state: QState;
}

/** Измерить кубит t в вычислительном базисе; rnd — случайное из [0, 1). */
export const measureQubit = (
  state: QState,
  n: number,
  t: number,
  rnd: number,
): MeasureResult => {
  const bit = 1 << (n - 1 - t);
  let p1 = 0;
  state.forEach((amp, i) => {
    if ((i & bit) !== 0) p1 += cabs2(amp);
  });
  const outcome: 0 | 1 = rnd < p1 ? 1 : 0;
  const keep = outcome === 1 ? p1 : 1 - p1;
  const norm = keep <= 1e-12 ? 1 : Math.sqrt(keep);
  const out = state.map((amp, i) =>
    ((i & bit) !== 0) === (outcome === 1) ? cscale(amp, 1 / norm) : CZERO,
  );
  return { outcome, state: out };
};

export interface BlochAngles {
  readonly theta: number;
  readonly phi: number;
}

/** Углы сферы Блоха чистого однокубитного состояния (глобальная фаза отброшена). */
export const blochAngles = (state: QState): BlochAngles => {
  const a = state[0] ?? CZERO;
  const b = state[1] ?? CZERO;
  const ra = Math.min(1, Math.sqrt(cabs2(a)));
  const theta = 2 * Math.acos(ra);
  const raw = cabs2(a) < 1e-12 || cabs2(b) < 1e-12 ? 0 : carg(b) - carg(a);
  const phi = ((raw % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  return { theta, phi };
};

/** Форматирование амплитуды для статусных строк виджетов. */
export const fmtComplex = (a: Complex): string => {
  const r = (x: number): string => (Object.is(x, -0) ? '0.00' : x.toFixed(2));
  if (Math.abs(a.im) < 5e-3) return r(a.re);
  return `${r(a.re)}${a.im < 0 ? '−' : '+'}${r(Math.abs(a.im))}i`;
};

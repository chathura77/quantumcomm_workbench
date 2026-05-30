export const EPSILON = 1e-12;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function dbToLinear(lossDb: number): number {
  return 10 ** (-lossDb / 10);
}

export function linearToDb(linear: number): number {
  if (linear <= 0) return Number.POSITIVE_INFINITY;
  return -10 * Math.log10(linear);
}

export function h2(q: number): number {
  if (!Number.isFinite(q)) return 0;
  if (q <= EPSILON || q >= 1 - EPSILON) return 0;
  return -q * Math.log2(q) - (1 - q) * Math.log2(1 - q);
}

export function round(value: number, digits = 4): number {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function formatId(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

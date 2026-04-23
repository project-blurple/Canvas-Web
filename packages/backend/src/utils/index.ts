// Make BigInt JSON serializable. See: https://github.com/GoogleChromeLabs/jsbi/issues/30
// @ts-expect-error This causes an error when running the server because toJSON doesn't exist. (But that's okay because we're adding it here!)
BigInt.prototype.toJSON = function (): string {
  return this.toString();
};

export function normalizeBounds({
  x0,
  y0,
  x1,
  y1,
}: {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}): { x0: number; y0: number; x1: number; y1: number } {
  return {
    x0: Math.min(x0, x1),
    y0: Math.min(y0, y1),
    x1: Math.max(x0, x1),
    y1: Math.max(y0, y1),
  };
}

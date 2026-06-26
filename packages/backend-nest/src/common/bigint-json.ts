// Make BigInt JSON serializable, so Discord snowflakes (user/guild IDs) serialise
// as strings. See: https://github.com/GoogleChromeLabs/jsbi/issues/30
declare global {
  interface BigInt {
    toJSON(): string;
  }
}

BigInt.prototype.toJSON = function (this: bigint): string {
  return this.toString();
};

export {};

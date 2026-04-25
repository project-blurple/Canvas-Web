// Make BigInt JSON serializable. See: https://github.com/GoogleChromeLabs/jsbi/issues/30
// @ts-expect-error This causes an error when running the server because toJSON doesn't exist. (But that's okay because we're adding it here!)
BigInt.prototype.toJSON = function (): string {
  return this.toString();
};

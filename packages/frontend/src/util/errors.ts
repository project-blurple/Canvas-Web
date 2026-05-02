export class UsageError extends Error {
  constructor(...args: ConstructorParameters<typeof Error>) {
    super(...args);
    this.name = "UsageError";
  }
}

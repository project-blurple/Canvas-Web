const oneMinuteInMs = 60_000;

export default class Cache<T = unknown> {
  declare private cache: Map<string, T>;
  declare private timers: Map<string, ReturnType<typeof setTimeout>>;
  declare private defaultStaleTime: number;

  constructor(options?: { defaultStaleTime?: number }) {
    this.cache = new Map();
    this.timers = new Map();
    this.defaultStaleTime = options?.defaultStaleTime ?? oneMinuteInMs;
  }

  public set(key: string, value: any, staleTime = this.defaultStaleTime): void {
    this.cache.set(key, value);
    if (this.timers.has(key)) clearTimeout(this.timers.get(key));
    const timer = setTimeout(() => this.delete(key), staleTime);
    this.timers.set(key, timer);
  }

  public get(key: string): T | undefined {
    return this.cache.get(key);
  }

  public has(key: string): boolean {
    return this.cache.has(key);
  }

  public invalidate(scope: string): number {
    const toDelete = Array.from(
      this.cache.keys().filter((key) => key.startsWith(scope)),
    );
    for (const key of toDelete) this.delete(key);
    return toDelete.length;
  }

  public clear(): void {
    this.cache.clear();
    for (const t of this.timers.values()) clearTimeout(t);
    this.timers.clear();
  }

  private delete(key: string): boolean {
    const removed = this.cache.delete(key);
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }
    return removed;
  }
}

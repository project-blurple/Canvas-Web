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

  set(key: string, value: any, staleTime = this.defaultStaleTime): void {
    this.cache.set(key, value);
    if (this.timers.has(key)) clearTimeout(this.timers.get(key));
    const timer = setTimeout(() => this.delete(key), staleTime);
    this.timers.set(key, timer);
  }

  get(key: string): T | undefined {
    return this.cache.get(key);
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  invalidate(scope: string): number {
    let deleted = 0;
    for (const key of this.cache.keys()) {
      if (key.startsWith(scope)) {
        void this.delete(key);
        deleted++;
      }
    }
    return deleted;
  }

  clear(): void {
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

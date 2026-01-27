import { Counter as ICounter } from '.';

// Since the memory store of cache-manager only offers a promise-based API,
// we use a simple memory cache with a synchronous API for the atomic counter.
// The implementation is based on https://github.com/isaacs/node-lru-cache?tab=readme-ov-file#storage-bounds-safety
class Cache {
  data = new Map();
  timers = new Map();

  set(k: string, v: any, ttl?: number) {
    if (ttl) {
      if (this.timers.has(k)) {
        clearTimeout(this.timers.get(k));
      }
      this.timers.set(
        k,
        setTimeout(() => this.del(k), ttl),
      );
    }
    this.data.set(k, v);
  }

  get(k: string) {
    return this.data.get(k);
  }

  del(k: string) {
    if (this.timers.has(k)) {
      clearTimeout(this.timers.get(k));
    }
    this.timers.delete(k);
    return this.data.delete(k);
  }
}

export class MemoryCounter implements ICounter {
  cache = new Cache();

  async get(key: string) {
    return this.cache.get(key) || 0;
  }

  async incr(key: string, ttl?: number) {
    return this.incrby(key, 1, ttl);
  }

  async incrby(key: string, value: number, ttl?: number) {
    const v = this.cache.get(key);
    const n = v || 0;
    const newValue = n + value;
    if (!v) {
      this.cache.set(key, newValue, ttl);
    } else {
      this.cache.set(key, newValue);
    }
    return newValue;
  }

  async reset(key: string) {
    this.cache.del(key);
  }
}

/* istanbul ignore file -- @preserve */
import { RedisStore } from 'cache-manager-redis-yet';
import { BloomFilter } from '.';
import { Cache } from '../cache';

export class RedisBloomFilter implements BloomFilter {
  cache: Cache;
  constructor(cache: Cache) {
    this.cache = cache;
  }

  private get store() {
    return this.cache.store.store as RedisStore;
  }

  async reserve(key: string, errorRate: number, capacity: number) {
    try {
      await this.store.client.bf.reserve(key, errorRate, capacity);
    } catch (error) {
      if (error.message.includes('ERR item exists')) {
        return;
      }
      throw error;
    }
  }

  async add(key: string, value: string) {
    await this.store.client.bf.add(key, value);
  }

  async mAdd(key: string, values: string[]) {
    await this.store.client.bf.mAdd(key, values);
  }

  async exists(key: string, value: string) {
    return this.store.client.bf.exists(key, value);
  }
}

import { CacheManager } from '../src/cache-manager';
import { Counter, LockCounter } from '../src/counter';
import { LockManager } from '../src/lock-manager';


describe('memory counter', () => {
  let counter: Counter;
  let cacheManager: CacheManager;

  beforeEach(async () => {
    cacheManager = new CacheManager();
    cacheManager.registerStore({ name: 'memory', store: 'memory' });
    counter = await cacheManager.createCounter({ name: 'test-counter', store: 'memory' });
  });

  afterEach(async () => {
    await cacheManager.flushAll();
  });

  test('incr, incrby, get, reset', async () => {
    const res = await counter.incr('test-key-1');
    expect(res).toBe(1);
    const res2 = await counter.incr('test-key-1');
    expect(res2).toBe(2);
    const res3 = await counter.incrby('test-key-1', 3);
    expect(res3).toBe(5);
    expect(await counter.get('test-key-1')).toBe(5);
    await counter.reset('test-key-1');
    expect(await counter.get('test-key-1')).toBe(0);
  });

  test('atomic', async () => {
    const promises = [];
    for (let i = 0; i < 100; i++) {
      promises.push(counter.incr('test-key-1'));
    }
    await Promise.all(promises);
    expect(await counter.get('test-key-1')).toBe(100);
  });
});

// It is required to install redis
(process.env.CACHE_REDIS_URL ? describe : describe.skip)('redis counter', () => {
  let counter: Counter;
  let cacheManager: CacheManager;

  beforeEach(async () => {
    cacheManager = new CacheManager({
      stores: {
        redis: {
          url: process.env.CACHE_REDIS_URL,
        },
      },
    });
    counter = await cacheManager.createCounter({ name: 'test-counter', store: 'redis' });
  });

  afterEach(async () => {
    await cacheManager.flushAll();
  });

  test('incr, incrby, get, reset', async () => {
    const res = await counter.incr('test-key-1');
    expect(res).toBe(1);
    const res2 = await counter.incr('test-key-1');
    expect(res2).toBe(2);
    const res3 = await counter.incrby('test-key-1', 3);
    expect(res3).toBe(5);
    expect(await counter.get('test-key-1')).toBe(5);
    await counter.reset('test-key-1');
    expect(await counter.get('test-key-1')).toBe(0);
  });

  test('atomic', async () => {
    const promises = [];
    for (let i = 0; i < 100; i++) {
      promises.push(counter.incr('test-key-1'));
    }
    await Promise.all(promises);
    expect(await counter.get('test-key-1')).toBe(100);
  });
});

describe('lock counter', () => {
  let counter: Counter;
  let cacheManager: CacheManager;

  beforeEach(async () => {
    cacheManager = new CacheManager();
    const cache = await cacheManager.createCache({ name: 'memory', store: 'memory' });
    const lockManager = new LockManager();
    counter = new LockCounter(cache, lockManager);
  });

  afterEach(async () => {
    await cacheManager.flushAll();
  });

  test('incr, incrby, get, reset', async () => {
    const res = await counter.incr('test-key-1');
    expect(res).toBe(1);
    const res2 = await counter.incr('test-key-1');
    expect(res2).toBe(2);
    const res3 = await counter.incrby('test-key-1', 3);
    expect(res3).toBe(5);
    expect(await counter.get('test-key-1')).toBe(5);
    await counter.reset('test-key-1');
    expect(await counter.get('test-key-1')).toBe(0);
  });

  test('atomic', async () => {
    const promises = [];
    for (let i = 0; i < 100; i++) {
      promises.push(counter.incr('test-key-1'));
    }
    await Promise.all(promises);
    expect(await counter.get('test-key-1')).toBe(100);
  });
});

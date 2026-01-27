import { BloomFilter } from '../src/bloom-filter';
import { CacheManager } from '../src/cache-manager';

describe('bloomFilter', () => {
  let bloomFilter: BloomFilter;
  let cacheManager: CacheManager;

  beforeEach(async () => {
    cacheManager = new CacheManager();
    cacheManager.registerStore({ name: 'memory', store: 'memory' });
    bloomFilter = await cacheManager.createBloomFilter({ store: 'memory' });
    await bloomFilter.reserve('bloom-test', 0.01, 1000);
  });

  afterEach(async () => {
    await cacheManager.flushAll();
  });

  it('should add and check', async () => {
    await bloomFilter.add('bloom-test', 'hello');
    expect(await bloomFilter.exists('bloom-test', 'hello')).toBeTruthy();
    expect(await bloomFilter.exists('bloom-test', 'world')).toBeFalsy();
  });

  it('should mAdd and check', async () => {
    await bloomFilter.mAdd('bloom-test', ['hello', 'world']);
    expect(await bloomFilter.exists('bloom-test', 'hello')).toBeTruthy();
    expect(await bloomFilter.exists('bloom-test', 'world')).toBeTruthy();
  });

  it('should return false if not reserved', async () => {
    expect(await bloomFilter.exists('not-reserved', 'hello')).toBeFalsy();
  });
});

// It is required to install redis stack server that includes redis bloom.
(process.env.CACHE_REDIS_URL ? describe : describe.skip)('bloomFilter with redis', () => {
  let bloomFilter: BloomFilter;
  let cacheManager: CacheManager;

  beforeEach(async () => {
    cacheManager = new CacheManager({
      stores: {
        redis: {
          url: process.env.CACHE_REDIS_URL,
        },
      },
    });
    bloomFilter = await cacheManager.createBloomFilter({ store: 'redis' });
    await bloomFilter.reserve('bloom-test', 0.01, 1000);
  });

  afterEach(async () => {
    await cacheManager.flushAll();
  });

  it('should add and check', async () => {
    await bloomFilter.add('bloom-test', 'hello');
    expect(await bloomFilter.exists('bloom-test', 'hello')).toBeTruthy();
    expect(await bloomFilter.exists('bloom-test', 'world')).toBeFalsy();
  });

  it('should mAdd and check', async () => {
    await bloomFilter.mAdd('bloom-test', ['hello', 'world']);
    expect(await bloomFilter.exists('bloom-test', 'hello')).toBeTruthy();
    expect(await bloomFilter.exists('bloom-test', 'world')).toBeTruthy();
  });

  it('should return false if not reserved', async () => {
    expect(await bloomFilter.exists('not-reserved', 'hello')).toBeFalsy();
  });
});

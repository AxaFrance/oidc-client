import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('issuer configuration cache', () => {
  let cache: typeof import('./cache');
  let storage: Storage;
  const configuration = { issuer: 'https://issuer.example.com' };

  beforeEach(async () => {
    vi.resetModules();
    vi.useFakeTimers();
    vi.setSystemTime(10000);
    storage = {
      length: 0,
      clear: vi.fn(),
      key: vi.fn(),
      removeItem: vi.fn(),
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
    };
    vi.stubGlobal('window', { sessionStorage: storage });
    cache = await import('./cache');
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns null for a missing entry', () => {
    expect(cache.getFromCache('issuer', storage, 60)).toBeNull();
    expect(storage.getItem).toHaveBeenCalledExactlyOnceWith('issuer');
  });

  it('persists the same timestamp and result that are cached in memory', () => {
    cache.setCache('issuer', configuration, storage);

    expect(storage.setItem).toHaveBeenCalledExactlyOnceWith(
      'issuer',
      '{"result":{"issuer":"https://issuer.example.com"},"timestamp":10000}',
    );
    expect(cache.getFromCache('issuer', storage, 60)).toBe(configuration);
    expect(storage.getItem).not.toHaveBeenCalled();
  });

  it('uses session storage when no storage is supplied', () => {
    cache.setCache('issuer', configuration);

    expect(storage.setItem).toHaveBeenCalledOnce();
    expect(cache.getFromCache('issuer', undefined, 60)).toBe(configuration);
  });

  it('supports an in-memory cache without storage', () => {
    expect(cache.getFromCache('issuer', null, 60)).toBeNull();
    cache.setCache('issuer', configuration, null);

    expect(cache.getFromCache('issuer', null, 60)).toBe(configuration);
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it('hydrates a persisted entry once and then uses the in-memory value', () => {
    vi.mocked(storage.getItem).mockReturnValue(
      '{"result":{"issuer":"https://issuer.example.com"},"timestamp":10000}',
    );

    const result = cache.getFromCache('issuer', storage, 60);
    expect(result).toEqual(configuration);
    expect(cache.getFromCache('issuer', storage, 60)).toBe(result);
    expect(storage.getItem).toHaveBeenCalledOnce();
  });

  it.each([
    [10999, 1, true],
    [11000, 1, false],
    [11001, 1, false],
    [10000, 0, false],
    [10000, -1, false],
  ])('honors the expiry boundary at %i with a TTL of %i seconds', (now, ttl, isValid) => {
    cache.setCache('issuer', configuration, storage);
    vi.setSystemTime(now);

    expect(cache.getFromCache('issuer', storage, ttl)).toEqual(isValid ? configuration : null);
  });

  it('keeps issuer entries independent and replaces an existing entry', () => {
    const replacement = { issuer: 'https://replacement.example.com' };
    cache.setCache('first', configuration, storage);
    cache.setCache('second', replacement, storage);
    cache.setCache('first', replacement, storage);

    expect(cache.getFromCache('first', storage, 60)).toBe(replacement);
    expect(cache.getFromCache('second', storage, 60)).toBe(replacement);
  });

  it('does not rehydrate an expired in-memory entry', () => {
    cache.setCache('issuer', configuration, storage);
    vi.setSystemTime(70000);

    expect(cache.getFromCache('issuer', storage, 60)).toBeNull();
    expect(storage.getItem).not.toHaveBeenCalled();
  });

  it('preserves JSON parsing failures for malformed persisted data', () => {
    vi.mocked(storage.getItem).mockReturnValue('{');

    expect(() => cache.getFromCache('issuer', storage, 60)).toThrow(SyntaxError);
  });

  it('preserves storage write failures while keeping the memory entry', () => {
    const error = new Error('Storage unavailable');
    vi.mocked(storage.setItem).mockImplementation(() => {
      throw error;
    });

    expect(() => cache.setCache('issuer', configuration, storage)).toThrow(error);
    expect(cache.getFromCache('issuer', storage, 60)).toBe(configuration);
  });
});

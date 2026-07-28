import { afterEach, describe, expect, it, vi } from 'vitest';

import { generateRandom } from './crypto';

describe('generateRandom', () => {
  const originalCrypto = Object.getOwnPropertyDescriptor(globalThis, 'crypto');

  afterEach(() => {
    if (originalCrypto) {
      Object.defineProperty(globalThis, 'crypto', originalCrypto);
    } else {
      delete (globalThis as { crypto?: Crypto }).crypto;
    }
  });

  it('uses Web Crypto to generate authentication-related random values', () => {
    const getRandomValues = vi.fn((buffer: Uint8Array) => {
      buffer.fill(1);
      return buffer;
    });
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: { getRandomValues },
    });

    expect(generateRandom(4)).toBe('BBBB');
    expect(getRandomValues).toHaveBeenCalledOnce();
  });

  it('does not fall back to a non-cryptographic random source', () => {
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: undefined,
    });

    expect(() => generateRandom(16)).toThrow(
      'Web Crypto API is unavailable; secure random values cannot be generated.',
    );
  });
});

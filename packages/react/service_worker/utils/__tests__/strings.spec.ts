import { describe, it, expect } from 'vitest';
import { countLetter } from '..';

describe('strings', () => {
  it('can count instance of char', () => {
    const result = countLetter('token.type.z', '.');
    expect(result).toBe(2);
  });
});

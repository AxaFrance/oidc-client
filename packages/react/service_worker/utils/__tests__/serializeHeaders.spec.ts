import { describe, it, expect } from 'vitest';
import { serializeHeaders } from '..';

describe('serializeHeaders', () => {
  it('can serialize basic header', () => {
    const result = serializeHeaders(
      new Headers({ 'Content-Type': 'application/json' })
    ); // Error: Argument of type 'Headers' is not assignable to parameter of type 'Headers'.(2345
    expect(result).toEqual({ 'content-type': 'application/json' });
  });
});

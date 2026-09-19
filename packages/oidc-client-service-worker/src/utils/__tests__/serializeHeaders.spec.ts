import { describe, expect, it } from 'vitest';

import { serializeHeaders } from '..';

describe('serializeHeaders', () => {
  it('can serialize basic header', () => {
    const result = serializeHeaders(new Headers({ 'Content-Type': 'application/json' }));
    expect(result).toEqual({ 'content-type': 'application/json' });
  });

  it('returns an empty object for empty headers', () => {
    expect(serializeHeaders(new Headers())).toEqual({});
  });

  it('normalizes names and preserves empty and combined header values', () => {
    const headers = new Headers({
      'X-Empty': '',
      'X-Custom': 'first',
      'Content-Type': 'text/plain',
    });
    headers.append('x-custom', 'second');

    expect(serializeHeaders(headers)).toEqual({
      'content-type': 'text/plain',
      'x-custom': 'first, second',
      'x-empty': '',
    });
    expect(headers.get('x-custom')).toBe('first, second');
  });

  it('preserves the combined value of repeated Set-Cookie headers', () => {
    const headers = new Headers();
    headers.append('Set-Cookie', 'first=1');
    headers.append('Set-Cookie', 'second=2');

    expect(serializeHeaders(headers)).toEqual({ 'set-cookie': 'first=1, second=2' });
  });

  it('returns a detached object that can be changed without mutating the headers', () => {
    const headers = new Headers({ 'X-Custom': 'original' });
    const serialized = serializeHeaders(headers);
    serialized['x-custom'] = 'changed';

    expect(headers.get('X-Custom')).toBe('original');
  });
});

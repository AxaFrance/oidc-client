import { describe, expect, it } from 'vitest';

import { normalizeUrl } from '../normalizeUrl';

describe('normalizeUrl', () => {
  it('keeps urls the same', () => {
    expect(normalizeUrl('http://foo.com/')).toBe('http://foo.com/');
    expect(normalizeUrl('https://foo.com/')).toBe('https://foo.com/');
  });
  it('adds slashes', () => {
    expect(normalizeUrl('http://foo.com')).toBe('http://foo.com/');
  });
  it('removes port numbers', () => {
    expect(normalizeUrl('http://foo.com:80/')).toBe('http://foo.com/');
    expect(normalizeUrl('https://foo.com:443/')).toBe('https://foo.com/');
  });
  it('removed port numbers and adds slashes', () => {
    expect(normalizeUrl('http://foo.com:80')).toBe('http://foo.com/');
    expect(normalizeUrl('https://foo.com:443')).toBe('https://foo.com/');
  });
  it('lowercases urls', () => {
    expect(normalizeUrl('http://FOO.com/')).toBe('http://foo.com/');
  });

  it('keeps invalid urls', () => {
    expect(normalizeUrl('foo')).toBe('foo');
  });
});

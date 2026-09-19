import { describe, expect, it } from 'vitest';

import { getLocation, getParseQueryStringFromLocation, getPath } from './route-utils';

describe('Route test Suite', () => {
  it.each([
    ['http://example.com/pathname', '/pathname'],
    ['http://example.com:3000/pathname/?search=test#hash', '/pathname#hash'],
    ['http://example.com:3000/pathname/#hash?search=test', '/pathname#hash'],
    ['http://example.com:3000/pathname#hash?search=test', '/pathname#hash'],
    ['capacitor://localhost/index.html', '/index.html'],
    ['capacitor://localhost/pathname#hash?search=test', '/pathname#hash'],
    ['http://example.com:3000/', ''],
    ['https://example.com/authentication/callback?state=abc&code=def#', '/authentication/callback'],
  ])('getPath should return the full path of an url', (uri, expected) => {
    const path = getPath(uri);
    expect(path).toBe(expected);
  });

  describe('URL parsing', () => {
    it('preserves the original URL and separates its components', () => {
      const href = 'https://example.com:8443/path/?state=abc#section';

      expect(getLocation(href)).toEqual({
        href,
        protocol: 'https:',
        host: 'example.com:8443',
        hostname: 'example.com',
        port: '8443',
        path: '/path/',
        search: 'state=abc',
        hash: '#section',
      });
    });

    it.each([
      ['https://example.com/path?outer=value#route?inner=value', 'inner=value', '#route'],
      ['https://example.com/path?outer=value#route?a?b', 'outer=value', '#route?a?b'],
      ['https://example.com/path', '', ''],
    ])('preserves query and fragment precedence for %s', (href, search, hash) => {
      expect(getLocation(href)).toMatchObject({ search, hash });
    });

    it.each([
      ['https://example.com/path/#_=_', '/path'],
      ['https://example.com/path//#', '/path/'],
      ['https://example.com/path/#/route/', '/path#/route/'],
    ])(
      'normalizes only the existing trailing slash and sentinel fragments for %s',
      (href, path) => {
        expect(getPath(href)).toBe(path);
      },
    );

    it.each([
      ['?name=Jane%20Doe&scope=openid%2Bprofile', { name: 'Jane Doe', scope: 'openid+profile' }],
      ['?scope=openid+profile', { scope: 'openid+profile' }],
      ['?key=first&key=last', { key: 'last' }],
      ['?empty=&flag', { empty: '', flag: 'undefined' }],
      ['?value=a=b', { value: 'a' }],
      ['', { '': 'undefined' }],
      ['?outer=value#route?inner=value', { inner: 'value' }],
      ['?%E5%90%8D=%E5%80%A4', { 名: '値' }],
    ])('preserves query decoding behavior for %s', (suffix, expected) => {
      expect(getParseQueryStringFromLocation(`https://example.com/${suffix}`)).toEqual(expected);
    });

    it.each(['?key=%', '?%ZZ=value'])('preserves malformed escape errors for %s', suffix => {
      expect(() => getParseQueryStringFromLocation(`https://example.com/${suffix}`)).toThrow(
        URIError,
      );
    });
  });

  it('wrong uri format', () => {
    expect(() => getPath('urimybad/toto.com')).toThrowError();
  });
});

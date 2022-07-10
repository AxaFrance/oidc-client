import { getPath } from './route-utils';


test.each([['http://example.com/pathname', '/pathname'], 
  ['http://example.com:3000/pathname/?search=test#hash', '/pathname#hash'], 
  ['http://example.com:3000/pathname/#hash?search=test', '/pathname#hash'], 
  ['http://example.com:3000/pathname#hash?search=test', '/pathname#hash'], 
  ['http://example.com:3000/', ''],])(
    'getPath should return the full path of an url',
    (uri, expected) => {

      const path = getPath(uri);
      expect(path).toBe(expected);
    },
);
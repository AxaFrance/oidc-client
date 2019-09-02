import { getPath } from './route-utils';

it('getPath should return the full path of an url', () => {
  const path1 = getPath('http://example.com/pathname');
  const path2 = getPath('http://example.com:3000/pathname/?search=test#hash');

  expect(path1).toEqual('/pathname');
  expect(path2).toEqual('/pathname/?search=test#hash');
});

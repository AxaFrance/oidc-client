import * as React from 'react';
import renderer from 'react-test-renderer';
import OidcRoutes, { getPath } from './OidcRoutes';

jest.mock('react-router-dom', () => ({
  Route: 'Route',
  Switch: 'Switch',
}));
jest.mock('../OidcComponents', () => ({
  NotAuthenticated: 'NotAuthenticated',
  NotAuthorized: 'NotAuthorized',
}));
jest.mock('../Callback', () => ({
  Callback: 'Callback',
  SilentCallback: 'SilentCallback',
}));
jest.mock('react-router', () => ({
  Route: 'Route',
  Switch: 'Switch',
}));

describe('Authenticating test suite', () => {
  it('renders correctly', () => {
    const matchMock = {
      url: 'http://url.com',
    };
    const props = {
      children: 'http://url.com',
      notAuthenticated: 'notAuthenticated',
      notAuthorized: 'notAuthorized',
      configuration: {
        redirect_uri: 'http://example.com:3000/authentication/callback',
        silent_redirect_uri: 'http://example.com:3000/authentication/silent_callback',
      },
    };
    const tree = renderer.create(<OidcRoutes {...props} match={matchMock} />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('getPath should return the full path of an url', () => {
    const path1 = getPath('http://example.com/pathname');
    const path2 = getPath('http://example.com:3000/pathname/?search=test#hash');

    expect(path1).toEqual('/pathname');
    expect(path2).toEqual('/pathname/?search=test#hash');
  });
});

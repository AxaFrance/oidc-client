import * as React from 'react';
import renderer from 'react-test-renderer';
import OidcRoutes from './OidcRoutes';

describe('Authenticating test suite', () => {
  it('renders correctly', () => {
    const matchMock = {
      url: 'http://url.com',
    };
    const props = {
      children: 'http://url.com',
      notAuthenticated: 'notAuthenticated',
      notAuthorized: 'notAuthorized',
      callbackComponent: () => <div>tcallback component</div>,
      configuration: {
        redirect_uri: 'http://example.com:3000/authentication/callback',
        silent_redirect_uri: 'http://example.com:3000/authentication/silent_callback',
      },
    };
    const tree = renderer.create(<OidcRoutes {...props} match={matchMock} />).toJSON();
    expect(tree).toMatchSnapshot();
  });
});

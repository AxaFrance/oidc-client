import * as React from 'react';
import renderer from 'react-test-renderer';
import OidcRoutes from './OidcRoutes';
import { FC } from 'react';

describe('Authenticating test suite', () => {
  it('renders correctly', () => {
    const notAuthenticated: FC = () => <>'notAuthenticated'</>;
    const notAuthorized: FC = () => <>'notAuthorized'</>;
    const props = {
      children: 'http://url.com',
      notAuthenticated,
      notAuthorized,
      callbackComponent: () => <div>tcallback component</div>,
      configuration: {
        redirect_uri: 'http://example.com:3000/authentication/callback',
        silent_redirect_uri: 'http://example.com:3000/authentication/silent_callback',
      },
    };
    const tree = renderer.create(<OidcRoutes {...props} />).toJSON();
    expect(tree).toMatchSnapshot();
  });
});

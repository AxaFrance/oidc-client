import * as React from 'react';
import OidcRoutes from './OidcRoutes';
import { FC } from 'react';
import {render} from "@testing-library/react";

describe('Authenticating test suite', () => {
  it('renders correctly', () => {
    const props = {
      children: 'http://url.com',
      callbackSuccessComponent: () => <div>tcallback component</div>,
      callbackErrorComponent: () => <div>tcallback component</div>,
      configuration: {
        redirect_uri: 'http://example.com:3000/authentication/callback',
      },
    };
    const { asFragment } = render(<OidcRoutes {...props} />);
    expect(asFragment()).toMatchSnapshot();
  });
});

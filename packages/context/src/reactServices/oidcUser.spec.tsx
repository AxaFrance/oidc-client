import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';

import { withOidcUser } from './oidcUser';
import { AuthenticationContext } from '../oidcContext';

const values = {
  isEnabled: true,
  oidcUser: { user: 'tom' },
  authenticating: { param: 'test' },
};

const getWrapper = (vals = values) => ({ children }) => (
  <AuthenticationContext.Provider value={vals}>{children}</AuthenticationContext.Provider>
);

describe('oidcUser tests suite', () => {
  it('withOidcUser should inject oidcUser if user connected', () => {
    const testingComponent = ({ oidcUser }) => (
      <div>
        <span data-testid="username">{oidcUser}</span>
      </div>
    );
    const Component = withOidcUser(testingComponent);
    const { getByTestId, asFragment } = render(<Component />, {
      wrapper: getWrapper({ oidcUser: 'Franck' }),
    });
    expect(asFragment()).toMatchSnapshot();
    expect(getByTestId('username')).toHaveTextContent('Franck');
  });
});

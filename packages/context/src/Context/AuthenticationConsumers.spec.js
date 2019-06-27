import React from 'react';
import { renderHook } from '@testing-library/react-hooks';
import { render } from '@testing-library/react';
import { AuthenticationContext } from './AuthenticationContextCreator';
import 'jest-dom/extend-expect';

import * as consumers from './AuthenticationConsumers';

const getWrapper = values => ({ children }) => (
  <AuthenticationContext.Provider value={values}>{children}</AuthenticationContext.Provider>
);
describe('Consumers service tests suite', () => {
  const values = {
    isEnabled: true,
    oidcUser: { user: 'tom' },
    isLogout: false,
  };
  const getUserManager = () => ({
    param: 'Mock version',
  });
  const authenticateUser = jest.fn(() => jest.fn());

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not call authentication when enabled', () => {
    renderHook(() => consumers.useOidcSecure(authenticateUser, getUserManager, '/locationUser'), {
      wrapper: getWrapper(values),
    });
    expect(authenticateUser).toHaveBeenCalledWith({ param: 'Mock version' }, '/locationUser');
  });

  it('should NOT call authentication when disabled', () => {
    renderHook(() => consumers.useOidcSecure(authenticateUser, getUserManager, '/locationUser'), {
      wrapper: getWrapper({ ...values, isEnabled: false }),
    });
    expect(authenticateUser).not.toHaveBeenCalled();
  });

  it('should NOT call authentication if user logout', () => {
    renderHook(() => consumers.useOidcSecure(authenticateUser, getUserManager, '/locationUser'), {
      wrapper: getWrapper({ ...values, isLogout: true }),
    });
    expect(authenticateUser).not.toHaveBeenCalled();
  });

  it('withOidcUser should inject oidcUser if user connected', () => {
    const testingComponent = ({ oidcUser }) => (
      <div>
        <span data-testid="username">{oidcUser}</span>
      </div>
    );
    const Component = consumers.withOidcUser(testingComponent);
    const { getByTestId, asFragment } = render(<Component />, {
      wrapper: getWrapper({ oidcUser: 'Franck' }),
    });
    expect(asFragment()).toMatchSnapshot();
    expect(getByTestId('username')).toHaveTextContent('Franck');
  });

  it('withOidcSecurewithRouter should call authentication and AuthenticatingComponent during authentication process', () => {
    const contextMock = {
      isEnabled: true,
      oidcUser: null,
      isLogout: false,
    };

    const mockedProps = {
      location: '/myurl',
      authenticateUser,
      getUserManager,
    };

    const testingComponent = () => <div data-testid="componentMount" />;
    const Component = consumers.withOidcSecurewithRouter(testingComponent);
    const { queryByTestId, asFragment } = render(<Component {...mockedProps} />, {
      wrapper: getWrapper({ ...contextMock }),
    });
    expect(asFragment()).toMatchSnapshot();
    expect(queryByTestId('componentMount')).toBeNull();
  });

  it('withOidcSecurewithRouter should show component if user connected', () => {
    const contextMock = {
      isEnabled: true,
      oidcUser: { user: 'tom' },
      isLogout: false,
    };

    const mockedProps = {
      location: '/myurl',
      authenticateUser,
      getUserManager,
    };

    const testingComponent = () => <div data-testid="componentMount" />;
    const Component = consumers.withOidcSecurewithRouter(testingComponent);
    const { queryByTestId } = render(<Component {...mockedProps} />, {
      wrapper: getWrapper({ ...contextMock }),
    });
    const greetingNode = queryByTestId('componentMount');
    expect(queryByTestId('componentMount')).not.toBeNull();
  });
});

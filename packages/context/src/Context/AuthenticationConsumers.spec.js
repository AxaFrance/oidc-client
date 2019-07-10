import React from 'react';
import { renderHook } from '@testing-library/react-hooks';
import { render } from '@testing-library/react';
import { AuthenticationContext } from './AuthenticationContextCreator';
import 'jest-dom/extend-expect';
import {useOidcSecure, withOidcUser, withOidcSecurewithRouter} from './AuthenticationConsumers';

describe('Consumers service tests suite', () => {
  const values = {
    isEnabled: true,
    oidcUser: { user: 'tom' },
    authenticating: { param: 'test' },
  };

  const getWrapper = (vals = values) => ({ children }) => (
    <AuthenticationContext.Provider value={vals}>{children}</AuthenticationContext.Provider>
  );
  const getUserManager = () => ({
    param: 'Mock version',
  });
  const authenticateUser = jest.fn(() => jest.fn());

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call authentication when enabled',  () => {
     renderHook(() => useOidcSecure(authenticateUser, getUserManager, '/locationUser'), {
      wrapper: getWrapper(),
    });

    expect(authenticateUser).toHaveBeenCalledWith({ param: 'Mock version' }, '/locationUser');
  });

  it('should NOT call authentication when disabled', () => {
    renderHook(() => useOidcSecure(authenticateUser, getUserManager, '/locationUser'), {
      wrapper: getWrapper({ ...values, isEnabled: false }),
    });
    expect(authenticateUser).not.toHaveBeenCalled();
  });

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

  it('withOidcSecurewithRouter should call authentication and AuthenticatingComponent during authentication process', () => {
    const contextMock = {
      isEnabled: true,
      oidcUser: null,
    };

    const mockedProps = {
      location: '/myurl',
      authenticateUser,
      getUserManager,
    };

    const testingComponent = () => <div data-testid="componentMount" />;
    const Component = withOidcSecurewithRouter(testingComponent);
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
    };

    const mockedProps = {
      location: '/myurl',
      authenticateUser,
      getUserManager,
    };

    const testingComponent = () => <div data-testid="componentMount" />;
    const Component = withOidcSecurewithRouter(testingComponent);
    const { queryByTestId } = render(<Component {...mockedProps} />, {
      wrapper: getWrapper({ ...contextMock }),
    });
    expect(queryByTestId('componentMount')).not.toBeNull();
  });
});

import React from 'react';
import { renderHook } from '@testing-library/react-hooks';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';

import { useOidcSecure, OidcSecureWithInjectedFunctions } from './OidcSecure';
import { AuthenticationContext } from '../oidcContext';
import { oidcContext } from '../oidcContext/AuthenticationContext';

describe('OidcSecure tests suite', () => {
  const values: oidcContext = {
    isEnabled: true,
    oidcUser: { user: { name: 'tom', isExpired: false } },
    authenticating: () => (
      <div>
        <span>Authenticating...</span>
      </div>
    ),
  };

  const getWrapper = (vals = values) => ({ children }) => (
    <AuthenticationContext.Provider value={vals}>{children}</AuthenticationContext.Provider>
  );

  const userManager = 'user Manager mock';
  const getUserManagerInternal = () => userManager;
  const authenticateUserInternal = jest.fn(() => jest.fn());
  const oidcLogInternal = {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });
  const AuthenticatingInternal = () => (
    <div>
      <span>Default authenticating page</span>
    </div>
  );
  const isRequireAuthenticationInternal = user => !user || (user && user.expired === true);
  const WrappedComponent = () => (
    <div>
      <span>Testing page</span>
    </div>
  );
  const mockedProps = {
    location: '/myurl',
    history: { push: () => {} },
    authenticateUserInternal,
    getUserManagerInternal,
    isRequireAuthenticationInternal,
    AuthenticatingInternal,
  };
  const history = { push: () => {} };
  const TestingComponent = ({ props1 }) => <div data-testid="componentMount">{props1}</div>;

  it('should call authentication when enabled, and display page if user connected', () => {
    const { result } = renderHook(
      () =>
        useOidcSecure(
          authenticateUserInternal,
          userManager,
          '/locationUser',
          history,
          oidcLogInternal,
          AuthenticatingInternal,
          isRequireAuthenticationInternal,
          WrappedComponent
        ),
      {
        wrapper: getWrapper(),
      }
    );

    expect(authenticateUserInternal).toHaveBeenCalledWith(userManager, '/locationUser', history);
    expect(result.current()).toEqual(
      <div>
        <span>Testing page</span>
      </div>
    );
  });

  it('should display authenticating component when user is not connected', () => {
    const withoutUserValues = { ...values, oidcUser: undefined };

    const { result } = renderHook(
      () =>
        useOidcSecure(
          authenticateUserInternal,
          userManager,
          '/locationUser',
          history,
          oidcLogInternal,
          AuthenticatingInternal,
          isRequireAuthenticationInternal,
          WrappedComponent
        ),
      {
        wrapper: getWrapper(withoutUserValues),
      }
    );

    expect(result.current()).toEqual(
      <div>
        <span>Authenticating...</span>
      </div>
    );
  });

  it('should display default authenticating component when user is not connected and ahenticating page is not set', () => {
    const withoutUserValues = { ...values, oidcUser: undefined, authenticating: undefined };

    const { result } = renderHook(
      () =>
        useOidcSecure(
          authenticateUserInternal,
          userManager,
          '/locationUser',
          history,
          oidcLogInternal,
          AuthenticatingInternal,
          isRequireAuthenticationInternal,
          WrappedComponent
        ),
      {
        wrapper: getWrapper(withoutUserValues),
      }
    );
    expect(result.current()).toEqual(
      <div>
        <span>Default authenticating page</span>
      </div>
    );
  });

  it('should NOT call authentication when disabled', () => {
    const { result } = renderHook(
      () =>
        useOidcSecure(
          authenticateUserInternal,
          userManager,
          '/locationUser',
          history,
          oidcLogInternal,
          AuthenticatingInternal,
          isRequireAuthenticationInternal,
          WrappedComponent
        ),
      {
        wrapper: getWrapper({ ...values, isEnabled: false }),
      }
    );
    expect(authenticateUserInternal).not.toHaveBeenCalled();
    expect(result.current()).toEqual(
      <div>
        <span>Testing page</span>
      </div>
    );
  });

  it('OidcSecureWithInjectedFunctions should call authentication and AuthenticatingComponent during authentication process', () => {
    const contextMock = {
      ...values,
      isEnabled: true,
      oidcUser: null,
      authenticating: undefined,
    };

    const { queryByTestId, asFragment } = render(
      <OidcSecureWithInjectedFunctions {...mockedProps}>
        <TestingComponent />
      </OidcSecureWithInjectedFunctions>,
      {
        wrapper: getWrapper({ ...contextMock }),
      }
    );
    expect(asFragment()).toMatchSnapshot();
    expect(queryByTestId('componentMount')).toBeNull();
  });

  it('OidcSecureWithInjectedFunctions should show component if user connected', () => {
    const contextMock = {
      ...values,
      isEnabled: true,
      oidcUser: { user: 'tom' },
    };

    const { queryByTestId, asFragment } = render(
      <OidcSecureWithInjectedFunctions {...mockedProps}>
        <TestingComponent />
      </OidcSecureWithInjectedFunctions>,
      {
        wrapper: getWrapper({ ...contextMock }),
      }
    );
    expect(asFragment()).toMatchSnapshot();
    expect(queryByTestId('componentMount')).not.toBeNull();
  });
});

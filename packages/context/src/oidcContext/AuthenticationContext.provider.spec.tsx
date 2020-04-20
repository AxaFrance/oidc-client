import * as React from 'react';

import { render, waitForDomChange, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';

import { AuthenticationProviderInt, withComponentOverrideProps } from './AuthenticationContext.provider';
import { AuthenticationContext } from './AuthenticationContext';

const AppTest = () => {
  const { oidcUser, isLoading, error, isEnabled, login, logout } = React.useContext(AuthenticationContext);

  return (
    <>
      <span data-testid="oidcUser">{JSON.stringify(oidcUser)}</span>
      <span data-testid="isLoading">{JSON.stringify(isLoading)}</span>
      <span data-testid="error">{JSON.stringify(error)}</span>
      <span data-testid="isEnabled">{JSON.stringify(isEnabled)}</span>

      <button type="button" onClick={() => login()}>
        login
      </button>
      <button type="button" onClick={() => logout()}>
        logout
      </button>
    </>
  );
};

const userMock = {
  firstname: 'Jean',
  token: 'SQSDFsdqfsdf234AEFZF',
};

const userManagerMock = {
  getUser: jest.fn(() => Promise.resolve(userMock)),
  events: {
    addUserLoaded: jest.fn(),
    addSilentRenewError: jest.fn(),
    addUserUnloaded: jest.fn(),
    addUserSignedOut: jest.fn(),
    addAccessTokenExpired: jest.fn(),
    removeUserLoaded: jest.fn(),
    removeSilentRenewError: jest.fn(),
    removeUserUnloaded: jest.fn(),
    removeUserSignedOut: jest.fn(),
    removeAccessTokenExpired: jest.fn(),
  },
};

const propsMocks = {
  location: 'location',
  history: 'ReactOidcHistory',
  loggerLevel: 'loggerLevel',
  logger: 'loggerMock',
  notAuthenticated: () => {
    return <div>This is notAuthenticated</div>;
  },
  notAuthorized: () => {
    return <div>This is notAuthorized</div>;
  },
  authenticating: () => {
    return <div>This is authenticating</div>;
  },
  callbackComponentOverride: () => {
    return <div>This is callbackComponentOverride</div>;
  },
  sessionLostComponent: () => {
    return <div>This is sessionLostComponent</div>;
  },
  CallbackInt: () => {
    return <div>This is callback</div>;
  },
  UserStore: 'UserStore',
  isEnabled: true,
  configuration: 'configuration',
  authenticationServiceInt: () => userManagerMock,
  setLoggerInt: jest.fn(),
  OidcRoutesInt: jest.fn(({ children }) => {
    return <div>{children}</div>;
  }),
  oidcLogInt: {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  },
  authenticateUserInt: jest.fn(() => () => {}),
  logoutUserInt: jest.fn(),
};

const getWrapper = props => ({ children }) => <AuthenticationProviderInt {...props}>{children}</AuthenticationProviderInt>;

describe('AuthContext tests suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    propsMocks.logoutUserInt.mockImplementation(() => Promise.resolve());
  });

  it('should mount provider without error', async () => {
    const { asFragment } = render(<AppTest />, { wrapper: getWrapper(propsMocks) });
    // Should show loading in snap
    expect(asFragment()).toMatchSnapshot();
    await waitForDomChange();
    // Should show user and cancel loading in snap
    expect(asFragment()).toMatchSnapshot();
  });

  it('should mount provider without error without callbackComponentOverride', async () => {
    const { asFragment } = render(<AppTest />, {
      wrapper: getWrapper({ ...propsMocks, callbackComponentOverride: undefined }),
    });

    await waitForDomChange();
    // Should show user and cancel loading in snap
    expect(asFragment()).toMatchSnapshot();
  });

  it('should call corrects initializer on mount', async () => {
    render(<AppTest />, { wrapper: getWrapper(propsMocks) });
    await waitForDomChange();

    expect(propsMocks.setLoggerInt).toBeCalledWith('loggerLevel', 'loggerMock');
    expect(userManagerMock.events.addUserLoaded).toBeCalled();
    expect(userManagerMock.events.addSilentRenewError).toBeCalled();
    expect(userManagerMock.events.addUserUnloaded).toBeCalled();
    expect(userManagerMock.events.addUserSignedOut).toBeCalled();
    expect(userManagerMock.events.addAccessTokenExpired).toBeCalled();
    expect(userManagerMock.getUser).toBeCalled();
  });

  it('should not cll loead user if component unomount', async () => {
    const { getByTestId, unmount } = render(<AppTest />, { wrapper: getWrapper(propsMocks) });
    const userValue = getByTestId('oidcUser');
    unmount();
    expect(userValue).toHaveTextContent('null');
  });

  it('should remove events  on unmount', async () => {
    const { unmount } = render(<AppTest />, { wrapper: getWrapper(propsMocks) });
    await waitForDomChange();

    expect(userManagerMock.events.removeUserLoaded).not.toBeCalled();
    expect(userManagerMock.events.removeSilentRenewError).not.toBeCalled();
    expect(userManagerMock.events.removeUserUnloaded).not.toBeCalled();
    expect(userManagerMock.events.removeUserSignedOut).not.toBeCalled();
    expect(userManagerMock.events.removeAccessTokenExpired).not.toBeCalled();

    unmount();

    expect(userManagerMock.events.removeUserLoaded).toBeCalled();
    expect(userManagerMock.events.removeSilentRenewError).toBeCalled();
    expect(userManagerMock.events.removeUserUnloaded).toBeCalled();
    expect(userManagerMock.events.removeUserSignedOut).toBeCalled();
    expect(userManagerMock.events.removeAccessTokenExpired).toBeCalled();
  });

  it('should change state and call when click on login', async () => {
    const { getByTestId, getByText } = render(<AppTest />, { wrapper: getWrapper(propsMocks) });
    await waitForDomChange();
    const loginButton = getByText('login');
    const loading = getByTestId('isLoading');
    expect(loading).toHaveTextContent('false');

    fireEvent.click(loginButton);
    expect(propsMocks.authenticateUserInt).toBeCalledWith(userManagerMock, propsMocks.location, propsMocks.history);
    expect(loading).toHaveTextContent('true');
  });

  it('should change state and call when click on logout', async () => {
    const { getByText } = render(<AppTest />, { wrapper: getWrapper(propsMocks) });
    await waitForDomChange();
    const logoutButton = getByText('logout');

    fireEvent.click(logoutButton);
    expect(propsMocks.logoutUserInt).toBeCalledWith(userManagerMock);
  });

  it('should change state and call when click on logout', async () => {
    propsMocks.logoutUserInt.mockImplementation(() => Promise.reject(new Error('error occured 1233123')));
    const { getByTestId, getByText } = render(<AppTest />, { wrapper: getWrapper(propsMocks) });
    await waitForDomChange();
    const logoutButton = getByText('logout');
    const error = getByTestId('error');
    expect(error).toHaveTextContent('""');

    fireEvent.click(logoutButton);

    await waitForDomChange();

    expect(propsMocks.logoutUserInt).toBeCalledWith(userManagerMock);
    expect(error).toHaveTextContent('error occured 1233123');
  });

  it('should return correct component', () => {
    const ComponentCallback = (props: React.PropsWithChildren<any>) => {
      const { callbackComponentOverride: OverrideComponent, ...otherProps } = props;
      return (
        <div>
          <div>
            <OverrideComponent />
          </div>
          <span data-testid="oidcUser">{JSON.stringify(otherProps)}</span>
        </div>
      );
    };

    const propsHoc = {
      prop1: 'value1',
      prop2: 'value2',
    };

    const CustomCallback = (props: React.PropsWithChildren<any>) => <div>Custom callback</div>;

    const WithHoc = withComponentOverrideProps(ComponentCallback, CustomCallback);

    const { asFragment } = render(<WithHoc {...propsHoc} />);
    expect(asFragment()).toMatchSnapshot();
  });
});

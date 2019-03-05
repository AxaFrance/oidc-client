import {
  onUserLoaded,
  onUserUnloaded,
  onError,
  login,
  logout,
  setDefaultState,
  onAccessTokenExpired
} from './AuthenticationContext.container';
import * as services from '../Services';

jest.mock('../Services');
jest.mock('./AuthenticationContext', () => 'AuthenticationContext');

describe('AuthContext tests suite', () => {
  let setOidcStateMock;
  let propsMock;
  let historyMock;
  let userManagerMock;
  let previousOidcState;
  let onUserUnloadedMock;
  let onUserUnloadedMockReturn;
  const userMock = {
    name: 'name',
    token: 'token wyz',
    anyProp: 'lorem ipsum'
  };
  const configurationMock = {
    configProps1: 'configValue1',
    configProps2: 'configValue2'
  };

  beforeEach(() => {
    userManagerMock = {
      removeUser: jest.fn(),
      signinSilent: jest.fn()
    };
    // eslint-disable-next-line
    services.authenticateUser = jest.fn(() => () => jest.fn());
    // eslint-disable-next-line
    services.authenticationService = jest.fn(() => userManagerMock);
    // eslint-disable-next-line
    services.logoutUser = jest.fn();
    previousOidcState = {
      prop1: 'value1',
      prop2: 'value2',
      userManager: userManagerMock
    };
    setOidcStateMock = jest.fn();
    onUserUnloadedMockReturn = jest.fn();
    onUserUnloadedMock = jest.fn(() => onUserUnloadedMockReturn);
    propsMock = {
      isEnabled: true,
      history: historyMock,
      oidcState: previousOidcState,
      setOidcState: setOidcStateMock,
      configuration: configurationMock,
      location: 'locationMock',
      onUserUnloaded: onUserUnloadedMock
    };
    jest.clearAllMocks();
  });

  it('should set state with user when call onUserLoaded', async () => {
    onUserLoaded(previousOidcState, setOidcStateMock)(userMock);
    expect(propsMock.setOidcState).toBeCalledWith({
      ...previousOidcState,
      isLoading: false,
      oidcUser: userMock
    });
  });

  it('should set state and redirect to location when call onUserUnload', () => {
    onUserUnloaded(previousOidcState, setOidcStateMock)();
    expect(propsMock.setOidcState).toBeCalledWith({
      ...previousOidcState,
      isLoading: false,
      oidcUser: null
    });
  });

  it('should set state and call silentSignin to location when call onAccessTokenExpired', () => {
    onAccessTokenExpired(previousOidcState, setOidcStateMock)();
    expect(propsMock.setOidcState).toBeCalledWith({
      ...previousOidcState,
      isLoading: false,
      oidcUser: null
    });
    expect(userManagerMock.signinSilent).toBeCalled();
  });

  it('should set default state when call setDefaultState', () => {
    const defaultState = setDefaultState(propsMock);
    expect(services.authenticationService).toBeCalledWith(configurationMock);
    expect(defaultState).toEqual({
      isEnabled: true,
      oidcUser: undefined,
      userManager: userManagerMock,
      isLoading: false,
      error: '',
      isLogout: false
    });
  });

  it('should set state and call authentication when call login function', async () => {
    await login(previousOidcState, setOidcStateMock, propsMock.location)();
    expect(propsMock.setOidcState).toBeCalledWith({
      ...previousOidcState,
      isLoading: true,
      oidcUser: null
    });
    expect(services.authenticateUser).toBeCalledWith(
      userManagerMock,
      'locationMock'
    );
  });

  it('should set state and call onUserUnload function when call logout', async () => {
    await logout(previousOidcState, setOidcStateMock)('redirection Url');
    expect(propsMock.setOidcState).toBeCalledWith({
      ...previousOidcState,
      isLoading: true,
      oidcUser: null,
      isLogout: true
    });
    expect(services.logoutUser).toBeCalledWith(userManagerMock);
  });

  it('should set state with erreor when call onError function', () => {
    onError(previousOidcState, setOidcStateMock)({
      message: 'error unexcecpted'
    });
    expect(propsMock.setOidcState).toBeCalledWith({
      ...previousOidcState,
      isLoading: false,
      error: 'error unexcecpted'
    });
  });
});

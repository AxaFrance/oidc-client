import {
  onUserLoaded,
  onUserUnloaded,
  onError,
  login,
  logout,
  setDefaultState,
  onAccessTokenExpired,
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
    anyProp: 'lorem ipsum',
  };
  const configurationMock = {
    configProps1: 'configValue1',
    configProps2: 'configValue2',
  };

  beforeEach(() => {
    userManagerMock = {
      removeUser: jest.fn(),
      signinSilent: jest.fn(),
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
      userManager: userManagerMock,
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
      onUserUnloaded: onUserUnloadedMock,
    };
    jest.clearAllMocks();
  });

  it('should set state with user when call onUserLoaded', async () => {
    onUserLoaded(setOidcStateMock)(userMock);
    expect(setOidcStateMock).toHaveBeenCalledWith(expect.any(Function));
    const newState = setOidcStateMock.mock.calls[0][0](previousOidcState);
    expect(newState).toEqual({
      isLoading: false,
      oidcUser: { anyProp: 'lorem ipsum', name: 'name', token: 'token wyz' },
      prop1: 'value1',
      prop2: 'value2',
      userManager: userManagerMock,
    });
  });

  it('should set state and redirect to location when call onUserUnload', () => {
    onUserUnloaded(setOidcStateMock)();
    expect(setOidcStateMock).toHaveBeenCalledWith(expect.any(Function));
    const newState = setOidcStateMock.mock.calls[0][0](previousOidcState);
    expect(newState).toEqual({
      isLoading: false,
      oidcUser: null,
      prop1: 'value1',
      prop2: 'value2',
      userManager: userManagerMock,
    });
  });

  it('should set state and call silentSignin to location when call onAccessTokenExpired', () => {
    onAccessTokenExpired(setOidcStateMock, userManagerMock.signinSilent)();
    expect(setOidcStateMock).toHaveBeenCalledWith(expect.any(Function));
    expect(userManagerMock.signinSilent).toHaveBeenCalled();
    const newState = setOidcStateMock.mock.calls[0][0](previousOidcState);
    expect(newState).toEqual({
      isLoading: false,
      oidcUser: null,
      prop1: 'value1',
      prop2: 'value2',
      userManager: userManagerMock,
    });
  });

  it('should set default state when call setDefaultState', () => {
    const defaultState = setDefaultState(propsMock);
    expect(services.authenticationService).toHaveBeenCalledWith(configurationMock);
    expect(defaultState).toEqual({
      isEnabled: true,
      oidcUser: undefined,
      userManager: userManagerMock,
      isLoading: false,
      error: '',
    });
  });

  it('should set state and call authentication when call login function', async () => {
    await login(userManagerMock, setOidcStateMock, propsMock.location)();
    expect(setOidcStateMock).toHaveBeenCalledWith(expect.any(Function));
    expect(services.authenticateUser).toHaveBeenCalledWith(userManagerMock, 'locationMock');
    const newState = setOidcStateMock.mock.calls[0][0](previousOidcState);
    expect(newState).toEqual({
      isLoading: true,
      oidcUser: null,
      prop1: 'value1',
      prop2: 'value2',
      userManager: userManagerMock,
    });
  });

  it('should set state and call onUserUnload function when call logout', async () => {
    await logout(userManagerMock, setOidcStateMock)('redirection Url');
    expect(services.logoutUser).toHaveBeenCalledWith(userManagerMock);
  });

  it('should set state with erreor when call onError function', () => {
    onError(setOidcStateMock)({
      message: 'error unexpected',
    });
    expect(setOidcStateMock).toHaveBeenCalledWith(expect.any(Function));
    const newState = setOidcStateMock.mock.calls[0][0](previousOidcState);
    expect(newState).toEqual({
      isLoading: false,
      error: 'error unexpected',
      prop1: 'value1',
      prop2: 'value2',
      userManager: userManagerMock,
    });
  });
});

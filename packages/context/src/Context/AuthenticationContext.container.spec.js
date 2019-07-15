import { renderHook } from '@testing-library/react-hooks';

import {
  onUserLoaded,
  onUserUnloaded,
  onError,
  login,
  logout,
  setDefaultState,
  onAccessTokenExpired,
  addOidcEvents,
} from './AuthenticationContext.container';
import * as services from '../Services';
import {
  useAuthenticateContextHook,
  removeOidcEvents,
  oidcReducer,
} from '../../dist/Context/AuthenticationContext.container';

jest.mock('../Services');
jest.mock('./AuthenticationContext', () => 'AuthenticationContext');

describe('AuthContext tests suite', () => {
  let dispatch;
  let propsMock;
  let historyMock;
  let userManagerMock;
  let previousOidcState;
  let onUserUnloadedMock;
  let onUserUnloadedMockReturn;
  let addEventMock;
  let removeEventMock;
  let setLogger;
  let authenticationService;
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
      getUser: jest.fn(() => ({ then: () => userMock })),
      events: 'Some Events',
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
    dispatch = jest.fn();
    onUserUnloadedMockReturn = jest.fn();
    onUserUnloadedMock = jest.fn(() => onUserUnloadedMockReturn);
    propsMock = {
      isEnabled: true,
      history: historyMock,
      oidcState: previousOidcState,
      setOidcState: dispatch,
      configuration: configurationMock,
      location: 'locationMock',
      onUserUnloaded: onUserUnloadedMock,
    };
    addEventMock = jest.fn();
    removeEventMock = jest.fn();
    setLogger = jest.fn();
    authenticationService = jest.fn(() => userManagerMock);
    jest.clearAllMocks();
  });
  describe('reducer tests suite', () => {
    const state = {
      prop1: 'val1',
      prop2: 'val2',
      isEnabled: true,
      loading: false,
    };
    it('should Reducer return correct state with ON_ERROR', () => {
      const action = {
        type: 'ON_ERROR',
        message: 'error message',
      };
      const result = oidcReducer(state, action);
      expect(result).toEqual({
        error: 'error message',
        isEnabled: true,
        isLoading: false,
        loading: false,
        prop1: 'val1',
        prop2: 'val2',
      });
    });
    it('should Reducer return correct state with ON_LOAD_USER', () => {
      const action = {
        type: 'ON_LOAD_USER',
        user: 'UserMock',
      };
      const result = oidcReducer(state, action);
      expect(result).toEqual({
        isEnabled: true,
        isLoading: false,
        loading: false,
        oidcUser: 'UserMock',
        prop1: 'val1',
        prop2: 'val2',
      });
    });
    it('should Reducer return correct state with ON_UNLOAD_USER', () => {
      const action = {
        type: 'ON_UNLOAD_USER',
      };
      const result = oidcReducer(state, action);
      expect(result).toEqual({
        isEnabled: true,
        isLoading: false,
        loading: false,
        oidcUser: null,
        prop1: 'val1',
        prop2: 'val2',
      });
    });

    it('should Reducer return correct state with ON_LOADING', () => {
      const action = {
        type: 'ON_LOADING',
      };
      const result = oidcReducer(state, action);
      expect(result).toEqual({
        isEnabled: true,
        isLoading: true,
        loading: false,
        prop1: 'val1',
        prop2: 'val2',
      });
    });

    it('should Reducer return correct state with OTHER_THING', () => {
      const action = {
        type: 'OTHER_THING',
      };
      const result = oidcReducer(state, action);
      expect(result).toEqual(state);
    });
  });
  it('should set state with user when call onUserLoaded', async () => {
    onUserLoaded(dispatch)(userMock);
    expect(dispatch).toHaveBeenCalledWith({
      type: 'ON_LOAD_USER',
      user: userMock,
    });
  });

  it('should set state and redirect to location when call onUserUnload', () => {
    onUserUnloaded(dispatch)();
    expect(dispatch).toHaveBeenCalledWith({ type: 'ON_UNLOAD_USER' });
  });

  it('should set state and call silentSignin to location when call onAccessTokenExpired', () => {
    onAccessTokenExpired(dispatch, userManagerMock.signinSilent)();
    expect(dispatch).toHaveBeenCalledWith({ type: 'ON_UNLOAD_USER' });
    expect(userManagerMock.signinSilent).toHaveBeenCalled();
  });

  it('should set default state when call setDefaultState', () => {
    const defaultState = setDefaultState(propsMock, authenticationService);
    expect(authenticationService).toHaveBeenCalledWith(configurationMock);
    expect(defaultState).toEqual({
      isEnabled: true,
      oidcUser: undefined,
      userManager: userManagerMock,
      isLoading: false,
      error: '',
    });
  });

  it('should set state and call authentication when call login function', async () => {
    await login(userManagerMock, dispatch, propsMock.location)();
    expect(dispatch).toHaveBeenCalledWith({ type: 'ON_LOADING' });
    expect(services.authenticateUser).toHaveBeenCalledWith(userManagerMock, 'locationMock');
  });

  it('should set state and call onUserUnload function when call logout', async () => {
    await logout(userManagerMock, dispatch)('redirection Url');
    expect(services.logoutUser).toHaveBeenCalledWith(userManagerMock);
  });

  it('should set state with erreor when call onError function', () => {
    onError(dispatch)({
      message: 'error unexpected',
    });
    expect(dispatch).toHaveBeenCalledWith({ message: 'error unexpected', type: 'ON_ERROR' });
  });

  it('should useAuthenticateContextHook add some events', async () => {
    const { result, unmount } = renderHook(() =>
      useAuthenticateContextHook(
        propsMock,
        'http://location.url',
        addEventMock,
        removeEventMock,
        setLogger,
        authenticationService
      )
    );
    expect(addEventMock).toHaveBeenCalledWith(
      'Some Events',
      expect.any(Function),
      expect.any(Function)
    );
    expect(userManagerMock.getUser).toHaveBeenCalled();
    expect(result.current).toEqual({
      oidcUser: undefined,
      isLoading: true,
      error: '',
      isEnabled: true,
      login: expect.any(Function),
      logout: expect.any(Function),
    });

    expect(removeEventMock).not.toHaveBeenCalled();

    unmount();

    expect(removeEventMock).toHaveBeenCalled();
  });

  it('should mount all events when call addOidcEvents', () => {
    const eventsMock = {
      addUserLoaded: jest.fn(),
      addSilentRenewError: jest.fn(),
      addUserUnloaded: jest.fn(),
      addUserSignedOut: jest.fn(),
      addAccessTokenExpired: jest.fn(),
    };
    const setStateMock = jest.fn();
    const signinSilentMock = 'signinSilentMock';
    addOidcEvents(eventsMock, setStateMock, signinSilentMock);
    expect(eventsMock.addUserLoaded).toHaveBeenCalledWith(expect.any(Function));
    expect(eventsMock.addSilentRenewError).toHaveBeenCalledWith(expect.any(Function));
    expect(eventsMock.addUserUnloaded).toHaveBeenCalledWith(expect.any(Function));
    expect(eventsMock.addUserSignedOut).toHaveBeenCalledWith(expect.any(Function));
    expect(eventsMock.addAccessTokenExpired).toHaveBeenCalledWith(expect.any(Function));
  });

  it('should remove all events when call removeOidcEvents', () => {
    const eventsMock = {
      removeUserLoaded: jest.fn(),
      removeSilentRenewError: jest.fn(),
      removeUserUnloaded: jest.fn(),
      removeUserSignedOut: jest.fn(),
      removeAccessTokenExpired: jest.fn(),
    };
    const setStateMock = jest.fn();
    const signinSilentMock = 'signinSilentMock';
    removeOidcEvents(eventsMock, setStateMock, signinSilentMock);
    expect(eventsMock.removeUserLoaded).toHaveBeenCalledWith(expect.any(Function));
    expect(eventsMock.removeSilentRenewError).toHaveBeenCalledWith(expect.any(Function));
    expect(eventsMock.removeUserUnloaded).toHaveBeenCalledWith(expect.any(Function));
    expect(eventsMock.removeUserSignedOut).toHaveBeenCalledWith(expect.any(Function));
    expect(eventsMock.removeAccessTokenExpired).toHaveBeenCalledWith(expect.any(Function));
  });
});

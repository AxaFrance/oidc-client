import * as core from '@axa-fr/react-oidc-core';
import {
  login,
  logout,
  oidcReducer,
  onError,
  onUserLoaded,
  onUserUnloaded,
  onAccessTokenExpired,
  addOidcEvents,
  removeOidcEvents,
} from './OidcEvents';

jest.mock('@axa-fr/react-oidc-core', () => ({
  authenticateUser: jest.fn(() => jest.fn(() => Promise.resolve())),
  logoutUser: jest.fn(),
  oidcLog: {
    error: jest.fn(),
    info: jest.fn(),
  },
}));

describe('reducer tests suite', () => {
  const dispatch = jest.fn();
  const userManagerMock = {
    signinSilent: jest.fn(),
  };

  const userMock = {
    name: 'name',
    token: 'token wyz',
    anyProp: 'lorem ipsum',
  };

  const propsMock = {
    isEnabled: true,
    history: undefined,
    configuration: {},
    location: 'locationMock',
    onUserUnloaded: jest.fn(() => jest.fn()),
  };

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

  it('should set state with error when call onError function', () => {
    onError(dispatch)({
      message: 'error unexpected',
    });
    expect(dispatch).toHaveBeenCalledWith({ message: 'error unexpected', type: 'ON_ERROR' });
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
    onAccessTokenExpired(dispatch, userManagerMock)();
    expect(dispatch).toHaveBeenCalledWith({ type: 'ON_UNLOAD_USER' });
    expect(userManagerMock.signinSilent).toHaveBeenCalled();
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

  it('should set state and call authentication when call login function', async () => {
    await login(userManagerMock, dispatch, propsMock.location)();
    expect(dispatch).toHaveBeenCalledWith({ type: 'ON_LOADING' });
    expect(core.authenticateUser).toHaveBeenCalledWith(userManagerMock, 'locationMock');
  });

  it('should set state and call onUserUnload function when call logout', async () => {
    await logout(userManagerMock, dispatch)('redirection Url');
    expect(core.logoutUser).toHaveBeenCalledWith(userManagerMock);
  });
});

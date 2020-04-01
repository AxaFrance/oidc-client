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
    history: { push: () => {} },
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

  it('should mount all events (including custom ones) when calling addOidcEvents', () => {
    const eventsMock = {
      addUserLoaded: jest.fn(),
      addSilentRenewError: jest.fn(),
      addUserUnloaded: jest.fn(),
      addUserSignedOut: jest.fn(),
      addAccessTokenExpired: jest.fn(),
      addAccessTokenExpiring: jest.fn(),
      addUserSessionChanged: jest.fn(),
    };

    const setStateMock = jest.fn();
    const signinSilentMock = 'signinSilentMock';

    const customEvents = {
      onUserLoaded: jest.fn(),
      onUserUnloaded: jest.fn(),
      onSilentRenewError: jest.fn(),
      onUserSignedOut: jest.fn(),
      onUserSessionChanged: jest.fn(),
      onAccessTokenExpiring: jest.fn(),
      onAccessTokenExpired: jest.fn(),
    };

    addOidcEvents(eventsMock, setStateMock, signinSilentMock, customEvents);

    expect(eventsMock.addUserLoaded.mock.calls).toEqual([
      [expect.any(Function)],
      [customEvents.onUserLoaded],
    ]);

    expect(eventsMock.addSilentRenewError.mock.calls).toEqual([
      [expect.any(Function)],
      [customEvents.onSilentRenewError],
    ]);

    expect(eventsMock.addUserUnloaded.mock.calls).toEqual([
      [expect.any(Function)],
      [customEvents.onUserUnloaded],
    ]);

    expect(eventsMock.addUserSignedOut.mock.calls).toEqual([
      [expect.any(Function)],
      [customEvents.onUserSignedOut],
    ]);

    expect(eventsMock.addAccessTokenExpired.mock.calls).toEqual([
      [expect.any(Function)],
      [customEvents.onAccessTokenExpired],
    ]);

    expect(eventsMock.addAccessTokenExpiring).toHaveBeenCalledWith(
      customEvents.onAccessTokenExpiring
    );

    expect(eventsMock.addUserSessionChanged).toHaveBeenCalledWith(
      customEvents.onUserSessionChanged
    );
  });

  it('should remove all events (including custom ones) when calling removeOidcEvents', () => {
    const eventsMock = {
      removeUserLoaded: jest.fn(),
      removeSilentRenewError: jest.fn(),
      removeUserUnloaded: jest.fn(),
      removeUserSignedOut: jest.fn(),
      removeAccessTokenExpired: jest.fn(),
      removeAccessTokenExpiring: jest.fn(),
      removeUserSessionChanged: jest.fn(),
    };

    const setStateMock = jest.fn();
    const signinSilentMock = 'signinSilentMock';

    const customEvents = {
      onUserLoaded: jest.fn(),
      onUserUnloaded: jest.fn(),
      onSilentRenewError: jest.fn(),
      onUserSignedOut: jest.fn(),
      onUserSessionChanged: jest.fn(),
      onAccessTokenExpiring: jest.fn(),
      onAccessTokenExpired: jest.fn(),
    };

    removeOidcEvents(eventsMock, setStateMock, signinSilentMock, customEvents);

    expect(eventsMock.removeUserLoaded.mock.calls).toEqual([
      [expect.any(Function)],
      [customEvents.onUserLoaded],
    ]);

    expect(eventsMock.removeSilentRenewError.mock.calls).toEqual([
      [expect.any(Function)],
      [customEvents.onSilentRenewError],
    ]);

    expect(eventsMock.removeUserUnloaded.mock.calls).toEqual([
      [expect.any(Function)],
      [customEvents.onUserUnloaded],
    ]);

    expect(eventsMock.removeUserSignedOut.mock.calls).toEqual([
      [expect.any(Function)],
      [customEvents.onUserSignedOut],
    ]);

    expect(eventsMock.removeAccessTokenExpired.mock.calls).toEqual([
      [expect.any(Function)],
      [customEvents.onAccessTokenExpired],
    ]);

    expect(eventsMock.removeAccessTokenExpiring).toHaveBeenCalledWith(
      customEvents.onAccessTokenExpiring
    );

    expect(eventsMock.removeUserSessionChanged).toHaveBeenCalledWith(
      customEvents.onUserSessionChanged
    );
  });

  it('should set state and call authentication when call login function', async () => {
    await login(userManagerMock, dispatch, propsMock.location, propsMock.history)();
    expect(dispatch).toHaveBeenCalledWith({ type: 'ON_LOADING' });
    expect(core.authenticateUser).toHaveBeenCalledWith(
      userManagerMock,
      'locationMock',
      propsMock.history
    );
  });

  it('should set state and call onUserUnload function when call logout', async () => {
    await logout(userManagerMock, dispatch)('redirection Url');
    expect(core.logoutUser).toHaveBeenCalledWith(userManagerMock);
  });
});

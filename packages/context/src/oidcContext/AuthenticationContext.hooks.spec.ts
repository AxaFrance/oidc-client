import { renderHook, act } from '@testing-library/react-hooks';
import {
  useAuthenticationContextState,
  useOidcEvents,
  onErrorEvent,
  onUserLoadedEvent,
  onUserUnloadedEvent,
  onAccessTokenExpiredEvent,
} from './AuthenticationContext.hooks';

const getUser = jest.fn();

const userManagerMock = {
  getUser,
};

describe('useAuthenticationContextState hook tests suite', () => {
  it('should initialize state with correct state', () => {
    // @ts-ignore
    const { result } = renderHook(() => useAuthenticationContextState(userManagerMock));

    expect(result.current.oidcState).toEqual({
      error: '',
      isLoading: false,
      isLoggingOut: false,
      oidcUser: null,
      userManager: { getUser: expect.any(Function) },
    });
  });

  it('should change state whan call onError', () => {
    // @ts-ignore
    const { result } = renderHook(() => useAuthenticationContextState(userManagerMock));
    act(() => result.current.onError('Error occured #10298'));
    expect(result.current.oidcState).toEqual({
      error: 'Error occured #10298',
      isLoading: false,
      isLoggingOut: false,
      oidcUser: null,
      userManager: { getUser: expect.any(Function) },
    });
  });

  it('should change state whan call loadUser', () => {
    // @ts-ignore
    const { result } = renderHook(() => useAuthenticationContextState(userManagerMock));
    act(() => result.current.loadUser({ firstname: 'Jean', id_token: 'qsDQd23eDEzed' }));
    expect(result.current.oidcState).toEqual({
      error: '',
      isLoading: false,
      isLoggingOut: false,
      oidcUser: { firstname: 'Jean', id_token: 'qsDQd23eDEzed' },
      userManager: { getUser: expect.any(Function) },
    });
  });

  it('should change state whan call onLoading', () => {
    // @ts-ignore
    const { result } = renderHook(() => useAuthenticationContextState(userManagerMock));
    act(() => result.current.onLoading());
    expect(result.current.oidcState).toEqual({
      error: '',
      isLoading: true,
      isLoggingOut: false,
      oidcUser: null,
      userManager: { getUser: expect.any(Function) },
    });
  });

  it('should change state whan call unloadUser', () => {
    // @ts-ignore
    const { result } = renderHook(() => useAuthenticationContextState(userManagerMock));
    act(() => result.current.loadUser({ firstname: 'Jean', id_token: 'qsDQd23eDEzed' }));
    expect(result.current.oidcState).toEqual({
      error: '',
      isLoading: false,
      isLoggingOut: false,
      oidcUser: { firstname: 'Jean', id_token: 'qsDQd23eDEzed' },
      userManager: { getUser: expect.any(Function) },
    });
    act(() => result.current.unloadUser());
    expect(result.current.oidcState).toEqual({
      error: '',
      isLoading: false,
      isLoggingOut: false,
      oidcUser: null,
      userManager: { getUser: expect.any(Function) },
    });
  });

  it('should change state whan call onLogout', () => {
    // @ts-ignore
    const { result } = renderHook(() => useAuthenticationContextState(userManagerMock));
    act(() => result.current.onLogout());
    expect(result.current.oidcState).toEqual({
      error: '',
      isLoading: false,
      isLoggingOut: true,
      oidcUser: null,
      userManager: { getUser: expect.any(Function) },
    });
  });
});

describe('useOidcEvents tests suite', () => {
  const oidcLog = {
    error: jest.fn(),
    info: jest.fn(),
  };

  const userManager = {
    events: {
      addUserLoaded: jest.fn(),
      addSilentRenewError: jest.fn(),
      addUserUnloaded: jest.fn(),
      addUserSignedOut: jest.fn(),
      addAccessTokenExpired: jest.fn(),
      addAccessTokenExpiring: jest.fn(),
      addUserSessionChanged: jest.fn(),
      removeUserLoaded: jest.fn(),
      removeSilentRenewError: jest.fn(),
      removeUserUnloaded: jest.fn(),
      removeUserSignedOut: jest.fn(),
      removeAccessTokenExpired: jest.fn(),
      removeAccessTokenExpiring: jest.fn(),
      removeUserSessionChanged: jest.fn(),
    },
    signinSilent: jest.fn(),
  };

  const oidcFunctions = {
    onError: () => {},
    loadUser: () => {},
    onLoading: () => {},
    unloadUser: () => {},
  };

  const customEvents = {
    onUserLoaded: jest.fn(),
    onUserUnloaded: jest.fn(),
    onSilentRenewError: jest.fn(),
    onUserSignedOut: jest.fn(),
    onUserSessionChanged: jest.fn(),
    onAccessTokenExpiring: jest.fn(),
    onAccessTokenExpired: jest.fn(),
  };

  const callbackFunction = jest.fn();
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should add events (including custom) when call addOidcEvents', () => {
    // @ts-ignore
    const { result } = renderHook(() =>
      useOidcEvents(oidcLog, userManager, oidcFunctions, customEvents)
    );

    act(() => result.current.addOidcEvents());

    expect(userManager.events.addUserLoaded.mock.calls).toEqual([
      [expect.any(Function)],
      [customEvents.onUserLoaded],
    ]);

    expect(userManager.events.addSilentRenewError.mock.calls).toEqual([
      [expect.any(Function)],
      [customEvents.onSilentRenewError],
    ]);

    expect(userManager.events.addUserUnloaded.mock.calls).toEqual([
      [expect.any(Function)],
      [customEvents.onUserUnloaded],
    ]);

    expect(userManager.events.addUserSignedOut.mock.calls).toEqual([
      [expect.any(Function)],
      [customEvents.onUserSignedOut],
    ]);

    expect(userManager.events.addAccessTokenExpired.mock.calls).toEqual([
      [expect.any(Function)],
      [customEvents.onAccessTokenExpired],
    ]);

    expect(userManager.events.addUserSessionChanged.mock.calls).toEqual([
      [customEvents.onUserSessionChanged],
    ]);

    expect(userManager.events.addAccessTokenExpiring.mock.calls).toEqual([
      [customEvents.onAccessTokenExpiring],
    ]);
  });

  it('should remove events (including custom) when call removeOidcEvents', () => {
    // @ts-ignore
    const { result } = renderHook(() =>
      useOidcEvents(oidcLog, userManager, oidcFunctions, customEvents)
    );

    act(() => result.current.removeOidcEvents());
    expect(userManager.events.removeUserLoaded.mock.calls).toEqual([
      [expect.any(Function)],
      [customEvents.onUserLoaded],
    ]);

    expect(userManager.events.removeSilentRenewError.mock.calls).toEqual([
      [expect.any(Function)],
      [customEvents.onSilentRenewError],
    ]);

    expect(userManager.events.removeUserUnloaded.mock.calls).toEqual([
      [expect.any(Function)],
      [customEvents.onUserUnloaded],
    ]);

    expect(userManager.events.removeUserSignedOut.mock.calls).toEqual([
      [expect.any(Function)],
      [customEvents.onUserSignedOut],
    ]);

    expect(userManager.events.removeAccessTokenExpired.mock.calls).toEqual([
      [expect.any(Function)],
      [customEvents.onAccessTokenExpired],
    ]);

    expect(userManager.events.removeUserSessionChanged.mock.calls).toEqual([
      [customEvents.onUserSessionChanged],
    ]);

    expect(userManager.events.removeAccessTokenExpiring.mock.calls).toEqual([
      [customEvents.onAccessTokenExpiring],
    ]);
  });

  it('should call logger when call', () => {
    const error = { message: 'error occurend 34ljk' };
    // @ts-ignore
    onErrorEvent(oidcLog, callbackFunction)(error);
    expect(oidcLog.error).toBeCalledWith('Error : error occurend 34ljk');
    expect(callbackFunction).toBeCalledWith('error occurend 34ljk');
  });

  it('should call logger when call onUserLoadedEvent', () => {
    const user = { firstname: 'jean QQSDQ' };
    // @ts-ignore
    onUserLoadedEvent(oidcLog, callbackFunction)(user);
    expect(oidcLog.info).toBeCalledWith('User Loaded');
    expect(callbackFunction).toBeCalledWith(user);
  });

  it('should call logger when call onUserUnloadedEvent', () => {
    // @ts-ignore
    onUserUnloadedEvent(oidcLog, callbackFunction)();
    expect(oidcLog.info).toBeCalledWith('User unloaded');
    expect(callbackFunction).toBeCalled();
  });

  it('should call logger when call onAccessTokenExpiredEvent', async () => {
    // @ts-ignore
    await onAccessTokenExpiredEvent(oidcLog, callbackFunction, userManager)();
    expect(oidcLog.info).toBeCalledWith('AccessToken Expired');
    expect(callbackFunction).toBeCalled();
    expect(userManager.signinSilent).toBeCalled();
  });
});

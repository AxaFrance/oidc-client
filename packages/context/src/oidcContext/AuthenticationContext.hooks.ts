import { useReducer, Dispatch, useCallback } from 'react';
import { User, UserManager, Logger, UserManagerEvents } from 'oidc-client';

// useAuthenticationContextState hook part

export interface OidcState {
  oidcUser: User | null;
  userManager: UserManager;
  isLoading: boolean;
  error: string;
  isLoggingOut: boolean;
}

export interface UseAuthenticationContextStateType {
  onError: Function;
  loadUser: Function;
  onLoading: Function;
  unloadUser: Function;
  onLogout: Function;
  oidcState: OidcState;
}

export interface CustomEvents {
  onUserLoaded: UserManagerEvents.UserLoadedCallback;
  onUserUnloaded: UserManagerEvents.UserUnloadedCallback;
  onSilentRenewError: UserManagerEvents.SilentRenewErrorCallback;
  onUserSignedOut: UserManagerEvents.UserSignedOutCallback;
  onUserSessionChanged: UserManagerEvents.UserSessionChangedCallback;
  onAccessTokenExpiring(callback: (...ev: unknown[]) => void): void;
  onAccessTokenExpired(callback: (...ev: unknown[]) => void): void;
}

const ON_LOADING = 'ON_LOADING';
const ON_ERROR = 'ON_ERROR';
const ON_LOAD_USER = 'ON_LOAD_USER';
const ON_UNLOAD_USER = 'ON_UNLOAD_USER';
const ON_LOGOUT = 'ON_LOGOUT';

type OidcAction =
  | { type: 'ON_LOADING' }
  | { type: 'ON_ERROR'; message: string }
  | { type: 'ON_LOAD_USER'; user: User | null }
  | { type: 'ON_UNLOAD_USER' }
  | { type: 'ON_LOGOUT' };

const getDefaultState = (userManagerInt: UserManager): OidcState => {
  return {
    oidcUser: null,
    userManager: userManagerInt,
    isLoading: false,
    error: '',
    isLoggingOut: false,
  };
};

const oidcReducer = (oidcState: OidcState, action: OidcAction): OidcState => {
  switch (action.type) {
    case ON_ERROR:
      return { ...oidcState, error: action.message, isLoading: false };
    case ON_LOADING:
      return { ...oidcState, isLoading: true };
    case ON_LOAD_USER:
      return { ...oidcState, oidcUser: action.user, isLoading: false };
    case ON_UNLOAD_USER:
      return { ...oidcState, oidcUser: null, isLoading: false };
    case ON_LOGOUT:
      return { ...oidcState, isLoggingOut: true };
    default:
      return oidcState;
  }
};

const onError = (dispatch: Dispatch<OidcAction>) => (message: string) => dispatch({ type: 'ON_ERROR', message });
const loadUser = (dispatch: Dispatch<OidcAction>) => (user: User | null) => dispatch({ type: 'ON_LOAD_USER', user });
const onLoading = (dispatch: Dispatch<OidcAction>) => () => dispatch({ type: 'ON_LOADING' });
const unloadUser = (dispatch: Dispatch<OidcAction>) => () => dispatch({ type: 'ON_UNLOAD_USER' });
const onLogout = (dispatch: Dispatch<OidcAction>) => () => dispatch({ type: 'ON_LOGOUT' });

export const useAuthenticationContextState = (userManagerInt: UserManager): UseAuthenticationContextStateType => {
  const defaultState = getDefaultState(userManagerInt);
  const [oidcState, dispatch] = useReducer(oidcReducer, defaultState);

  return {
    onError: useCallback(error => onError(dispatch)(error), []),
    loadUser: useCallback(user => loadUser(dispatch)(user), []),
    onLoading: useCallback(() => onLoading(dispatch)(), []),
    unloadUser: useCallback(() => unloadUser(dispatch)(), []),
    onLogout: useCallback(() => onLogout(dispatch)(), []),
    oidcState,
  };
};

// useOidcEvents Hook part

type OidcFunctions = Omit<UseAuthenticationContextStateType, 'oidcState'>;

export const onErrorEvent = (oidcLog: Logger, onErrorInt: Function) => (error: Error) => {
  oidcLog.error(`Error : ${error.message}`);
  onErrorInt(error.message);
};

export const onUserLoadedEvent = (oidcLog: Logger, loadUserInt: Function) => (user: User | null) => {
  oidcLog.info('User Loaded');
  loadUserInt(user);
};

export const onUserUnloadedEvent = (oidcLog: Logger, unloadUserInternal: Function) => () => {
  oidcLog.info('User unloaded');
  unloadUserInternal();
};

export const onAccessTokenExpiredEvent = (oidcLog: Logger, unloadUserInternal: Function, userManager: UserManager) => async () => {
  oidcLog.info('AccessToken Expired');
  unloadUserInternal();
  await userManager.signinSilent();
};

export const useOidcEvents = (
  oidcLog: Logger,
  userManager: UserManager,
  oidcFunctions: OidcFunctions,
  customEvents: CustomEvents
) => {
  const addOidcEvents = useCallback(() => {
    userManager.events.addUserLoaded(onUserLoadedEvent(oidcLog, oidcFunctions.loadUser));
    userManager.events.addSilentRenewError(onErrorEvent(oidcLog, oidcFunctions.onError));
    userManager.events.addUserUnloaded(onUserUnloadedEvent(oidcLog, oidcFunctions.unloadUser));
    userManager.events.addUserSignedOut(onUserUnloadedEvent(oidcLog, oidcFunctions.unloadUser));
    userManager.events.addAccessTokenExpired(
      onAccessTokenExpiredEvent(oidcLog, oidcFunctions.unloadUser, userManager)
    );

    if (customEvents && customEvents.onUserSessionChanged) {
      userManager.events.addUserSessionChanged(customEvents.onUserSessionChanged);
    }

    if (customEvents && customEvents.onUserLoaded) {
      userManager.events.addUserLoaded(customEvents.onUserLoaded);
    }

    if (customEvents && customEvents.onSilentRenewError) {
      userManager.events.addSilentRenewError(customEvents.onSilentRenewError);
    }

    if (customEvents && customEvents.onUserUnloaded) {
      userManager.events.addUserUnloaded(customEvents.onUserUnloaded);
    }

    if (customEvents && customEvents.onUserSignedOut) {
      userManager.events.addUserSignedOut(customEvents.onUserSignedOut);
    }

    if (customEvents && customEvents.onAccessTokenExpired) {
      userManager.events.addAccessTokenExpired(customEvents.onAccessTokenExpired);
    }

    if (customEvents && customEvents.onAccessTokenExpiring) {
      userManager.events.addAccessTokenExpiring(customEvents.onAccessTokenExpiring);
    }
  }, [
    oidcFunctions.loadUser,
    oidcFunctions.onError,
    oidcFunctions.unloadUser,
    oidcLog,
    userManager,
    customEvents,
  ]);

  const removeOidcEvents = useCallback(() => {
    userManager.events.removeUserLoaded(onUserLoadedEvent(oidcLog, oidcFunctions.loadUser));
    userManager.events.removeSilentRenewError(onErrorEvent(oidcLog, oidcFunctions.onError));
    userManager.events.removeUserUnloaded(onUserUnloadedEvent(oidcLog, oidcFunctions.unloadUser));
    userManager.events.removeUserSignedOut(onUserUnloadedEvent(oidcLog, oidcFunctions.unloadUser));
    userManager.events.removeAccessTokenExpired(
      onAccessTokenExpiredEvent(oidcLog, oidcFunctions.unloadUser, userManager)
    );

    if (customEvents && customEvents.onUserSessionChanged) {
      userManager.events.removeUserSessionChanged(customEvents.onUserSessionChanged);
    }

    if (customEvents && customEvents.onUserLoaded) {
      userManager.events.removeUserLoaded(customEvents.onUserLoaded);
    }

    if (customEvents && customEvents.onSilentRenewError) {
      userManager.events.removeSilentRenewError(customEvents.onSilentRenewError);
    }

    if (customEvents && customEvents.onUserUnloaded) {
      userManager.events.removeUserUnloaded(customEvents.onUserUnloaded);
    }

    if (customEvents && customEvents.onUserSignedOut) {
      userManager.events.removeUserSignedOut(customEvents.onUserSignedOut);
    }

    if (customEvents && customEvents.onAccessTokenExpired) {
      userManager.events.removeAccessTokenExpired(customEvents.onAccessTokenExpired);
    }

    if (customEvents && customEvents.onAccessTokenExpiring) {
      userManager.events.removeAccessTokenExpiring(customEvents.onAccessTokenExpiring);
    }
  }, [
    oidcFunctions.loadUser,
    oidcFunctions.onError,
    oidcFunctions.unloadUser,
    oidcLog,
    userManager,
    customEvents,
  ]);

  return { addOidcEvents, removeOidcEvents };
};

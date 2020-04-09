import { useReducer, Dispatch, useCallback } from 'react';
import { User, UserManager, Logger, UserManagerEvents } from 'oidc-client';

/// useAuthenticationContextState hook part

export interface OidcState {
  oidcUser?: User | null;
  userManager: UserManager;
  isLoading: boolean;
  error: string;
}

export interface UseAuthenticationContextStateType {
  onError: Function;
  loadUser: Function;
  onLoading: Function;
  unloadUser: Function;
  oidcState: OidcState;
}

const ON_LOADING = 'ON_LOADING';
const ON_ERROR = 'ON_ERROR';
const ON_LOAD_USER = 'ON_LOAD_USER';
const ON_UNLOAD_USER = 'ON_UNLOAD_USER';

type OidcAction =
  | { type: 'ON_LOADING' }
  | { type: 'ON_ERROR'; message: string }
  | { type: 'ON_LOAD_USER'; user: User | null }
  | { type: 'ON_UNLOAD_USER' };

const getDefaultState = (userManagerInt: UserManager): OidcState => {
  return {
    oidcUser: null,
    userManager: userManagerInt,
    isLoading: false,
    error: '',
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
  }
};

const onError = (dispatch: Dispatch<OidcAction>) => (message: string) => dispatch({ type: ON_ERROR, message });
const loadUser = (dispatch: Dispatch<OidcAction>) => (user: User | null) => dispatch({ type: ON_LOAD_USER, user });
const onLoading = (dispatch: Dispatch<OidcAction>) => () => dispatch({ type: ON_LOADING });
const unloadUser = (dispatch: Dispatch<OidcAction>) => () => dispatch({ type: ON_UNLOAD_USER });

export const useAuthenticationContextState = (userManagerInt: UserManager): UseAuthenticationContextStateType => {
  const defaultState = getDefaultState(userManagerInt);
  const [oidcState, dispatch] = useReducer(oidcReducer, defaultState);

  return {
    onError: onError(dispatch),
    loadUser: loadUser(dispatch),
    onLoading: onLoading(dispatch),
    unloadUser: unloadUser(dispatch),
    oidcState,
  };
};

/// useOidcEvents Hook part

type OidcFunctions = Omit<UseAuthenticationContextStateType, 'oidcState'>;

export const onErrorEvent = (oidcLog: Logger, onErrorInt: (messaga: string) => void) => (error: Error) => {
  oidcLog.error(`Error : ${error.message}`);
  onErrorInt(error.message);
};

export const onUserLoadedEvent = (oidcLog: Logger, loadUserInt: (user: User) => void) => (user: User | null) => {
  oidcLog.info('User Loaded');
  loadUserInt(user);
};

export const onUserUnloadedEvent = (oidcLog: Logger, unloadUser: () => void) => () => {
  oidcLog.info('User unloaded');
  unloadUser();
};

export const onAccessTokenExpiredEvent = (oidcLog: Logger, unloadUser: () => void, userManager: UserManager) => async () => {
  oidcLog.info('AccessToken Expired');
  unloadUser();
  await userManager.signinSilent();
};

export const useOidcEvents = (oidcLog: Logger, userManager: UserManager, oidcFunctions: OidcFunctions) => {
  const addOidcEvents = useCallback(() => {
    userManager.events.addUserLoaded(onUserLoadedEvent(oidcLog, oidcFunctions.loadUser));
    userManager.events.addSilentRenewError(onErrorEvent(oidcLog, oidcFunctions.onError));
    userManager.events.addUserUnloaded(onUserUnloadedEvent(oidcLog, oidcFunctions.unloadUser));
    userManager.events.addUserSignedOut(onUserUnloadedEvent(oidcLog, oidcFunctions.unloadUser));
    userManager.events.addAccessTokenExpired(onAccessTokenExpiredEvent(oidcLog, oidcFunctions.unloadUser, userManager));
  }, []);

  const removeOidcEvents = useCallback(() => {
    userManager.events.removeUserLoaded(onUserLoadedEvent(oidcLog, oidcFunctions.loadUser));
    userManager.events.removeSilentRenewError(onErrorEvent(oidcLog, oidcFunctions.onError));
    userManager.events.removeUserUnloaded(onUserUnloadedEvent(oidcLog, oidcFunctions.unloadUser));
    userManager.events.removeUserSignedOut(onUserUnloadedEvent(oidcLog, oidcFunctions.unloadUser));
    userManager.events.removeAccessTokenExpired(onAccessTokenExpiredEvent(oidcLog, oidcFunctions.unloadUser, userManager));
  }, []);

  return { addOidcEvents, removeOidcEvents };
};

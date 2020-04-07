import { Dispatch } from 'react';
import { oidcLog, authenticateUser, logoutUser, ReactOidcHistory } from '@axa-fr/react-oidc-core';
import { User, UserManager, UserManagerEvents } from 'oidc-client';

export interface OidcState {
  oidcUser?: User | null;
  userManager: UserManager;
  isLoading: boolean;
  error: string;
  isEnabled: boolean;
}

export interface OidcCustomEvents {
  onUserLoaded?: UserManagerEvents.UserLoadedCallback;
  onUserUnloaded?: UserManagerEvents.UserUnloadedCallback;
  onSilentRenewError?: UserManagerEvents.SilentRenewErrorCallback;
  onUserSignedOut?: UserManagerEvents.UserSignedOutCallback;
  onUserSessionChanged?: UserManagerEvents.UserSessionChangedCallback;
  onAccessTokenExpiring?: (...ev: any[]) => void;
  onAccessTokenExpired?: (...ev: any[]) => void;
}

type OidcAction =
  | { type: 'ON_LOADING' }
  | { type: 'ON_ERROR'; message: string }
  | { type: 'ON_LOAD_USER'; user: User | null }
  | { type: 'ON_UNLOAD_USER' };

export const onError = (dispatch: Dispatch<OidcAction>) => (error: Error) => {
  oidcLog.error(`Error : ${error.message}`);
  dispatch({ type: 'ON_ERROR', message: error.message });
};

export const logout = (userManager: UserManager, dispatch: Dispatch<OidcAction>) => async () => {
  try {
    oidcLog.info('Logout successfull');
    await logoutUser(userManager);
  } catch (error) {
    onError(dispatch)(error);
  }
};
export const login = (
  userManager: UserManager,
  dispatch: Dispatch<OidcAction>,
  location: Location,
  history: ReactOidcHistory
) => async () => {
  dispatch({ type: 'ON_LOADING' });
  oidcLog.info('Login requested');
  await authenticateUser(userManager, location, history)();
};

export const onUserLoaded = (dispatch: Dispatch<OidcAction>) => (user: User | null) => {
  oidcLog.info(`User Loaded`);
  dispatch({ type: 'ON_LOAD_USER', user });
};

export const onUserUnloaded = (dispatch: Dispatch<OidcAction>) => () => {
  oidcLog.info(`User unloaded `);
  dispatch({ type: 'ON_UNLOAD_USER' });
};

export const onAccessTokenExpired = (
  dispatch: Dispatch<OidcAction>,
  userManager: UserManager
) => async () => {
  oidcLog.info(`AccessToken Expired `);
  dispatch({ type: 'ON_UNLOAD_USER' });
  await userManager.signinSilent();
};

export const addOidcEvents = (
  events: UserManagerEvents,
  dispatch: Dispatch<OidcAction>,
  userManager: UserManager,
  customEvents?: OidcCustomEvents
) => {
  events.addUserLoaded(onUserLoaded(dispatch));
  events.addSilentRenewError(onError(dispatch));
  events.addUserUnloaded(onUserUnloaded(dispatch));
  events.addUserSignedOut(onUserUnloaded(dispatch));
  events.addAccessTokenExpired(onAccessTokenExpired(dispatch, userManager));

  if (customEvents && customEvents.onUserLoaded != null) {
    events.addUserLoaded(customEvents.onUserLoaded);
  }

  if (customEvents && customEvents.onUserUnloaded != null) {
    events.addUserUnloaded(customEvents.onUserUnloaded);
  }

  if (customEvents && customEvents.onAccessTokenExpiring != null) {
    events.addAccessTokenExpiring(customEvents.onAccessTokenExpiring);
  }

  if (customEvents && customEvents.onAccessTokenExpired != null) {
    events.addAccessTokenExpired(customEvents.onAccessTokenExpired);
  }

  if (customEvents && customEvents.onSilentRenewError != null) {
    events.addSilentRenewError(customEvents.onSilentRenewError);
  }

  if (customEvents && customEvents.onUserSignedOut != null) {
    events.addUserSignedOut(customEvents.onUserSignedOut);
  }

  if (customEvents && customEvents.onUserSessionChanged != null) {
    events.addUserSessionChanged(customEvents.onUserSessionChanged);
  }
};

export const removeOidcEvents = (
  events: UserManagerEvents,
  dispatch: Dispatch<OidcAction>,
  userManager: UserManager,
  customEvents?: OidcCustomEvents
) => {
  events.removeUserLoaded(onUserLoaded(dispatch));
  events.removeSilentRenewError(onError(dispatch));
  events.removeUserUnloaded(onUserUnloaded(dispatch));
  events.removeUserSignedOut(onUserUnloaded(dispatch));
  events.removeAccessTokenExpired(onAccessTokenExpired(dispatch, userManager));

  if (customEvents && customEvents.onUserLoaded != null) {
    events.removeUserLoaded(customEvents.onUserLoaded);
  }

  if (customEvents && customEvents.onUserUnloaded != null) {
    events.removeUserUnloaded(customEvents.onUserUnloaded);
  }

  if (customEvents && customEvents.onAccessTokenExpiring != null) {
    events.removeAccessTokenExpiring(customEvents.onAccessTokenExpiring);
  }

  if (customEvents && customEvents.onAccessTokenExpired != null) {
    events.removeAccessTokenExpired(customEvents.onAccessTokenExpired);
  }

  if (customEvents && customEvents.onSilentRenewError != null) {
    events.removeSilentRenewError(customEvents.onSilentRenewError);
  }

  if (customEvents && customEvents.onUserSignedOut != null) {
    events.removeUserSignedOut(customEvents.onUserSignedOut);
  }

  if (customEvents && customEvents.onUserSessionChanged != null) {
    events.removeUserSessionChanged(customEvents.onUserSessionChanged);
  }
};

export const oidcReducer = (oidcState: OidcState, action: OidcAction): OidcState =>
  ({
    // @ts-ignore
    ON_ERROR: { ...oidcState, error: action.message, isLoading: false },
    // @ts-ignore
    ON_LOAD_USER: { ...oidcState, oidcUser: action.user, isLoading: false },
    ON_UNLOAD_USER: { ...oidcState, oidcUser: null, isLoading: false },
    ON_LOADING: { ...oidcState, isLoading: true },
  }[action.type] || oidcState);

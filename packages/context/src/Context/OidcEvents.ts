import { Dispatch } from 'react';
import { oidcLog, authenticateUser, logoutUser, OidcHistory } from '@axa-fr/react-oidc-core';
import { User, UserManager, UserManagerEvents } from 'oidc-client';

export type OidcState = {
  oidcUser?: User | null,
  userManager: UserManager,
  isLoading: boolean,
  error: string,
  isEnabled: boolean,
}

type OidcAction = { type: 'ON_LOADING' }
  | { type: 'ON_ERROR', message: string }
  | { type: 'ON_LOAD_USER', user: User | null }
  | { type: 'ON_UNLOAD_USER' }

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
export const login = (userManager: UserManager, dispatch: Dispatch<OidcAction>, location: Location, history: OidcHistory) => async () => {
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

export const onAccessTokenExpired = (dispatch: Dispatch<OidcAction>, userManager: UserManager) => async () => {
  oidcLog.info(`AccessToken Expired `);
  dispatch({ type: 'ON_UNLOAD_USER' });
  await userManager.signinSilent();
};

export const addOidcEvents = (events: UserManagerEvents, dispatch: Dispatch<OidcAction>, userManager: UserManager) => {
  events.addUserLoaded(onUserLoaded(dispatch));
  events.addSilentRenewError(onError(dispatch));
  events.addUserUnloaded(onUserUnloaded(dispatch));
  events.addUserSignedOut(onUserUnloaded(dispatch));
  events.addAccessTokenExpired(onAccessTokenExpired(dispatch, userManager));
};

export const removeOidcEvents = (events: UserManagerEvents, dispatch: Dispatch<OidcAction>, userManager: UserManager) => {
  events.removeUserLoaded(onUserLoaded(dispatch));
  events.removeSilentRenewError(onError(dispatch));
  events.removeUserUnloaded(onUserUnloaded(dispatch));
  events.removeUserSignedOut(onUserUnloaded(dispatch));
  events.removeAccessTokenExpired(onAccessTokenExpired(dispatch, userManager));
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

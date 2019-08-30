import { oidcLog, authenticateUser, logoutUser } from '@axa-fr/react-oidc-core';

export const onError = dispatch => error => {
  oidcLog.error(`Error : ${error.message}`);
  dispatch({ type: 'ON_ERROR', message: error.message });
};

export const logout = (userManager, dispatch) => async () => {
  try {
    oidcLog.info('Logout successfull');
    await logoutUser(userManager);
  } catch (error) {
    onError(dispatch)(error);
  }
};
export const login = (userManager, dispatch, location) => async () => {
  dispatch({ type: 'ON_LOADING' });
  oidcLog.info('Login requested');
  await authenticateUser(userManager, location)();
};

export const onUserLoaded = dispatch => user => {
  oidcLog.info(`User Loaded`);
  dispatch({ type: 'ON_LOAD_USER', user });
};

export const onUserUnloaded = dispatch => () => {
  oidcLog.info(`User unloaded `);
  dispatch({ type: 'ON_UNLOAD_USER' });
};

export const onAccessTokenExpired = (dispatch, signinSilent) => async () => {
  oidcLog.info(`AccessToken Expired `);
  dispatch({ type: 'ON_UNLOAD_USER' });
  await signinSilent();
};

export const addOidcEvents = (events, dispatch, signinSilent) => {
  events.addUserLoaded(onUserLoaded(dispatch));
  events.addSilentRenewError(onError(dispatch));
  events.addUserUnloaded(onUserUnloaded(dispatch));
  events.addUserSignedOut(onUserUnloaded(dispatch));
  events.addAccessTokenExpired(onAccessTokenExpired(dispatch, signinSilent));
};

export const removeOidcEvents = (events, dispatch, signinSilent) => {
  events.removeUserLoaded(onUserLoaded(dispatch));
  events.removeSilentRenewError(onError(dispatch));
  events.removeUserUnloaded(onUserUnloaded(dispatch));
  events.removeUserSignedOut(onUserUnloaded(dispatch));
  events.removeAccessTokenExpired(onAccessTokenExpired(dispatch, signinSilent));
};

export const oidcReducer = (oidcState, action) =>
  ({
    ON_ERROR: { ...oidcState, error: action.message, isLoading: false },
    ON_LOAD_USER: { ...oidcState, oidcUser: action.user, isLoading: false },
    ON_UNLOAD_USER: { ...oidcState, oidcUser: null, isLoading: false },
    ON_LOADING: { ...oidcState, isLoading: true },
  }[action.type] || oidcState);

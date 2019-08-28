import React, { useEffect, useReducer, useCallback } from 'react';
import PropTypes from 'prop-types';
import { withRouter } from '@axa-fr/react-oidc-core';

import {
  authenticationService,
  authenticateUser,
  logoutUser,
  setLogger,
  oidcLog,
} from '../Services';
import AuthenticationProviderComponent from './AuthenticationContext';

const propTypes = {
  notAuthenticated: PropTypes.node,
  notAuthorized: PropTypes.node,
  authenticating: PropTypes.node,
  configuration: PropTypes.shape({
    client_id: PropTypes.string.isRequired,
    redirect_uri: PropTypes.string.isRequired,
    response_type: PropTypes.string.isRequired,
    scope: PropTypes.string.isRequired,
    authority: PropTypes.string.isRequired,
    silent_redirect_uri: PropTypes.string.isRequired,
    automaticSilentRenew: PropTypes.bool.isRequired,
    loadUserInfo: PropTypes.bool.isRequired,
    triggerAuthFlow: PropTypes.bool.isRequired,
  }).isRequired,
  isEnabled: PropTypes.bool,
  loggerLevel: PropTypes.number,
  logger: PropTypes.shape({
    info: PropTypes.func.isRequired,
    warn: PropTypes.func.isRequired,
    error: PropTypes.func.isRequired,
    debug: PropTypes.func.isRequired,
  }),
};

const defaultProps = {
  notAuthenticated: null,
  notAuthorized: null,
  authenticating: null,
  isEnabled: true,
  loggerLevel: 0,
  logger: console,
};

export const oidcReducer = (oidcState, action) =>
  ({
    ON_ERROR: { ...oidcState, error: action.message, isLoading: false },
    ON_LOAD_USER: { ...oidcState, oidcUser: action.user, isLoading: false },
    ON_UNLOAD_USER: { ...oidcState, oidcUser: null, isLoading: false },
    ON_LOADING: { ...oidcState, isLoading: true },
  }[action.type] || oidcState);

export const setDefaultState = ({ configuration, isEnabled }, authenticationServiceInternal) => {
  return {
    oidcUser: undefined,
    userManager: authenticationServiceInternal(configuration),
    isLoading: false,
    error: '',
    isEnabled,
  };
};

export const onError = dispatch => error => {
  oidcLog.error(`Error : ${error.message}`);
  dispatch({ type: 'ON_ERROR', message: error.message });
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

export const useAuthenticateContextHook = (
  props,
  location,
  addOidcEventsInternal,
  removeOidcEventsInternal,
  setLoggerInternal,
  authenticationServiceInternal,
) => {
  const [oidcState, dispatch] = useReducer(
    oidcReducer,
    setDefaultState(props, authenticationServiceInternal),
  );
  const { userManager, ...oidcProps } = oidcState;
  const loginCb = useCallback(() => login(userManager, dispatch, location)(), [
    location,
    userManager,
  ]);
  const logoutCb = useCallback(() => logout(userManager, dispatch)(), [userManager]);
  useEffect(() => {
    setLoggerInternal(props.loggerLevel, props.logger);
    dispatch({ type: 'ON_LOADING' });
    addOidcEventsInternal(userManager.events, dispatch, userManager.signinSilent);
    userManager.getUser().then(user => dispatch({ type: 'ON_LOAD_USER', user }));
    return () => removeOidcEventsInternal(userManager.events, dispatch, userManager.signinSilent);
  }, [
    addOidcEventsInternal,
    props.logger,
    props.loggerLevel,
    removeOidcEventsInternal,
    setLoggerInternal,
    userManager,
  ]);
  return {
    ...oidcProps,
    login: loginCb,
    logout: logoutCb,
  };
};

const AuthenticationProviderInt = ({ location, ...otherProps }) => {
  const oidcProps = useAuthenticateContextHook(
    otherProps,
    location,
    addOidcEvents,
    removeOidcEvents,
    setLogger,
    authenticationService,
  );
  return <AuthenticationProviderComponent {...otherProps} {...oidcProps} />;
};

const AuthenticationProvider = withRouter(AuthenticationProviderInt);
AuthenticationProvider.propTypes = propTypes;
AuthenticationProvider.defaultProps = defaultProps;
AuthenticationProvider.displayName = 'AuthenticationProvider';

export default AuthenticationProvider;

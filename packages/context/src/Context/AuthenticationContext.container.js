import React, { useEffect, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { withRouter } from 'react-router-dom';

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

export const setDefaultState = ({ configuration, loggerLevel, logger, isEnabled }) => {
  setLogger(loggerLevel, logger);
  return {
    oidcUser: undefined,
    userManager: authenticationService(configuration),
    isLoading: false,
    error: '',
    isEnabled,
  };
};

export const login = (userManager, setOidcState, location) => async () => {
  setOidcState(oidcState => ({
    ...oidcState,
    oidcUser: null,
    isLoading: true,
  }));
  oidcLog.info('Login requested');
  await authenticateUser(userManager, location)();
};

export const onError = setOidcState => error => {
  oidcLog.error(`Error : ${error.message}`);
  setOidcState(oidcState => ({
    ...oidcState,
    error: error.message,
    isLoading: false,
  }));
};

export const logout = (userManager, setOidcState) => async () => {
  try {
    oidcLog.info('Logout successfull');
    await logoutUser(userManager);
  } catch (error) {
    onError(setOidcState)(error);
  }
};

export const onUserLoaded = setOidcState => user => {
  oidcLog.info(`User Loaded`);
  setOidcState(oidcState => ({
    ...oidcState,
    oidcUser: user,
    isLoading: false,
  }));
};

export const onUserUnloaded = setOidcState => () => {
  oidcLog.info(`User unloaded `);
  setOidcState(oidcState => ({
    ...oidcState,
    oidcUser: null,
    isLoading: false,
  }));
};

export const onAccessTokenExpired = (setOidcState, signinSilent) => async () => {
  oidcLog.info(`AccessToken Expired `);
  setOidcState(oidcState => ({
    ...oidcState,
    oidcUser: null,
    isLoading: false,
  }));
  await signinSilent();
};

const addOidcEvents = (events, setOidcState, signinSilent) => {
  events.addUserLoaded(onUserLoaded(setOidcState));
  events.addSilentRenewError(onError(setOidcState));
  events.addUserUnloaded(onUserUnloaded(setOidcState));
  events.addUserSignedOut(onUserUnloaded(setOidcState));
  events.addAccessTokenExpired(onAccessTokenExpired(setOidcState, signinSilent));
};

const removeEvents = (events, setOidcState, signinSilent) => {
  events.removeUserLoaded(onUserLoaded(setOidcState));
  events.removeSilentRenewError(onError(setOidcState));
  events.removeUserUnloaded(onUserUnloaded(setOidcState));
  events.removeUserSignedOut(onUserUnloaded(setOidcState));
  events.removeAccessTokenExpired(onAccessTokenExpired(setOidcState, signinSilent));
};

const AuthenticationProviderInt = ({ location, ...otherProps }) => {
  const [oidcState, setOidcState] = useState(() => setDefaultState(otherProps));
  const { oidcUser, isLoading, error, isEnabled, userManager } = oidcState;
  const loginCb = useCallback(() => login(oidcState.userManager, setOidcState, location)(), [
    location,
    oidcState.userManager,
  ]);
  const logoutCb = useCallback(() => logout(oidcState.userManager, setOidcState)(), [
    oidcState.userManager,
  ]);
  useEffect(() => {
    setOidcState(state => ({
      ...state,
      isLoading: true,
    }));
    addOidcEvents(userManager.events, setOidcState, userManager.signinSilent);
    userManager.getUser().then(user =>
      setOidcState(state => ({
        ...state,
        oidcUser: user,
      }))
    );
    return () => removeEvents(userManager.events, setOidcState, userManager.signinSilent);
  }, [userManager]);

  return (
    <AuthenticationProviderComponent
      {...otherProps}
      isLoading={isLoading}
      oidcUser={oidcUser}
      error={error}
      login={loginCb}
      logout={logoutCb}
      isEnabled={isEnabled}
    />
  );
};

const AuthenticationProvider = withRouter(AuthenticationProviderInt);
AuthenticationProvider.propTypes = propTypes;
AuthenticationProvider.defaultProps = defaultProps;
AuthenticationProvider.displayName = 'AuthenticationProvider';

export default AuthenticationProvider;

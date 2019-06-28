import React, { useEffect, useState, useCallback } from "react";
import PropTypes from "prop-types";
import { withRouter } from "react-router-dom";

import {
  authenticationService,
  authenticateUser,
  logoutUser,
  setLogger,
  oidcLog
} from "../Services";
import AuthenticationProviderComponent from "./AuthenticationContext";

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
    triggerAuthFlow: PropTypes.bool.isRequired
  }).isRequired,
  isEnabled: PropTypes.bool,
  loggerLevel: PropTypes.number,
  logger: PropTypes.shape({
    info: PropTypes.func.isRequired,
    warn: PropTypes.func.isRequired,
    error: PropTypes.func.isRequired,
    debug: PropTypes.func.isRequired
  })
};

const defaultProps = {
  notAuthenticated: null,
  notAuthorized: null,
  authenticating: null,
  isEnabled: true,
  loggerLevel: 0,
  logger: console,
};

export const setDefaultState = ({
  configuration,
  loggerLevel,
  logger,
  isEnabled,
}) => {
  setLogger(loggerLevel, logger);
  return {
    oidcUser: undefined,
    userManager: authenticationService(configuration),
    isLoading: false,
    error: "",
    isEnabled
  };
};

export const login = (oidcState, setOidcState, location) => async () => {
  setOidcState({
    ...oidcState,
    oidcUser: null,
    isLoading: true
  });
  oidcLog.info("Login requested");
  await authenticateUser(oidcState.userManager, location)();
};

export const onError = (oidcState, setOidcState) => error => {
  oidcLog.error(`Error : ${error.message}`);
  setOidcState({
    ...oidcState,
    error: error.message,
    isLoading: false
  });
};

export const logout = (oidcState, setOidcState) => async () => {
  try {
    oidcLog.info('Logout successfull');
    await logoutUser(oidcState.userManager);
  } catch (error) {
    onError(setOidcState, oidcState)(error);
  }
};

export const onUserLoaded = (oidcState, setOidcState) => user => {
  oidcLog.info(`User Loaded`);
  setOidcState({
    ...oidcState,
    oidcUser: user,
    isLoading: false
  });
};

export const onUserUnloaded = (oidcState, setOidcState) => () => {
  oidcLog.info(`User unloaded `);
  setOidcState({
    ...oidcState,
    oidcUser: null,
    isLoading: false
  });
};

export const onAccessTokenExpired = (oidcState, setOidcState) => async () => {
  oidcLog.info(`AccessToken Expired `);
  setOidcState({
    ...oidcState,
    oidcUser: null,
    isLoading: false
  });
  await oidcState.userManager.signinSilent();
};

const addOidcEvents = (events, oidcState, setOidcState) => {
  events.addUserLoaded(onUserLoaded(oidcState, setOidcState));
  events.addSilentRenewError(onError(oidcState, setOidcState));
  events.addUserUnloaded(onUserUnloaded(oidcState, setOidcState));
  events.addUserSignedOut(onUserUnloaded(oidcState, setOidcState));
  events.addAccessTokenExpired(onAccessTokenExpired(oidcState, setOidcState));
};

const removeEvents = (events, oidcState, setOidcState) => {
  events.removeUserLoaded(onUserLoaded(oidcState, setOidcState));
  events.removeSilentRenewError(onError(oidcState, setOidcState));
  events.removeUserUnloaded(onUserUnloaded(oidcState, setOidcState));
  events.removeUserSignedOut(onUserUnloaded(oidcState, setOidcState));
  events.removeAccessTokenExpired(
    onAccessTokenExpired(oidcState, setOidcState)
  );
};

const AuthenticationProviderInt = ({ location, ...otherProps }) => {
  const [oidcState, setOidcState] = useState(() => setDefaultState(otherProps));
  const {
    oidcUser,
    isLoading,
    error,
    isEnabled,
    userManager
  } = oidcState;
  const loginCb = useCallback(
    () => login(oidcState, setOidcState, location)(),
    [location, oidcState]
  );
  const logoutCb = useCallback(
    () =>  logout(oidcState, setOidcState)(),
    [oidcState]
  );
  useEffect(() => {
    setOidcState({
      ...oidcState,
      isLoading: true
    });
    addOidcEvents(userManager.events, oidcState, setOidcState);
    userManager.getUser().then(user =>
      setOidcState({
        ...oidcState,
        oidcUser: user
      })
    );
    return () => removeEvents(userManager.events, oidcState, setOidcState);
  }, []);

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
AuthenticationProvider.displayName = "AuthenticationProvider";

export default AuthenticationProvider;

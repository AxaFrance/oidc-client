import React, { useEffect, useCallback, useReducer } from 'react';
import PropTypes from 'prop-types';
import { withRouter, authenticationService, setLogger, OidcRoutes } from '@axa-fr/react-oidc-core';

import { Callback } from '../Callback';
import { addOidcEvents, removeOidcEvents, oidcReducer, login, logout } from './OidcEvents';
import withServices from '../withServices';

export const AuthenticationContext = React.createContext(null);

const propTypes = {
  notAuthenticated: PropTypes.oneOfType([PropTypes.node, PropTypes.func]),
  notAuthorized: PropTypes.oneOfType([PropTypes.node, PropTypes.func]),
  authenticating: PropTypes.oneOfType([PropTypes.node, PropTypes.func]),
  callbackComponentOverride: PropTypes.oneOfType([PropTypes.node, PropTypes.func]),
  sessionLostComponent: PropTypes.oneOfType([PropTypes.node, PropTypes.func]),
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
  callbackComponentOverride: null,
  sessionLostComponent: null,
  isEnabled: true,
  loggerLevel: 0,
  logger: console,
};

export const setDefaultState = ({ configuration, isEnabled }, authenticationServiceInternal) => {
  return {
    oidcUser: undefined,
    userManager: authenticationServiceInternal(configuration),
    isLoading: false,
    error: '',
    isEnabled,
  };
};

const withComponentOverrideProps = (Component, customProps) => props => (
  <Component callbackComponentOverride={customProps} {...props} />
);

const AuthenticationProviderInt = ({ location, history, ...otherProps }) => {
  const [oidcState, dispatch] = useReducer(
    oidcReducer,
    setDefaultState(otherProps, authenticationService)
  );

  useEffect(() => {
    setLogger(otherProps.loggerLevel, otherProps.logger);
    dispatch({ type: 'ON_LOADING' });
    addOidcEvents(oidcState.userManager.events, dispatch, oidcState.userManager.signinSilent);
    oidcState.userManager.getUser().then(user => dispatch({ type: 'ON_LOAD_USER', user }));
    return () =>
      removeOidcEvents(oidcState.userManager.events, dispatch, oidcState.userManager.signinSilent);
  }, [otherProps.logger, otherProps.loggerLevel, oidcState.userManager]);

  const { oidcUser, isLoading, error, isEnabled } = oidcState;
  const {
    authenticating,
    notAuthenticated,
    notAuthorized,
    callbackComponentOverride,
    sessionLostComponent,  
    configuration,
    children,
    Callback: CallbackInt,
  } = otherProps;

  const CallbackComponent = callbackComponentOverride
    ? withComponentOverrideProps(CallbackInt, callbackComponentOverride)
    : CallbackInt;

  return (
    <AuthenticationContext.Provider
      value={{
        isLoading,
        oidcUser,
        error,
        authenticating,
        isEnabled,
        login: useCallback(() => login(oidcState.userManager, dispatch, location, history)(), [
          location,
          oidcState.userManager,
        ]),
        logout: useCallback(() => logout(oidcState.userManager, dispatch)(), [
          oidcState.userManager,
        ]),
      }}
    >
      <OidcRoutes
        notAuthenticated={notAuthenticated}
        notAuthorized={notAuthorized}
        callbackComponent={CallbackComponent}
        sessionLost={sessionLostComponent}
        configuration={configuration}
      >
        {children}
      </OidcRoutes>
    </AuthenticationContext.Provider>
  );
};

const AuthenticationProvider = withRouter(withServices(AuthenticationProviderInt, { Callback }));
AuthenticationProvider.propTypes = propTypes;
AuthenticationProvider.defaultProps = defaultProps;
AuthenticationProvider.displayName = 'AuthenticationProvider';

export default AuthenticationProvider;

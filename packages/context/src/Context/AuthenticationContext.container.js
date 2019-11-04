import React, { useEffect, useCallback, useReducer } from 'react';
import PropTypes from 'prop-types';
import {
  withRouter,
  authenticationService,
  setLogger,
  OidcRoutes,
  configurationPropTypes,
} from '@axa-fr/react-oidc-core';

import { Callback } from '../Callback';
import { addOidcEvents, removeOidcEvents, oidcReducer, login, logout } from './OidcEvents';
import withServices from '../withServices';

export const AuthenticationContext = React.createContext(null);

const propTypes = {
  notAuthenticated: PropTypes.elementType,
  notAuthorized: PropTypes.elementType,
  authenticating: PropTypes.elementType,
  callbackComponentOverride: PropTypes.elementType,
  configuration: configurationPropTypes,
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

const AuthenticationProviderInt = ({ location, ...otherProps }) => {
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
        login: useCallback(() => login(oidcState.userManager, dispatch, location)(), [
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

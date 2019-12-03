import React, { useEffect, useCallback, useReducer } from 'react';
import PropTypes from 'prop-types';
import {
  withRouter,
  authenticationService,
  setLogger,
  OidcRoutes,
  configurationPropTypes,
  configurationDefaultProps,
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
  sessionLostComponent: PropTypes.elementType,
  configuration: configurationPropTypes,
  isEnabled: PropTypes.bool,
  loggerLevel: PropTypes.number,
  logger: PropTypes.shape({
    info: PropTypes.func.isRequired,
    warn: PropTypes.func.isRequired,
    error: PropTypes.func.isRequired,
    debug: PropTypes.func.isRequired,
  }),
  UserStore: PropTypes.func,
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
  configuration: configurationDefaultProps,
};

export const setDefaultState = authenticationServiceInternal => ({
  configuration,
  isEnabled,
  UserStore,
}) => {
  return {
    oidcUser: undefined,
    userManager: authenticationServiceInternal(configuration, UserStore),
    isLoading: false,
    error: '',
    isEnabled,
  };
};

const withComponentOverrideProps = (Component, customProps) => props => (
  <Component callbackComponentOverride={customProps} {...props} />
);

const AuthenticationProviderInt = ({
  location,
  history,
  setDefaultState: setDefaultStateInternal,
  ...otherProps
}) => {
  const [oidcState, dispatch] = useReducer(oidcReducer, setDefaultStateInternal(otherProps));

  useEffect(() => {
    setLogger(otherProps.loggerLevel, otherProps.logger);
    dispatch({ type: 'ON_LOADING' });
    addOidcEvents(oidcState.userManager.events, dispatch, oidcState.userManager);
    oidcState.userManager.getUser().then(user => dispatch({ type: 'ON_LOAD_USER', user }));
    return () => removeOidcEvents(oidcState.userManager.events, dispatch, oidcState.userManager);
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

  const CallbackComponent = React.useMemo(
    () =>
      callbackComponentOverride
        ? withComponentOverrideProps(CallbackInt, callbackComponentOverride)
        : CallbackInt,
    [CallbackInt, callbackComponentOverride]
  );

  return (
    <AuthenticationContext.Provider
      value={{
        isLoading,
        oidcUser,
        error,
        authenticating,
        isEnabled,
        login: useCallback(() => login(oidcState.userManager, dispatch, location, history)(), [
          history,
          location,
          oidcState.userManager,
        ]),
        logout: useCallback(() => logout(oidcState.userManager, dispatch)(), [
          oidcState.userManager,
        ]),
        events: oidcState.userManager.events,
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

const AuthenticationProvider = withRouter(
  withServices(AuthenticationProviderInt, {
    Callback,
    setDefaultState: setDefaultState(authenticationService),
  })
);
AuthenticationProvider.propTypes = propTypes;
AuthenticationProvider.defaultProps = defaultProps;
AuthenticationProvider.displayName = 'AuthenticationProvider';

export default AuthenticationProvider;

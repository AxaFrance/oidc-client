import React, { useEffect, useCallback, useReducer, FC, ComponentType, PropsWithChildren } from 'react';
import PropTypes from 'prop-types';
import {
  withRouter,
  authenticationService,
  setLogger,
  OidcRoutes,
  configurationPropTypes,
  configurationDefaultProps,
  ReactOidcHistory,
  UserStoreType
} from '@axa-fr/react-oidc-core';
import { User } from 'oidc-client';

import { Callback } from '../Callback';
import { addOidcEvents, removeOidcEvents, oidcReducer, login, logout, OidcState } from './OidcEvents';
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

const defaultProps: Partial<AuthenticationProviderIntProps> = {
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

export const setDefaultState = (authenticationServiceInternal: typeof authenticationService) => ({
  configuration,
  isEnabled,
  UserStore,
}: {configuration: any, isEnabled: boolean, UserStore?: UserStoreType}): OidcState => {
  return {
    oidcUser: undefined,
    userManager: authenticationServiceInternal(configuration, UserStore),
    isLoading: false,
    error: '',
    isEnabled,
  };
};

type WithComponentOverrideProps = {
  callbackComponentOverride: ComponentType
}
const withComponentOverrideProps = (Component: ComponentType<WithComponentOverrideProps>, customProps: ComponentType) => (props: WithComponentOverrideProps) => (
  <Component callbackComponentOverride={customProps} {...props} />
);

type Logger = {
  debug: (message?: any, ...optionalParams: any[]) => void;
  info: (message?: any, ...optionalParams: any[]) => void;
  warn: (message?: any, ...optionalParams: any[]) => void;
  error: (message?: any, ...optionalParams: any[]) => void;
}

type AuthenticationProviderIntProps = PropsWithChildren<{
  location: Location,
  history: ReactOidcHistory,
  setDefaultState: typeof setDefaultState,
  loggerLevel: number,
  logger: Logger,
  Callback: ComponentType<WithComponentOverrideProps>,
  notAuthenticated: ComponentType,
  notAuthorized: ComponentType,
  authenticating: ComponentType,
  callbackComponentOverride: ComponentType,
  sessionLostComponent: ComponentType,
  isEnabled?: boolean
  configuration: any
}>;

const AuthenticationProviderInt = ({
  location,
  history,
  setDefaultState: setDefaultStateInternal,
  ...otherProps
}: AuthenticationProviderIntProps) => {
  // @ts-ignore
  const [oidcState, dispatch] = useReducer(oidcReducer, setDefaultStateInternal(otherProps));

  useEffect(() => {
    setLogger(otherProps.loggerLevel, otherProps.logger);
    dispatch({ type: 'ON_LOADING' });
    addOidcEvents(oidcState.userManager.events, dispatch, oidcState.userManager);
    oidcState.userManager.getUser().then((user: User | null) => dispatch({ type: 'ON_LOAD_USER', user }));
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

  // @ts-ignore
  const CallbackComponent: ComponentType = React.useMemo(
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

const AuthenticationProvider:FC = withRouter(
  withServices(AuthenticationProviderInt, {
    Callback,
    setDefaultState: setDefaultState(authenticationService),
  })
);
AuthenticationProvider.propTypes = propTypes;
AuthenticationProvider.defaultProps = defaultProps;
AuthenticationProvider.displayName = 'AuthenticationProvider';

export default AuthenticationProvider;

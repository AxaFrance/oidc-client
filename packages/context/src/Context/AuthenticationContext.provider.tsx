import React, { useEffect, useCallback, FC, ComponentType, PropsWithChildren } from 'react';
import PropTypes from 'prop-types';
import { User, Logger, UserManagerSettings } from 'oidc-client';
import {
  withRouter,
  authenticationService,
  setLogger,
  OidcRoutes,
  configurationPropTypes,
  configurationDefaultProps,
  ReactOidcHistory,
  UserStoreType,
  oidcLog,
  authenticateUser,
  logoutUser,
} from '@axa-fr/react-oidc-core';

import { Callback } from '../Callback';

import withServices from '../withServices';
import { AuthenticationContext } from './AuthenticationContext';
import { useAuthenticationContextState, useOidcEvents } from './AuthenticationContext.hooks';

type AuthenticationProviderIntProps = PropsWithChildren<{
  location: Location;
  history: ReactOidcHistory;
  loggerLevel: number;
  logger: Logger;
  notAuthenticated: ComponentType;
  notAuthorized: ComponentType;
  authenticating: ComponentType;
  callbackComponentOverride: ComponentType;
  sessionLostComponent: ComponentType;
  UserStore: UserStoreType;
  isEnabled?: boolean;
  configuration: UserManagerSettings;
  authenticationServiceInt: typeof authenticationService;
  CallbackInt: typeof Callback;
  setLoggerInt: typeof setLogger;
  OidcRoutesInt: typeof OidcRoutes;
  oidcLogInt: typeof oidcLog;
  authenticateUserInt: typeof authenticateUser;
  logoutUserInt: typeof logoutUser;
}>;

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

export const withComponentOverrideProps = (Component: ComponentType, customCallback: ComponentType) => (props: PropsWithChildren<any>) => (
  <Component callbackComponentOverride={customCallback} {...props} />
);

export const AuthenticationProviderInt = ({
  location,
  history,
  configuration,
  isEnabled,
  UserStore,
  loggerLevel,
  logger,
  sessionLostComponent,
  authenticating,
  notAuthenticated,
  notAuthorized,
  callbackComponentOverride,
  children,
  //Injected
  authenticationServiceInt,
  CallbackInt,
  setLoggerInt,
  OidcRoutesInt,
  oidcLogInt,
  authenticateUserInt,
  logoutUserInt,
}: AuthenticationProviderIntProps) => {
  const userManager = authenticationServiceInt(configuration, UserStore);
  const { oidcState, ...oidcFunctions } = useAuthenticationContextState(userManager);
  const { addOidcEvents, removeOidcEvents } = useOidcEvents(oidcLogInt, userManager, oidcFunctions);

  useEffect(() => {
    let mount = true;
    setLoggerInt(loggerLevel, logger);
    oidcFunctions.onLoading();
    addOidcEvents();
    userManager.getUser().then((user: User | null) => {
      if (mount) {
        oidcFunctions.loadUser(user);
      }
    });
    return () => {
      mount = false;
      removeOidcEvents();
    };
  }, [logger, loggerLevel, oidcState.userManager]);

  const CallbackComponent = React.useMemo(
    () => (callbackComponentOverride ? withComponentOverrideProps(CallbackInt, callbackComponentOverride) : CallbackInt),
    [CallbackInt, callbackComponentOverride]
  );

  const loginCallback = useCallback(async () => {
    oidcFunctions.onLoading();
    oidcLogInt.info('Login requested');
    await authenticateUserInt(userManager, location, history)();
  }, []);

  const logoutCallback = useCallback(async () => {
    try {
      await logoutUserInt(userManager);
      oidcLogInt.info('Logout successfull');
    } catch (error) {
      oidcFunctions.onError(error.message);
    }
  }, []);

  return (
    <AuthenticationContext.Provider
      value={{
        ...oidcState,
        authenticating,
        isEnabled,
        login: loginCallback,
        logout: logoutCallback,
        events: oidcState.userManager.events,
      }}
    >
      <OidcRoutesInt
        notAuthenticated={notAuthenticated}
        notAuthorized={notAuthorized}
        callbackComponent={CallbackComponent}
        sessionLost={sessionLostComponent}
        configuration={configuration}
      >
        {children}
      </OidcRoutesInt>
    </AuthenticationContext.Provider>
  );
};

const AuthenticationProvider: FC = withRouter(
  withServices(AuthenticationProviderInt, { CallbackInt: Callback, authenticationServiceInt: authenticationService })
);
AuthenticationProvider.propTypes = propTypes;
AuthenticationProvider.defaultProps = defaultProps;
AuthenticationProvider.displayName = 'AuthenticationProvider';

export default AuthenticationProvider;

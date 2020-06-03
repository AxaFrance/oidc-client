import React, { ComponentType, PropsWithChildren, useContext, useEffect, useMemo } from 'react';
import { UserManager } from 'oidc-client';
import {
  withRouter,
  Authenticating,
  getUserManager,
  authenticateUser,
  isRequireAuthentication,
  oidcLog,
  ReactOidcHistory,
} from '@axa-fr/react-oidc-core';

import withServices from '../withServices';
import { AuthenticationContext } from '../oidcContext';

type OidcComponentProps = PropsWithChildren<{
  location: Location;
  history: ReactOidcHistory;
  authenticateUserInternal: typeof authenticateUser;
  getUserManagerInternal: typeof getUserManager;
  isRequireAuthenticationInternal: typeof isRequireAuthentication;
  AuthenticatingInternal: typeof Authenticating;
}>;

export const useOidcSecure = (
  authenticateUserInternal: typeof authenticateUser,
  userManager: UserManager,
  location: Location,
  history: ReactOidcHistory,
  oidcLogInternal: typeof oidcLog,
  AuthenticatingInternal: typeof Authenticating,
  isRequireAuthenticationInternal: typeof isRequireAuthentication,
  WrappedComponent: ComponentType
): ComponentType => {
  const { isEnabled, oidcUser, authenticating, isLoggingOut } = useContext(AuthenticationContext);
  useEffect(() => {
    oidcLogInternal.info('Protection : ', isEnabled);
    if (isEnabled && !isLoggingOut) {
      oidcLogInternal.info('Protected component mounted');
      authenticateUserInternal(userManager, location, history)();
    }
    return () => {
      oidcLogInternal.info('Protected component unmounted');
    };
  }, [isEnabled, authenticateUserInternal, userManager, oidcLogInternal, location, history, isLoggingOut]);
  const requiredAuth = useMemo(() => isRequireAuthenticationInternal(oidcUser, false) && isEnabled, [
    isEnabled,
    isRequireAuthenticationInternal,
    oidcUser,
  ]);

  const AuthenticatingComponent: ComponentType = authenticating || AuthenticatingInternal;
  return requiredAuth ? AuthenticatingComponent : WrappedComponent;
};

export const OidcSecureWithInjectedFunctions = ({
  children,
  location,
  history,
  authenticateUserInternal,
  getUserManagerInternal,
  isRequireAuthenticationInternal,
  AuthenticatingInternal,
}: OidcComponentProps) => {
  const userManager = getUserManagerInternal();
  const WrappedComponent = useMemo(() => () => <>{children}</>, [children]);
  const ReactOidcComponent = useOidcSecure(
    authenticateUserInternal,
    userManager,
    location,
    history,
    oidcLog,
    AuthenticatingInternal,
    isRequireAuthenticationInternal,
    WrappedComponent
  );

  return <ReactOidcComponent />;
};

const OidcSecure = withRouter(
  withServices(OidcSecureWithInjectedFunctions, {
    authenticateUserInternal: authenticateUser,
    getUserManagerInternal: getUserManager,
    isRequireAuthenticationInternal: isRequireAuthentication,
    AuthenticatingInternal: Authenticating,
  })
);

export const withOidcSecure = (WrappedComponent: ComponentType) => (props: PropsWithChildren<any>) => (
  <OidcSecure>
    <WrappedComponent {...props} />
  </OidcSecure>
);

export default OidcSecure;

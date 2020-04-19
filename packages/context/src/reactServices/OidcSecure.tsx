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
  children?: ComponentType;
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
  const { isEnabled, oidcUser, authenticating } = useContext(AuthenticationContext);
  useEffect(() => {
    oidcLogInternal.info('Protection : ', isEnabled);
    if (isEnabled) {
      oidcLogInternal.info('Protected component mounted');
      authenticateUserInternal(userManager, location, history)();
    }
    return () => {
      oidcLogInternal.info('Protected component unmounted');
    };
  }, [isEnabled, authenticateUserInternal, userManager, oidcLogInternal, location, history]);
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
  const WrappedComponent = () => <>{children}</>;
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

export const withOidcSecureWithInjectedFunctions = (WrappedComponent: ComponentType) => ({
  location,
  history,
  authenticateUserInternal,
  getUserManagerInternal,
  isRequireAuthenticationInternal,
  AuthenticatingInternal,
  ...otherProps
}: OidcComponentProps) => {
  const userManager = getUserManagerInternal();
  const OverrideWrappedComponent = () => <WrappedComponent {...otherProps} />;

  const ReactOidcComponent = useOidcSecure(
    authenticateUserInternal,
    userManager,
    location,
    history,
    oidcLog,
    AuthenticatingInternal,
    isRequireAuthenticationInternal,
    OverrideWrappedComponent
  );

  return <ReactOidcComponent />;
};

export const withOidcSecure = (WrappedComponent: ComponentType) =>
  withRouter(
    withServices(withOidcSecureWithInjectedFunctions(WrappedComponent), {
      authenticateUserInternal: authenticateUser,
      getUserManagerInternal: getUserManager,
      isRequireAuthenticationInternal: isRequireAuthentication,
      AuthenticatingInternal: Authenticating,
    })
  );

const OidcSecure = withRouter(
  withServices(OidcSecureWithInjectedFunctions, {
    authenticateUserInternal: authenticateUser,
    getUserManagerInternal: getUserManager,
    isRequireAuthenticationInternal: isRequireAuthentication,
    AuthenticatingInternal: Authenticating,
  })
);

export default OidcSecure;

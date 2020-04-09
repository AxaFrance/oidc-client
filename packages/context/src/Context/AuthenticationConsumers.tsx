import React, { ComponentType, PropsWithChildren, useContext, useEffect, useMemo } from 'react';
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
import { AuthenticationContext } from './AuthenticationContext';

// export use only for unit tests
export const useOidcSecure = (
  authenticateUserInternal: typeof authenticateUser,
  getUserManagerInternal: typeof getUserManager,
  location: Location,
  history: ReactOidcHistory
) => {
  const { isEnabled, oidcUser, authenticating } = useContext(AuthenticationContext);
  useEffect(() => {
    oidcLog.info('Protection : ', isEnabled);
    if (isEnabled) {
      oidcLog.info('Protected component mounted');
      const usermanager = getUserManagerInternal();
      authenticateUserInternal(usermanager, location, history)();
    }
    return () => {
      oidcLog.info('Protected component unmounted');
    };
  }, [location, isEnabled, authenticateUserInternal, getUserManagerInternal]);
  return { oidcUser, authenticating, isEnabled };
};

// for usage
export const useReactOidc = () => {
  const { isEnabled, login, logout, oidcUser, events } = useContext(AuthenticationContext);
  return { isEnabled, login, logout, oidcUser, events };
};

type WithRouterComponentProps = PropsWithChildren<{
  location: Location;
  history: ReactOidcHistory;
}>;

const OidcSecure = withRouter(({ children, location, history }: WithRouterComponentProps) => {
  const { oidcUser, authenticating, isEnabled } = useOidcSecure(authenticateUser, getUserManager, location, history);
  const requiredAuth = useMemo(() => isRequireAuthentication(oidcUser, false) && isEnabled, [isEnabled, oidcUser]);
  const AuthenticatingComponent = authenticating || Authenticating;
  return requiredAuth ? <AuthenticatingComponent /> : <div>{children}</div>;
});

export default OidcSecure;

// For non-regression
type WithOidcSecurewithRouterProps = PropsWithChildren<{
  location: Location;
  history: ReactOidcHistory;
  authenticateUser: typeof authenticateUser;
  getUserManager: typeof getUserManager;
}>;

export const withOidcSecurewithRouter = (WrappedComponent: ComponentType) => ({
  location,
  history,
  authenticateUser: authenticateUserInternal,
  getUserManager: getUserManagerInternal,
  ...otherProps
}: WithOidcSecurewithRouterProps) => {
  const { oidcUser, authenticating, isEnabled } = useOidcSecure(authenticateUserInternal, getUserManagerInternal, location, history);
  const requiredAuth = useMemo(() => isRequireAuthentication(oidcUser, false) && isEnabled, [isEnabled, oidcUser]);

  const AuthenticatingComponent = authenticating || Authenticating;
  return requiredAuth ? <AuthenticatingComponent /> : <WrappedComponent {...otherProps} />;
};

export const withOidcSecure = (WrappedComponent: ComponentType) =>
  withRouter(
    withServices(withOidcSecurewithRouter(WrappedComponent), {
      authenticateUser,
      getUserManager,
    })
  );

type WithOidcUserComponentProps = PropsWithChildren<{}>;
export const withOidcUser = (Component: ComponentType) => (props: WithOidcUserComponentProps) => {
  const { oidcUser } = useContext(AuthenticationContext);
  const { children } = props;
  return (
    // @ts-ignore
    <Component {...props} oidcUser={oidcUser}>
      {children}
    </Component>
  );
};

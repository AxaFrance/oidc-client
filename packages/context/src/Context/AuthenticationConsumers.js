import React, { useContext, useEffect, useMemo } from 'react';
import { withRouter, Authenticating } from '@axa-fr/react-oidc-core';
import {
  authenticateUser,
  getUserManager,
  oidcLog,
  isRequireAuthentication,
  withServices,
} from '../Services';
import { AuthenticationContext } from './AuthenticationContextCreator';

// for tests
export const useOidcSecure = (authenticateUserInternal, getUserManagerInternal, location) => {
  const { isEnabled, oidcUser, authenticating } = useContext(AuthenticationContext);
  useEffect(() => {
    oidcLog.info('Protection : ', isEnabled);
    if (isEnabled) {
      oidcLog.info('Protected component mounted');
      const usermanager = getUserManagerInternal();
      authenticateUserInternal(usermanager, location)();
    }
    return () => {
      oidcLog.info('Protected component unmounted');
    };
  }, [location, isEnabled, authenticateUserInternal, getUserManagerInternal]);
  return { oidcUser, authenticating, isEnabled };
};

// for usage
export const useReactOidc = () => {
  const { isEnabled, login, logout, oidcUser } = useContext(AuthenticationContext);
  return { isEnabled, login, logout, oidcUser };
};

const OidcSecure = withRouter(({ children, location }) => {
  const { oidcUser, authenticating, isEnabled } = useOidcSecure(
    authenticateUser,
    getUserManager,
    location,
  );
  const requiredAuth = useMemo(() => isRequireAuthentication(oidcUser, false) && isEnabled, [
    isEnabled,
    oidcUser,
  ]);
  const AuthenticatingComponent = authenticating || Authenticating;
  return requiredAuth ? <AuthenticatingComponent /> : <div>{children}</div>;
});

export default OidcSecure;

// For non-regression
export const withOidcSecurewithRouter = WrappedComponent => ({
  location,
  authenticateUser: authenticateUserInternal,
  getUserManager: getUserManagerInternal,
  ...otherProps
}) => {
  const { oidcUser, authenticating, isEnabled } = useOidcSecure(
    authenticateUserInternal,
    getUserManagerInternal,
    location,
  );
  const requiredAuth = useMemo(() => isRequireAuthentication(oidcUser, false) && isEnabled, [
    isEnabled,
    oidcUser,
  ]);

  const AuthenticatingComponent = authenticating || Authenticating;
  return requiredAuth ? <AuthenticatingComponent /> : <WrappedComponent {...otherProps} />;
};

export const withOidcSecure = WrappedComponent =>
  withRouter(
    withServices(withOidcSecurewithRouter(WrappedComponent), {
      authenticateUser,
      getUserManager,
    }),
  );

export const withOidcUser = Component => props => {
  const { oidcUser } = useContext(AuthenticationContext);
  const { children } = props;
  return (
    <Component {...props} oidcUser={oidcUser}>
      {children}
    </Component>
  );
};

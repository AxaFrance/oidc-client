import React, { useContext, useEffect, useMemo } from 'react';
import { withRouter } from 'react-router-dom';

import {
  authenticateUser,
  getUserManager,
  oidcLog,
  isRequireAuthentication,
  withServices,
} from '../Services';
import { Authenticating } from '../OidcComponents';
import { AuthenticationContext } from './AuthenticationContextCreator';

// for tests
export const useOidcSecure = (authenticateUserInternal, getUserManagerInternal, location) => {
  const { isEnabled, oidcUser, authenticating } = useContext(AuthenticationContext);
  useEffect(() => {
    if (isEnabled) {
      oidcLog.info('Protected component mounted');
      const usermanager = getUserManagerInternal();
      authenticateUserInternal(usermanager, location)();
    }
    return () => {
      oidcLog.info('Protected component unmounted');
    };
  }, [location, isEnabled, authenticateUserInternal, getUserManagerInternal]);
  return { oidcUser, authenticating };
};

// for usage
const OidcSecure = withRouter(({ children, location }) => {
  const { oidcUser, authenticating } = useOidcSecure(authenticateUser, getUserManager, location);
  const requiredAuth = useMemo(() => isRequireAuthentication(oidcUser, false), [oidcUser]);
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
  const { oidcUser, authenticating } = useOidcSecure(
    authenticateUserInternal,
    getUserManagerInternal,
    location
  );
  const requiredAuth = useMemo(() => isRequireAuthentication(oidcUser, false), [oidcUser]);
  const AuthenticatingComponent = authenticating || Authenticating;
  return requiredAuth ? <AuthenticatingComponent /> : <WrappedComponent {...otherProps} />;
};

export const withOidcSecure = WrappedComponent =>
  withRouter(
    withServices(withOidcSecurewithRouter(WrappedComponent), {
      authenticateUser,
      getUserManager,
    })
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

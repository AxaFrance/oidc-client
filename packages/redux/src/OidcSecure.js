import React, { useEffect } from 'react';

import PropTypes from 'prop-types';
import {
  Authenticating,
  withRouter,
  getUserManager,
  isRequireAuthentication,
  authenticateUser,
} from '@axa-fr/react-oidc-core';
import { connect } from 'react-redux';
import { compose } from 'recompose';

const AuthenticationLiveCycle = ({ location, oidc, children }) => {
  const { isLoadingUser, user } = oidc;
  const isShouldAuthenticate = !isLoadingUser && isRequireAuthentication(user);
  const isLoading = isLoadingUser || isShouldAuthenticate;
  useEffect(() => {
    if (isShouldAuthenticate) {
      const userManager = getUserManager();
      authenticateUser(userManager, location, user)();
    }
  }, [isShouldAuthenticate, location, user]);

  return isLoading ? <Authenticating /> : <>{children}</>;
};

const mapStateToProps = state => ({
  oidc: state.oidc,
});

const oidcCompose = compose(
    connect(
        mapStateToProps,
        null
    ),
    withRouter
);

const Secure = oidcCompose(AuthenticationLiveCycle);

export const oidcSecure = Component => props => {
  return <Secure><Component {...props} /></Secure>;
};

const propTypesOidcSecure = {
  isEnabled: PropTypes.bool,
  children: PropTypes.node,
};

const defaultPropsOidcSecure = {
  isEnabled: true,
  children: null,
};

const OidcSecure = props => {
  const { isEnabled, children } = props;
  if (isEnabled) {
    return <Secure>{children}</Secure>;
  }
  return <>{children}</>;
};

OidcSecure.propTypes = propTypesOidcSecure;
OidcSecure.defaultProps = defaultPropsOidcSecure;

export default OidcSecure;

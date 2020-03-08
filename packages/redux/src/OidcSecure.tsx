import React, { ComponentType, FC, PropsWithChildren, useEffect } from 'react';

import PropTypes from 'prop-types';
import {
  Authenticating,
  withRouter,
  getUserManager,
  isRequireAuthentication,
  authenticateUser, ReactOidcHistory,
} from '@axa-fr/react-oidc-core';
import { connect } from 'react-redux';
import { compose } from 'recompose';
import { UserState } from 'redux-oidc';

type AuthenticationLiveCycleProps = PropsWithChildren<{
  location: Location,
  history: ReactOidcHistory,
  oidc: UserState
}>;

const AuthenticationLiveCycle: FC<AuthenticationLiveCycleProps> = ({ location, oidc, children, history }) => {
  const { isLoadingUser, user } = oidc;
  const isShouldAuthenticate = !isLoadingUser && isRequireAuthentication(user);
  const isLoading = isLoadingUser || isShouldAuthenticate;
  useEffect(() => {
    if (isShouldAuthenticate) {
      const userManager = getUserManager();
      authenticateUser(userManager, location, history, user)();
    }
  }, [isShouldAuthenticate, location, user]);

  return isLoading ? <Authenticating /> : <>{children}</>;
};

const mapStateToProps = (state: any) => ({
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

export const oidcSecure = (Component: ComponentType) => (props: any) => {
  return <Secure><Component {...props} /></Secure>;
};

const propTypesOidcSecure = {
  isEnabled: PropTypes.bool,
  children: PropTypes.node,
};

const defaultPropsOidcSecure = {
  isEnabled: true,
};

type OidcSecureProps = PropsWithChildren<{
  isEnabled?: boolean
}>;

const OidcSecure: FC<OidcSecureProps> = (props) => {
  const { isEnabled, children } = props;
  if (isEnabled) {
    return <Secure>{children}</Secure>;
  }
  return <>{children}</>;
};

OidcSecure.propTypes = propTypesOidcSecure;
OidcSecure.defaultProps = defaultPropsOidcSecure;

export default OidcSecure;

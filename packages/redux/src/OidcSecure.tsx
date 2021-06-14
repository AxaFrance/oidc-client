import React, { ComponentType, FC, PropsWithChildren, useEffect } from 'react';

import PropTypes from 'prop-types';
import {
  Authenticating as DefaultAuthenticatingComponent,
  withRouter,
  getUserManager,
  isRequireAuthentication,
  authenticateUser,
  ReactOidcHistory,
} from '@axa-fr/react-oidc-core';
import { connect } from 'react-redux';
import { compose } from 'recompose';
import { UserState } from 'redux-oidc';

type AuthenticationLiveCycleProps = PropsWithChildren<{
  location: Location;
  history: ReactOidcHistory;
  oidc: UserState;
  authenticating: ComponentType;
}>;

const AuthenticationLiveCycle: FC<AuthenticationLiveCycleProps> = ({ location, oidc, children, history, authenticating }) => {
  const { user } = oidc;
  const userRequireAuthentication = isRequireAuthentication(user);
  useEffect(() => {
    if (userRequireAuthentication) {
      const userManager = getUserManager();
      authenticateUser(userManager, location, history, user)();
    }
  }, [userRequireAuthentication, location, user]);

  const AuthenticatingComponent: ComponentType = authenticating || DefaultAuthenticatingComponent;

  return userRequireAuthentication ? <AuthenticatingComponent /> : <>{children}</>;
};

const mapStateToProps = (state: any) => ({
  oidc: state.oidc,
});

const oidcCompose = compose(connect(mapStateToProps, null), withRouter);

const Secure = oidcCompose(AuthenticationLiveCycle);

export const oidcSecure = (Component: ComponentType) => (props: any) => {
  return (
    <Secure>
      <Component {...props} />
    </Secure>
  );
};

const propTypesOidcSecure = {
  children: PropTypes.node.isRequired,
  isEnabled: PropTypes.bool,
};

const defaultPropsOidcSecure = {
  isEnabled: true,
};

type OidcSecureProps = PropsWithChildren<{
  /**
   * Enable secure authentication for component
   */
  isEnabled?: boolean;
  /**
   * Custom Authenticating Component
   */
  authenticating?: ComponentType;
}>;

const OidcSecure: FC<OidcSecureProps> = props => {
  const { isEnabled, children, ...configProps } = props;

  if (isEnabled) {
    return <Secure {...configProps}>{children}</Secure>;
  }
  return <>{children}</>;
};

OidcSecure.propTypes = propTypesOidcSecure;
OidcSecure.defaultProps = defaultPropsOidcSecure;

export default OidcSecure;

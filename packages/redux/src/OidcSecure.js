import React, { useEffect } from "react";

import PropTypes from "prop-types";
import { connect } from "react-redux";
import { compose } from "recompose";
import { withRouter } from "react-router-dom";
import Authenticating from "./Authenticating";
import { isRequireSignin, authenticateUser } from "./authenticate";
import { getUserManager } from './authenticationService';

const AuthenticationLiveCycle =  ({
  location, user, children
}) => {
  const isAuthenticating = isRequireSignin({user});
  useEffect(() => {
            if (isAuthenticating) {
              const userManager = getUserManager();
              authenticateUser(userManager, location, user)();
            }
  }, [isAuthenticating]);

  return isAuthenticating ? <Authenticating /> : <>{children}</>;
};

const mapStateToProps = state => ({
  user: state.oidc.user
});

export const oidcSecure = compose(
  connect(
    mapStateToProps,
    null
  ),
  withRouter
);

const propTypes = {
  children: PropTypes.node
};

const defaultProps = {
  children: null
};

const Dummy = ({ children }) => <>{children}</>;

Dummy.propTypes = propTypes;
Dummy.defaultProps = defaultProps;

const propTypesOidcSecure = {
  isEnabled: PropTypes.bool,
  children: PropTypes.node
};

const defaultPropsOidcSecure = {
  isEnabled: true,
  children: null
};

const OidcSecure = props => {
  const { isEnabled, children } = props;
  if (isEnabled) {
    const Secure = oidcSecure(AuthenticationLiveCycle);
    return <Secure>{children}</Secure>;
  }
  return <Dummy {...props} />;
};

OidcSecure.propTypes = propTypesOidcSecure;
OidcSecure.defaultProps = defaultPropsOidcSecure;

export default OidcSecure;

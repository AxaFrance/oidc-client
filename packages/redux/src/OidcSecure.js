import React, { useEffect } from "react";

import PropTypes from "prop-types";
import { connect } from "react-redux";
import { compose, branch } from "recompose";
import { withRouter } from "react-router-dom";
import Authenticating from "./Authenticating";
import { isRequireSignin, authenticateUser } from "./authenticate";
import { getLocalStorage } from "./localStorage";
import { getUserManager } from "./authenticationService";

const mapStateToProps = state => ({
  user: state.oidc.user
});

const authenticate = location =>
  authenticateUser(getUserManager(), location, getLocalStorage());

const withAuthenticationLiveCycle = (useEffect_, authenticate_) => ({
  location
}) => {
  useEffect_(async () => {
    await authenticate_(location)();
  }, []);

  return <Authenticating />;
};

const AuthenticationLiveCycle = withAuthenticationLiveCycle(
  useEffect,
  authenticate
);

const wrapAuthenticating = () => () => <AuthenticationLiveCycle />;

export const oidcSecure = compose(
  connect(
    mapStateToProps,
    null
  ),
  withRouter,
  branch(isRequireSignin, wrapAuthenticating)
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
    const Secure = oidcSecure(Dummy);
    return <Secure>{children}</Secure>;
  }
  return <Dummy {...props} />;
};

OidcSecure.propTypes = propTypesOidcSecure;
OidcSecure.defaultProps = defaultPropsOidcSecure;

export default OidcSecure;

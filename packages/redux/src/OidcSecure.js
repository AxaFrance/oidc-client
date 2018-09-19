import React, { Fragment } from 'react';

import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { compose, lifecycle, branch } from 'recompose';
import { withRouter } from 'react-router-dom';
import Authenticating from './Authenticating';
import { isRequireAuthentication, authenticateUser } from './authenticate';
import { getLocalStorage } from './localStorage';
import { getUserManager } from './authenticationService';

const mapStateToProps = state => ({
  user: state.oidc.user,
});

const lifecycleComponent = {
  async componentDidMount() {
    const usermanager = getUserManager();
    await authenticateUser(usermanager, this.props.location, getLocalStorage())();
  },
};

const wrapAuthenticating = () => () => <Authenticating />;

export const oidcSecure = compose(
  connect(
    mapStateToProps,
    null
  ),
  withRouter,
  lifecycle(lifecycleComponent),
  branch(isRequireAuthentication, wrapAuthenticating)
);

const propTypes = {
  children: PropTypes.node,
};

const defaultProps = {
  children: null,
};

const Dummy = ({ children }) => <Fragment>{children}</Fragment>;

Dummy.propTypes = propTypes;
Dummy.defaultProps = defaultProps;

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
    const Secure = oidcSecure(Dummy);
    return <Secure>{children}</Secure>;
  }
  return <Dummy {...props} />;
};

OidcSecure.propTypes = propTypesOidcSecure;
OidcSecure.defaultProps = defaultPropsOidcSecure;

export default OidcSecure;

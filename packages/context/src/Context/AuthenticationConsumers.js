import React, { Fragment } from "react";
import { withRouter } from "react-router-dom";
import {
  compose,
  branch,
  lifecycle,
  defaultProps,
  renderComponent
} from "recompose";

import PropTypes from "prop-types";
import { withOidcUser } from "./AuthenticationContext.container";
import {
  authenticateUser,
  getUserManager,
  oidcLog,
  isRequireAuthentication
} from "../Services";
import { Authenticating } from "../OidcComponents";

const lifecycleComponent = {
  async componentDidMount() {
    oidcLog.info("Protected component mounted");
    const usermanager = getUserManager();
    await authenticateUser(usermanager, this.props.location)();
  }
};

const dummyDefaultProps = {
  children: PropTypes.node
};

const wrapAuthenticating = () => <Authenticating />;
const Dummy = ({ children }) => <Fragment>{children}</Fragment>;

Dummy.defaultProps = dummyDefaultProps;

const withDefaultProps = defaultProps({
  isEnabled: true
});

export const withOidcSecure = compose(
  withDefaultProps,
  branch(({ isEnabled }) => !isEnabled, renderComponent(Dummy)),
  withOidcUser,
  withRouter,
  lifecycle(lifecycleComponent),
  branch(
    ({ oidcUser }) => isRequireAuthentication(oidcUser, false),
    renderComponent(wrapAuthenticating)
  )
);

const OidcSecure = props => {
  const { children } = props;
  const Secure = withOidcSecure(Dummy);
  return <Secure {...props}>{children}</Secure>;
};

export default OidcSecure;

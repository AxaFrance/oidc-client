import React, { Fragment } from 'react';
import { withRouter } from 'react-router-dom';
import PropTypes from 'prop-types';
import { fromRenderProps, compose, branch, lifecycle, renderComponent } from 'recompose';
import { AuthenticationConsumer, withOidcUser } from './AuthenticationContext.container';
import { authenticateUser, getUserManager, oidcLog, isRequireAuthentication } from '../Services';
import { Authenticating } from '../OidcComponents';

const withContext = fromRenderProps(AuthenticationConsumer, ({ isEnabled, authenticating }) => ({
  isEnabled,
  authenticating,
}));

const lifecycleComponent = {
  async componentDidMount() {
    oidcLog.info('Protected component mounted');
    const usermanager = getUserManager();
    await authenticateUser(usermanager, this.props.location)();
  },
};

const wrapAuthenticating = ({ authenticating }) => {
  const AuthenticatingComponent = authenticating || Authenticating;
  return <AuthenticatingComponent />;
};

wrapAuthenticating.propTypes = {
  authenticating: PropTypes.node,
};

wrapAuthenticating.defaultProps = {
  authenticating: null,
};

const Dummy = ({ children }) => <Fragment>{children}</Fragment>;

export const withOidcSecure = compose(
  withContext,
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

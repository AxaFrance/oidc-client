import React, { Fragment } from 'react';
import { OidcProvider, loadUser } from 'redux-oidc';
import { compose, lifecycle, defaultProps } from 'recompose';
import PropTypes from 'prop-types';
import OidcRoutes from './OidcRoutes';
import authenticationService, { getUserManager } from './authenticationService';

const propTypes = {
  notAuthentified: PropTypes.node,
  notAuthorized: PropTypes.node,
  // eslint-disable-next-line
  configuration: PropTypes.object.isRequired,
  store: PropTypes.object.isRequired,
  isEnabled: PropTypes.bool,
  children: PropTypes.node,
};

export const OidcBase = props => {
  const { isEnabled, children, store, notAuthentified, notAuthorized } = props;

  if (!isEnabled) {
    return <Fragment>{children}</Fragment>;
  }

  return (
    <OidcProvider store={store} userManager={getUserManager()}>
      <OidcRoutes
        notAuthentified={notAuthentified}
        notAuthorized={notAuthorized}
      >
        {children}
      </OidcRoutes>
    </OidcProvider>
  );
};

OidcBase.propTypes = propTypes;

const lifecycleComponent = {
  componentWillMount() {
    const { isEnabled, store, configuration } = this.props;
    if (isEnabled) {
      const userManager = authenticationService(configuration);
      loadUser(store, userManager);
    }
  },
};

const defaultPropsObject = {
  notAuthentified: null,
  notAuthorized: null,
  isEnabled: true,
  children: null,
};

const enhance = compose(
  defaultProps(defaultPropsObject),
  lifecycle(lifecycleComponent),
);

export default enhance(OidcBase);

import React, { Fragment } from 'react';
import { OidcProvider, loadUser } from 'redux-oidc';
import { compose, lifecycle } from 'recompose';
import PropTypes from 'prop-types';
import OidcRoutes from './OidcRoutes';
import authenticationService, { getUserManager } from './authenticationService';

const propTypes = {
  notAuthenticated: PropTypes.node,
  notAuthorized: PropTypes.node,
  // eslint-disable-next-line
  configuration: PropTypes.object.isRequired,
  store: PropTypes.object.isRequired,
  isEnabled: PropTypes.bool,
  children: PropTypes.node,
};

const defaultPropsObject = {
  notAuthenticated: null,
  notAuthorized: null,
  isEnabled: true,
  children: null,
};

export const OidcBase = props => {
  const { isEnabled, children, store, notAuthenticated, notAuthorized } = props;

  if (!isEnabled) {
    return <Fragment>{children}</Fragment>;
  }

  return (
    <OidcProvider store={store} userManager={getUserManager()}>
      <OidcRoutes notAuthenticated={notAuthenticated} notAuthorized={notAuthorized}>
        {children}
      </OidcRoutes>
    </OidcProvider>
  );
};

OidcBase.propTypes = propTypes;
OidcBase.defaultProps = defaultPropsObject;

const lifecycleComponent = {
  componentWillMount() {
    const { isEnabled, store, configuration } = this.props;
    if (isEnabled) {
      const userManager = authenticationService(configuration);
      loadUser(store, userManager);
    }
  },
};

const enhance = compose(lifecycle(lifecycleComponent));

export default enhance(OidcBase);

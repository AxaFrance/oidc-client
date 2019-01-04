import React, { Fragment } from 'react';
import { OidcProvider, loadUser } from 'redux-oidc';
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

const defaultProps = {
  notAuthentified: null,
  notAuthorized: null,
  isEnabled: true,
  children: null,
};

class Oidc extends React.Component {
  componentWillMount() {
    if (this.props.isEnabled) {
      const userManager = authenticationService(this.props.configuration);
      loadUser(this.props.store, userManager);
    }
  }

  render() {
    const {
      isEnabled,
      children,
      store,
      notAuthentified,
      notAuthorized,
    } = this.props;

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
  }
}

Oidc.propTypes = propTypes;
Oidc.defaultProps = defaultProps;

export default Oidc;

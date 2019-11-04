import React from 'react';
import { OidcProvider, loadUser } from 'redux-oidc';
import { compose, lifecycle } from 'recompose';
import PropTypes from 'prop-types';
import { OidcRoutes, authenticationService, getUserManager } from '@axa-fr/react-oidc-core';
import AuthenticationCallback from './AuthenticationCallback';

const propTypes = {
  notAuthenticated: PropTypes.elementType,
  notAuthorized: PropTypes.elementType,
  configuration: PropTypes.shape({
        client_id: PropTypes.string.isRequired,
        redirect_uri: PropTypes.string.isRequired,
        response_type: PropTypes.string.isRequired,
        scope: PropTypes.string.isRequired,
        authority: PropTypes.string.isRequired,
        silent_redirect_uri: PropTypes.string.isRequired,
        automaticSilentRenew: PropTypes.bool.isRequired,
        loadUserInfo: PropTypes.bool.isRequired,
        triggerAuthFlow: PropTypes.bool.isRequired,
        metadata : PropTypes.shape({
          issuer: PropTypes.string,
          jwks_uri: PropTypes.string,
          authorization_endpoint: PropTypes.string,
          token_endpoint: PropTypes.string,
          userinfo_endpoint: PropTypes.string,
          end_session_endpoint: PropTypes.string,
          revocation_endpoint: PropTypes.string,
          introspection_endpoint: PropTypes.string
        })
      }).isRequired,
  store: PropTypes.object.isRequired,
  isEnabled: PropTypes.bool,
  children: PropTypes.node,
  callbackComponentOverride: PropTypes.elementType,
};

const defaultPropsObject = {
  notAuthenticated: null,
  notAuthorized: null,
  isEnabled: true,
  children: null,
  callbackComponentOverride: null,
};

const withComponentOverrideProps = (Component, customProps) => props => (
  <Component callbackComponentOverride={customProps} {...props} />
);

export const OidcBase = props => {
  const {
    isEnabled,
    children,
    store,
    callbackComponentOverride,
    configuration,
    notAuthenticated,
    notAuthorized,
  } = props;

  if (!isEnabled) {
    return <>{children}</>;
  }

  return (
    <OidcProvider store={store} userManager={getUserManager()}>
      <OidcRoutes
        configuration={configuration}
        notAuthenticated={notAuthenticated}
        notAuthorized={notAuthorized}
        callbackComponent={withComponentOverrideProps(
          AuthenticationCallback,
          callbackComponentOverride
        )}
      >
        {children}
      </OidcRoutes>
    </OidcProvider>
  );
};

OidcBase.propTypes = propTypes;
OidcBase.defaultProps = defaultPropsObject;

const lifecycleComponent = {
  UNSAFE_componentWillMount() {
    const { isEnabled, store, configuration } = this.props;
    if (isEnabled) {
      const userManager = authenticationService(configuration);
      loadUser(store, userManager);
    }
  },
};

const enhance = compose(lifecycle(lifecycleComponent));

export default enhance(OidcBase);

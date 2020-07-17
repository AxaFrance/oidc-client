import * as PropTypes from 'prop-types';

export const configurationPropTypes = PropTypes.shape({
  client_id: PropTypes.string.isRequired,
  redirect_uri: PropTypes.string,
  popup_redirect_uri: PropTypes.string,
  popupWindowFeatures: PropTypes.string,
  response_type: PropTypes.string.isRequired,
  scope: PropTypes.string.isRequired,
  authority: PropTypes.string.isRequired,
  silent_redirect_uri: PropTypes.string.isRequired,
  automaticSilentRenew: PropTypes.bool,
  loadUserInfo: PropTypes.bool,
  triggerAuthFlow: PropTypes.bool,
  storeJwtInMemory: PropTypes.bool,
  metadata: PropTypes.shape({
    issuer: PropTypes.string,
    jwks_uri: PropTypes.string,
    authorization_endpoint: PropTypes.string,
    token_endpoint: PropTypes.string,
    userinfo_endpoint: PropTypes.string,
    end_session_endpoint: PropTypes.string,
    revocation_endpoint: PropTypes.string,
    introspection_endpoint: PropTypes.string,
  }),
}).isRequired;

export const configurationDefaultProps = {
  automaticSilentRenew: true,
  loadUserInfo: true,
  triggerAuthFlow: true,
  storeJwtInMemory: false
};

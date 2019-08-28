import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { NotAuthenticated, NotAuthorized } from '@axa-fr/react-oidc-core';
import { Callback, SilentCallback } from '../Callback';

const propTypes = {
  notAuthenticated: PropTypes.node,
  notAuthorized: PropTypes.node,
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
  }).isRequired,
  children: PropTypes.node,
};

const defaultProps = {
  notAuthenticated: null,
  notAuthorized: null,
  children: null,
};

const getLocation = href => {
  const match = href.match(
    // eslint-disable-next-line no-useless-escape
    /^(https?\:)\/\/(([^:\/?#]*)(?:\:([0-9]+))?)([\/]{0,1}[^?#]*)(\?[^#]*|)(#.*|)$/,
  );
  return (
    match && {
      href,
      protocol: match[1],
      host: match[2],
      hostname: match[3],
      port: match[4],
      path: match[5],
      search: match[6],
      hash: match[7],
    }
  );
};

export const getPath = href => {
  const location = getLocation(href);
  let { path } = location;
  const { search, hash } = location;

  if (search) {
    path += search;
  }

  if (hash) {
    path += hash;
  }

  return path;
};

const OidcRoutes = ({ notAuthenticated, notAuthorized, configuration, children }) => {
  const [path, setPath] = useState(window.location.pathname);

  const setNewPath = () => setPath(window.location.pathname);
  useEffect(() => {
    setNewPath();
    window.addEventListener('popstate', setNewPath, false);
    return () => window.removeEventListener('popstate', setNewPath, false);
  });

  const NotAuthenticatedComponent = notAuthenticated || NotAuthenticated;
  const NotAuthorizedComponent = notAuthorized || NotAuthorized;
  const silentCallbackPath = getPath(configuration.silent_redirect_uri);
  const callbackPath = getPath(configuration.redirect_uri);

  // TODO: useEffect pour rerender quand la location change
  switch (path) {
    case callbackPath:
      return <Callback />;
    case silentCallbackPath:
      return <SilentCallback />;
    case '/authentication/not-authenticated':
      return <NotAuthenticatedComponent />;
    case '/authentication/not-authorized':
      return <NotAuthorizedComponent />;
    default:
      return <>{children}</>;
  }
};

OidcRoutes.propTypes = propTypes;
OidcRoutes.defaultProps = defaultProps;

export default React.memo(OidcRoutes);

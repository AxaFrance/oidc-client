import { Database, OidcConfig, OidcServerConfiguration } from './types';
import { normalizeUrl } from './utils';

const getOidcServerUrls = (oidcServerConfiguration: OidcServerConfiguration): string[] => {
  return [
    oidcServerConfiguration.issuer,
    oidcServerConfiguration.authorizationEndpoint,
    oidcServerConfiguration.tokenEndpoint,
    oidcServerConfiguration.revocationEndpoint,
    oidcServerConfiguration.userInfoEndpoint,
  ]
    .filter(Boolean)
    .map(normalizeUrl);
};

const isOidcServerRequest = (database: Database, normalizedUrl: string): boolean => {
  return Object.values(database).some(config => {
    const { oidcServerConfiguration } = config || {};
    if (!oidcServerConfiguration) {
      return false;
    }

    return getOidcServerUrls(oidcServerConfiguration).some(oidcUrl =>
      normalizedUrl.startsWith(oidcUrl),
    );
  });
};

const shouldBypassNonOidcRequest = (database: Database, normalizedUrl: string): boolean => {
  const configurations = Object.values(database);

  if (configurations.length === 0) {
    return false;
  }

  if (!configurations.every(config => config.bypassAllNonOidcRequests)) {
    return false;
  }

  if (!configurations.every(config => config.oidcServerConfiguration != null)) {
    return false;
  }

  return !isOidcServerRequest(database, normalizedUrl);
};

const getMatchingOidcConfigurations = (database: Database, url: string): OidcConfig[] => {
  return Object.values(database).filter(config => {
    const { oidcServerConfiguration } = config || {};
    const { tokenEndpoint, revocationEndpoint } = oidcServerConfiguration || {};

    const normalizedUrl = normalizeUrl(url);
    return (
      (tokenEndpoint && normalizedUrl.startsWith(normalizeUrl(tokenEndpoint))) ||
      (revocationEndpoint && normalizedUrl.startsWith(normalizeUrl(revocationEndpoint)))
    );
  });
};

export {
  getMatchingOidcConfigurations as getCurrentDatabasesTokenEndpoint,
  isOidcServerRequest,
  shouldBypassNonOidcRequest,
};

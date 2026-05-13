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

const isOidcServerRequest = (database: Database, url: string): boolean => {
  const normalizedUrl = normalizeUrl(url);

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

const shouldBypassNonOidcRequest = (database: Database, url: string): boolean => {
  const configurations = Object.values(database);

  if (
    configurations.length === 0 ||
    !configurations.every(
      config => config.bypassAllNonOidcRequests && config.oidcServerConfiguration,
    )
  ) {
    return false;
  }

  return !isOidcServerRequest(database, url);
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

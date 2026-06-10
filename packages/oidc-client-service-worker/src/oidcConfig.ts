import { acceptAnyDomainToken } from './constants';
import { Database, Domain, OidcConfig, OidcServerConfiguration, TrustedDomains } from './types';
import { getDomains, normalizeUrl } from './utils';

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

const isDomainMatchingUrl = (domain: Domain, normalizedUrl: string): boolean => {
  if (typeof domain === 'string') {
    domain = new RegExp(`^${domain}`);
  }

  return domain.test?.(normalizedUrl) ?? false;
};

const isAccessTokenDomainRequest = (
  database: Database,
  normalizedUrl: string,
  trustedDomains: TrustedDomains,
): boolean => {
  return Object.entries(database).some(([key, currentDatabase]) => {
    if (!currentDatabase.oidcServerConfiguration) {
      return false;
    }

    const trustedDomain = trustedDomains?.[key.split('#')[0]] ?? [];
    const domains = getDomains(trustedDomain, 'accessToken');

    if (domains.some(domain => domain === acceptAnyDomainToken)) {
      return true;
    }

    return domains.some(domain => isDomainMatchingUrl(domain, normalizedUrl));
  });
};

const shouldBypassNonOidcRequest = (
  database: Database,
  normalizedUrl: string,
  trustedDomains: TrustedDomains,
): boolean => {
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

  return (
    !isOidcServerRequest(database, normalizedUrl) &&
    !isAccessTokenDomainRequest(database, normalizedUrl, trustedDomains)
  );
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

const bypassedDestinations = ['image', 'font', 'media', 'document', 'iframe', 'script'];

const shouldBypassDestination = (destination: string, mode: string): boolean => {
  return bypassedDestinations.includes(destination) && mode !== 'navigate';
};

export {
  getMatchingOidcConfigurations as getCurrentDatabasesTokenEndpoint,
  isAccessTokenDomainRequest,
  isOidcServerRequest,
  shouldBypassDestination,
  shouldBypassNonOidcRequest,
};

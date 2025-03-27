import { Database, OidcConfig } from './types';
import { normalizeUrl } from './utils';

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

export { getMatchingOidcConfigurations as getCurrentDatabasesTokenEndpoint };

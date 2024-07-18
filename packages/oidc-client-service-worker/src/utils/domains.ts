import { acceptAnyDomainToken, openidWellknownUrlEndWith, scriptFilename } from '../constants';
import { Database, Domain, DomainDetails, OidcConfig, TrustedDomains } from '../types';
import { normalizeUrl } from './normalizeUrl';

export function checkDomain(domains: Domain[], endpoint: string) {
  if (!endpoint) {
    return;
  }

  const domain = domains.find(domain => {
    let testable: RegExp;

    if (typeof domain === 'string') {
      testable = new RegExp(`^${domain}`);
    } else {
      testable = domain;
    }

    return testable.test?.(endpoint);
  });
  if (!domain) {
    throw new Error(
      'Domain ' + endpoint + ' is not trusted, please add domain in ' + scriptFilename,
    );
  }
}

export const getDomains = (
  trustedDomain: Domain[] | DomainDetails,
  type: 'oidc' | 'accessToken',
) => {
  if (Array.isArray(trustedDomain)) {
    return trustedDomain;
  }

  return trustedDomain[`${type}Domains`] ?? trustedDomain.domains ?? [];
};

export const getCurrentDatabaseDomain = (
  database: Database,
  url: string,
  trustedDomains: TrustedDomains,
) => {
  if (url.endsWith(openidWellknownUrlEndWith)) {
    return null;
  }
  for (const [key, currentDatabase] of Object.entries<OidcConfig>(database)) {
    const oidcServerConfiguration = currentDatabase.oidcServerConfiguration;

    if (!oidcServerConfiguration) {
      continue;
    }

    if (
      oidcServerConfiguration.tokenEndpoint &&
      url === normalizeUrl(oidcServerConfiguration.tokenEndpoint)
    ) {
      continue;
    }
    if (
      oidcServerConfiguration.revocationEndpoint &&
      url === normalizeUrl(oidcServerConfiguration.revocationEndpoint)
    ) {
      continue;
    }
    const trustedDomain = trustedDomains == null ? [] : trustedDomains[key];

    const domains = getDomains(trustedDomain, 'accessToken');
    const domainsToSendTokens = oidcServerConfiguration.userInfoEndpoint
      ? [normalizeUrl(oidcServerConfiguration.userInfoEndpoint), ...domains]
      : [...domains];

    let hasToSendToken = false;
    if (domainsToSendTokens.find(f => f === acceptAnyDomainToken)) {
      hasToSendToken = true;
    } else {
      for (let i = 0; i < domainsToSendTokens.length; i++) {
        let domain = domainsToSendTokens[i];

        if (typeof domain === 'string') {
          domain = new RegExp(`^${domain}`);
        }

        if (domain.test?.(url)) {
          hasToSendToken = true;
          break;
        }
      }
    }

    if (hasToSendToken) {
      if (!currentDatabase.tokens) {
        return null;
      }
      return currentDatabase;
    }
  }
  return null;
};

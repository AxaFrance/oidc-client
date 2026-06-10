import { describe, expect, it } from 'vitest';

import {
  getCurrentDatabasesTokenEndpoint,
  isAccessTokenDomainRequest,
  isOidcServerRequest,
  shouldBypassDestination,
  shouldBypassNonOidcRequest,
} from '../oidcConfig';
import { Database, TrustedDomains } from '../types';

const oidcConfigDefaults = {
  demonstratingProofOfPossessionConfiguration: null,
  configurationName: '',
  tokens: null,
  status: null,
  state: null,
  codeVerifier: null,
  nonce: null,
  hideAccessToken: false,
  convertAllRequestsToCorsExceptNavigate: true,
  setAccessTokenToNavigateRequests: true,
  demonstratingProofOfPossessionNonce: null,
  demonstratingProofOfPossessionJwkJson: null,
  demonstratingProofOfPossessionOnlyWhenDpopHeaderPresent: false,
  allowMultiTabLogin: true,
  bypassAllNonOidcRequests: false,
};

const oidcServerConfigDefault = {
  revocationEndpoint: '',
  tokenEndpoint: '',
  issuer: '',
  userInfoEndpoint: '',
  authorizationEndpoint: '',
};

describe('getCurrentDatabasesTokenEndpoint', () => {
  it('should return configs with matching token endpoint', () => {
    const database: Database = {
      config1: {
        ...oidcConfigDefaults,
        oidcServerConfiguration: {
          ...oidcServerConfigDefault,
          tokenEndpoint: 'https://example.com/token',
        },
      },
      config2: {
        ...oidcConfigDefaults,
        oidcServerConfiguration: {
          ...oidcServerConfigDefault,
          tokenEndpoint: 'https://example.org/token',
        },
      },
      config3: {
        ...oidcConfigDefaults,
        oidcServerConfiguration: {
          ...oidcServerConfigDefault,
          revocationEndpoint: 'https://example.net/revoke',
        },
      },
    };

    const url = 'https://example.com/token';
    const result = getCurrentDatabasesTokenEndpoint(database, url);

    expect(result).toHaveLength(1);
    expect(result[0]).toBe(database.config1);
  });

  it('should return configs with matching revocation endpoint', () => {
    const database = {
      config1: {
        ...oidcConfigDefaults,
        oidcServerConfiguration: {
          ...oidcServerConfigDefault,
          revocationEndpoint: 'https://example.com/revoke',
        },
      },
      config2: {
        ...oidcConfigDefaults,
        oidcServerConfiguration: {
          ...oidcServerConfigDefault,
          revocationEndpoint: 'https://example.org/revoke',
        },
      },
      config3: {
        ...oidcConfigDefaults,
        oidcServerConfiguration: {
          ...oidcServerConfigDefault,
          tokenEndpoint: 'https://example.net/token',
        },
      },
    };

    const url = 'https://example.com/revoke';
    const result = getCurrentDatabasesTokenEndpoint(database, url);

    expect(result).toHaveLength(1);
    expect(result[0]).toBe(database.config1);
  });

  it('should return multiple matching configs', () => {
    const database = {
      config1: {
        ...oidcConfigDefaults,
        oidcServerConfiguration: {
          ...oidcServerConfigDefault,
          tokenEndpoint: 'https://example.com/token',
          revocationEndpoint: 'https://example.com/revoke',
        },
      },
      config2: {
        ...oidcConfigDefaults,
        oidcServerConfiguration: {
          ...oidcServerConfigDefault,
          tokenEndpoint: 'https://example.org/token',
        },
      },
      config3: {
        ...oidcConfigDefaults,
        oidcServerConfiguration: {
          ...oidcServerConfigDefault,
          tokenEndpoint: 'https://example.com/token',
          revocationEndpoint: 'https://example.com/revoke',
        },
      },
    };

    const url = 'https://example.com/token';
    const result = getCurrentDatabasesTokenEndpoint(database, url);

    expect(result).toHaveLength(2);
    expect(result).toContain(database.config1);
    expect(result).toContain(database.config3);
  });

  it('should return empty array for no matching configs', () => {
    const database = {
      config1: {
        ...oidcConfigDefaults,
        oidcServerConfiguration: {
          ...oidcServerConfigDefault,
          tokenEndpoint: 'https://example.com/token',
        },
      },
      config2: {
        ...oidcConfigDefaults,
        oidcServerConfiguration: {
          ...oidcServerConfigDefault,
          revocationEndpoint: 'https://example.org/revoke',
        },
      },
    };

    const url = 'https://example.net/other';
    const result = getCurrentDatabasesTokenEndpoint(database, url);

    expect(result).toHaveLength(0);
  });
});

describe('shouldBypassNonOidcRequest', () => {
  const database: Database = {
    config1: {
      ...oidcConfigDefaults,
      bypassAllNonOidcRequests: true,
      oidcServerConfiguration: {
        ...oidcServerConfigDefault,
        issuer: 'https://oidc.example.com',
        authorizationEndpoint: 'https://oidc.example.com/connect/authorize',
        tokenEndpoint: 'https://oidc.example.com/connect/token',
        revocationEndpoint: 'https://oidc.example.com/connect/revoke',
        userInfoEndpoint: 'https://oidc.example.com/connect/userinfo',
      },
    },
  };

  it('should bypass non-OIDC requests when enabled', () => {
    expect(shouldBypassNonOidcRequest(database, 'https://api.example.com/users', null)).toBe(true);
  });

  it.each([
    'https://oidc.example.com/.well-known/openid-configuration',
    'https://oidc.example.com/connect/authorize',
    'https://oidc.example.com/connect/token',
    'https://oidc.example.com/connect/revoke',
    'https://oidc.example.com/connect/userinfo',
  ])('should never bypass OIDC server request %s', url => {
    expect(isOidcServerRequest(database, url)).toBe(true);
    expect(shouldBypassNonOidcRequest(database, url, null)).toBe(false);
  });

  it('should keep existing behavior when disabled', () => {
    expect(
      shouldBypassNonOidcRequest(
        {
          config1: {
            ...database.config1,
            bypassAllNonOidcRequests: false,
          },
        },
        'https://api.example.com/users',
        null,
      ),
    ).toBe(false);
  });

  it('should keep existing behavior until OIDC server configuration is initialized', () => {
    expect(
      shouldBypassNonOidcRequest(
        {
          config1: {
            ...oidcConfigDefaults,
            bypassAllNonOidcRequests: true,
            oidcServerConfiguration: null,
          },
        },
        'https://api.example.com/users',
        null,
      ),
    ).toBe(false);
  });

  it('should keep accessTokenDomains requests intercepted when bypass is enabled', () => {
    const trustedDomains: TrustedDomains = {
      config1: {
        accessTokenDomains: ['https://api.example.com'],
        showAccessToken: false,
      },
    };

    expect(
      isAccessTokenDomainRequest(database, 'https://api.example.com/users', trustedDomains),
    ).toBe(true);
    expect(
      shouldBypassNonOidcRequest(database, 'https://api.example.com/users', trustedDomains),
    ).toBe(false);
  });

  it('should keep domains fallback requests intercepted when bypass is enabled', () => {
    const trustedDomains: TrustedDomains = {
      config1: {
        domains: ['https://api.example.com'],
        showAccessToken: false,
      },
    };

    expect(
      shouldBypassNonOidcRequest(database, 'https://api.example.com/users', trustedDomains),
    ).toBe(false);
  });

  it('should keep existing behavior unless all initialized configurations enable bypass', () => {
    expect(
      shouldBypassNonOidcRequest(
        {
          ...database,
          config2: {
            ...oidcConfigDefaults,
            oidcServerConfiguration: {
              ...oidcServerConfigDefault,
              issuer: 'https://other-oidc.example.com',
            },
          },
        },
        'https://api.example.com/users',
        null,
      ),
    ).toBe(false);
  });
});

describe('shouldBypassDestination', () => {
  it('should bypass image requests with non-navigate mode', () => {
    expect(shouldBypassDestination('image', 'no-cors')).toBe(true);
  });

  it('should bypass font requests with non-navigate mode', () => {
    expect(shouldBypassDestination('font', 'cors')).toBe(true);
  });

  it('should bypass document requests with non-navigate mode', () => {
    expect(shouldBypassDestination('document', 'cors')).toBe(true);
  });

  it('should NOT bypass document requests with navigate mode', () => {
    expect(shouldBypassDestination('document', 'navigate')).toBe(false);
  });

  it('should NOT bypass requests with navigate mode even for other bypassed destinations', () => {
    expect(shouldBypassDestination('iframe', 'navigate')).toBe(false);
    expect(shouldBypassDestination('script', 'navigate')).toBe(false);
  });

  it('should NOT bypass non-listed destinations', () => {
    expect(shouldBypassDestination('', 'cors')).toBe(false);
    expect(shouldBypassDestination('worker', 'same-origin')).toBe(false);
  });

  it('should bypass media requests with non-navigate mode', () => {
    expect(shouldBypassDestination('media', 'no-cors')).toBe(true);
  });
});

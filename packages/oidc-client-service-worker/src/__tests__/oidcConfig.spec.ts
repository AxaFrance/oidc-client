import { describe, expect, it } from 'vitest';

import { getCurrentDatabasesTokenEndpoint } from '../oidcConfig';
import { Database } from '../types';

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

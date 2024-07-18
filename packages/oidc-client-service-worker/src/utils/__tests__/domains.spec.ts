import { beforeEach, describe, expect, it } from 'vitest';

import { openidWellknownUrlEndWith } from '../../constants';
import { Database, Tokens, TrustedDomains } from '../../types';
import { checkDomain, getCurrentDatabaseDomain } from '..';

describe('domains', () => {
  describe('can check domain matches', () => {
    it('can check string domains without throwing an exception', () => {
      expect(() => {
        checkDomain(['https://securesite.com:3000'], 'https://securesite.com:3000');
      }).not.toThrow();
    });

    it('can check regExp domains without throwing an exception when valid', () => {
      expect(() => {
        checkDomain([/^https:\/\/securesite\.com/], 'https://securesite.com:3000');
      }).not.toThrow();
    });

    it('will throw error when domain is not trusted', () => {
      const result = () =>
        checkDomain(['https://notsecuresite.com'], 'https://securesite.com:3000');
      expect(result).toThrowError();
    });

    it('will not throw an exception when endpoint is falsy', () => {
      expect(() => {
        checkDomain(['https://securesite.com:3000'], '');
      }).not.toThrow();
    });
  });
  describe('getCurrentDatabaseDomain', () => {
    let db: Database;

    beforeEach(() => {
      db = {
        default: {
          configurationName: 'config',
          tokens: {} as Tokens,
          status: 'NOT_CONNECTED',
          state: {},
          codeVerifier: {},
          nonce: {},
          oidcServerConfiguration: {
            authorizationEndpoint: 'https://demo.duendesoftware.com/connect/authorize',
            issuer: 'https://demo.duendesoftware.com',
            revocationEndpoint: 'https://demo.duendesoftware.com/connect/revocation',
            tokenEndpoint: 'https://demo.duendesoftware.com/connect/token',
            userInfoEndpoint: 'https://demo.duendesoftware.com/connect/userinfo',
          },
          hideAccessToken: true,
          convertAllRequestsToCorsExceptNavigate: false,
          setAccessTokenToNavigateRequests: true,
          demonstratingProofOfPossessionNonce: null,
          demonstratingProofOfPossessionJwkJson: null,
          demonstratingProofOfPossessionConfiguration: null,
          demonstratingProofOfPossessionOnlyWhenDpopHeaderPresent: false,
          allowMultiTabLogin: true,
        },
      };
    });

    it('will return null when url ends with openidWellknownUrlEndWith', () => {
      const trustedDomains: TrustedDomains = {
        default: ['https://demo.duendesoftware.com', 'https://kdhttps.auth0.com'],
      };
      const url = 'http://url' + openidWellknownUrlEndWith;
      expect(getCurrentDatabaseDomain(db, url, trustedDomains)).toBeNull();
    });

    it('will return null when url is the token endpoint', () => {
      const trustedDomains: TrustedDomains = {
        default: ['https://demo.duendesoftware.com', 'https://kdhttps.auth0.com'],
      };
      const url = 'https://demo.duendesoftware.com/connect/token';
      expect(getCurrentDatabaseDomain(db, url, trustedDomains)).toBeNull();
    });

    it('will return null when url is the token endpoint oidc config token endpoint has a default port', () => {
      const trustedDomains: TrustedDomains = {
        default: ['https://demo.duendesoftware.com', 'https://kdhttps.auth0.com'],
      };
      db['default'].oidcServerConfiguration!.tokenEndpoint =
        'https://demo.duendesoftware.com:443/connect/token';

      const url = 'https://demo.duendesoftware.com/connect/token';
      expect(getCurrentDatabaseDomain(db, url, trustedDomains)).toBeNull();
    });

    it('will return null when url is the revocation endpoint', () => {
      const trustedDomains: TrustedDomains = {
        default: ['https://demo.duendesoftware.com', 'https://kdhttps.auth0.com'],
      };
      const url = 'https://demo.duendesoftware.com/connect/revocation';
      expect(getCurrentDatabaseDomain(db, url, trustedDomains)).toBeNull();
    });

    it('will not return null when url is the userinfo endpoint', () => {
      const trustedDomains: TrustedDomains = {
        default: ['https://demo.duendesoftware.com', 'https://kdhttps.auth0.com'],
      };
      const url = 'https://demo.duendesoftware.com/connect/userinfo';
      expect(getCurrentDatabaseDomain(db, url, trustedDomains)).not.toBeNull();
    });

    it('will not return null, url is the userinfo endpoint on other domain, default port is set', () => {
      db['default'].oidcServerConfiguration!.userInfoEndpoint =
        'https://otherdomain.com:443/connect/userinfo';

      const url = 'https://otherdomain.com/connect/userinfo';
      expect(getCurrentDatabaseDomain(db, url, null)).not.toBeNull();
    });

    it('will test urls against domains list if accessTokenDomains list is not present', () => {
      const trustedDomains: TrustedDomains = {
        default: {
          domains: ['https://domain'],
          showAccessToken: false,
        },
      };

      expect(getCurrentDatabaseDomain(db, 'https://domain/test', trustedDomains)).toBe(db.default);
    });

    it('will test urls against accessTokenDomains list if it is present and ignore domains list', () => {
      const trustedDomains: TrustedDomains = {
        default: {
          domains: ['https://domain'],
          accessTokenDomains: ['https://myapi'],
          showAccessToken: false,
        },
      };

      expect(getCurrentDatabaseDomain(db, 'https://myapi/test', trustedDomains)).toBe(db.default);
      expect(getCurrentDatabaseDomain(db, 'https://domain/test', trustedDomains)).toBeNull();
    });
  });
});

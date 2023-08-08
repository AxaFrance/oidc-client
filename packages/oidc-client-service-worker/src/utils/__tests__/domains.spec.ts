import { describe, expect, it } from 'vitest';

import { openidWellknownUrlEndWith } from '../../constants';
import { checkDomain, getCurrentDatabaseDomain } from '..';
import { Database, OidcServerConfiguration, Tokens, TrustedDomains } from './../../types';

describe('domains', () => {
  describe('can check domain matches', () => {
    it('can check string domains and return void', () => {
      const result = () =>
        checkDomain(
          ['https://securesite.com:3000'],
          'https://securesite.com:3000',
        );
      expect(result()).toBeUndefined();
    });

    it('can check regExp domains and return void when valid', () => {
      const result = () =>
        checkDomain(
          [/^https:\/\/securesite\.com/],
          'https://securesite.com:3000',
        );
      expect(result()).toBeUndefined();
    });

    it('will throw error when domain is not trusted', () => {
      const result = () =>
        checkDomain(
          ['https://notsecuresite.com'],
          'https://securesite.com:3000',
        );
      expect(result).toThrowError();
    });

    it('will return void when endpoint is falsy', () => {
      const result = () => checkDomain(['https://securesite.com:3000'], '');
      expect(result()).toBeUndefined();
    });
  });
  describe('getCurrentDatabaseDomain', () => {
    const db: Database = {
      default: {
        configurationName: 'config',
        tokens: {} as Tokens,
        status: 'NOT_CONNECTED',
        state: null,
        codeVerifier: null,
        nonce: null,
        oidcServerConfiguration: {} as OidcServerConfiguration,
        hideAccessToken: true,
        convertAllRequestsToCorsExceptNavigate: false,
        setAccessTokenToNavigateRequests: true,
      },
    };

    it('will return null when url ends with openidWellknownUrlEndWith', () => {
      const trustedDomains: TrustedDomains = {
        default: [
          'https://demo.duendesoftware.com',
          'https://kdhttps.auth0.com',
        ],
      };
      const url = 'http://url' + openidWellknownUrlEndWith;
      expect(getCurrentDatabaseDomain(db, url, trustedDomains)).toBeNull();
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

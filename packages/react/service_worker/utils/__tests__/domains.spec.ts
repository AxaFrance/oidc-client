import { TrustedDomains, Database } from './../../types';
import { describe, it, expect } from 'vitest';
import { checkDomain, getCurrentDatabaseDomain } from '..';
import { openidWellknownUrlEndWith } from '../../constants';

describe('domains', () => {
  describe('can check domain matches', () => {
    it('can check string domains and return void', () => {
      const result = () =>
        checkDomain(
          ['https://securesite.com:3000'],
          'https://securesite.com:3000'
        );
      expect(result()).toBeUndefined();
    });

    it('can check regExp domains and return void when valid', () => {
      const result = () =>
        checkDomain(
          [/^https:\/\/securesite\.com/],
          'https://securesite.com:3000'
        );
      expect(result()).toBeUndefined();
    });

    it('will throw error when domain is not trusted', () => {
      const result = () =>
        checkDomain(
          ['https://notsecuresite.com'],
          'https://securesite.com:3000'
        );
      expect(result).toThrowError();
    });

    it('will return void when endpoint is falsy', () => {
      const result = () => checkDomain(['https://securesite.com:3000'], '');
      expect(result()).toBeUndefined();
    });
  });
  describe('getCurrentDatabaseDomain', () => {
    it('will return null when url ends with openidWellknownUrlEndWith', () => {
      const trustedDomains: TrustedDomains = {
        default: [
          'https://demo.duendesoftware.com',
          'https://kdhttps.auth0.com',
        ],
      };
      const db: Database = {
        default: {
          configurationName: 'config',
          tokens: null,
          status: 'NOT_CONNECTED',
          state: null,
          codeVerifier: null,
          nonce: null,
          oidcServerConfiguration: null,
        },
      };
      const url = 'http://url' + openidWellknownUrlEndWith;
      getCurrentDatabaseDomain(db, url, trustedDomains);
    });
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { OidcServerConfiguration } from '../../types';
import { extractTokenPayload, isTokensOidcValid, isTokensValid } from '..';
import { OidcServerConfigBuilder, TokenBuilder } from './testHelper';

describe('tokens', () => {
  let oidcServerConfig: OidcServerConfiguration;

  beforeEach(() => {
    oidcServerConfig = new OidcServerConfigBuilder()
      .withTestingDefault()
      .build();
  });

  describe('isTokensValid', () => {
    it('can check expired token', () => {
      expect(
        isTokensValid(new TokenBuilder().withExpiredToken().build())
      ).toBeFalsy();
    });

    it('can check non-expired token', () => {
      const token = new TokenBuilder().WithNonExpiredToken().build();
      expect(isTokensValid(token)).toBeTruthy();
    });

    it('can check null token', () => {
      expect(isTokensValid(null)).toBeFalsy();
    });
  });

  describe('extractTokenPayload', () => {
    it('can extract token payload', () => {
      const result = extractTokenPayload(
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
      );
      expect(result).toEqual({
        sub: '1234567890',
        name: 'John Doe',
        iat: 1516239022,
      });
    });
    it('returns null if undefined', () => {
      expect(extractTokenPayload(undefined)).toBeNull();
    });

    it('returns null if invalid token', () => {
      expect(extractTokenPayload('invalid token')).toBeNull();
    });
  });

  describe('isTokensOidcValid', () => {
    it('can validate valid token', () => {
      const token = new TokenBuilder()
        .WithNonExpiredToken()
        .withIdTokenPayload({
          iss: oidcServerConfig.issuer,
          exp: 0,
          iat: 0,
          nonce: null,
        })
        .build();
      const result = isTokensOidcValid(token, null, oidcServerConfig);
      expect(result.isValid).toBeTruthy();
      expect(result.reason).toBe('');
    });
  });
});

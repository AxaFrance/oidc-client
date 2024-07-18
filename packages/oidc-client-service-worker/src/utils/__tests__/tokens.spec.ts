import { beforeEach, describe, expect, it } from 'vitest';

import { OidcServerConfiguration } from '../../types';
import { _hideTokens, extractTokenPayload, isTokensOidcValid, isTokensValid, parseJwt } from '..';
import { OidcConfigBuilder, OidcServerConfigBuilder, TokenBuilder } from './testHelper';

describe('tokens', () => {
  let oidcServerConfig: OidcServerConfiguration;

  beforeEach(() => {
    oidcServerConfig = new OidcServerConfigBuilder().withTestingDefault().build();
  });

  describe('isTokensValid', () => {
    it('can check expired token', () => {
      expect(isTokensValid(new TokenBuilder().withExpiredToken().build())).toBeFalsy();
    });

    it('can check non-expired token', () => {
      const token = new TokenBuilder().withNonExpiredToken().build();
      expect(isTokensValid(token)).toBeTruthy();
    });

    it('can check null token', () => {
      expect(isTokensValid(null)).toBeFalsy();
    });
  });

  describe.each([
    [
      'eyJzZXNzaW9uX3N0YXRlIjoiNzVjYzVlZDItZGYyZC00NTY5LWJmYzUtMThhOThlNjhiZTExIiwic2NvcGUiOiJvcGVuaWQgZW1haWwgcHJvZmlsZSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJuYW1lIjoixrTHosOBw6zDhyDlsI_lkI0t44Ob44Or44OYIiwicHJlZmVycmVkX3VzZXJuYW1lIjoidGVzdGluZ2NoYXJhY3RlcnNAaW52ZW50ZWRtYWlsLmNvbSIsImdpdmVuX25hbWUiOiLGtMeiw4HDrMOHIiwiZmFtaWx5X25hbWUiOiLlsI_lkI0t44Ob44Or44OYIn0',
      {
        session_state: '75cc5ed2-df2d-4569-bfc5-18a98e68be11',
        scope: 'openid email profile',
        email_verified: true,
        name: 'ƴǢÁìÇ 小名-ホルヘ',
        preferred_username: 'testingcharacters@inventedmail.com',
        given_name: 'ƴǢÁìÇ',
        family_name: '小名-ホルヘ',
      },
    ],
    [
      'eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCI_IjoiYWE_In0',
      {
        '?': 'aa?',
        iat: 1516239022,
        name: 'John Doe',
        sub: '1234567890',
      },
    ],
  ])('parseJwtShouldExtractData', (claimsPart, expectedResult) => {
    it('should parseJwtShouldExtractData ', async () => {
      const result = parseJwt(claimsPart);
      expect(expectedResult).toStrictEqual(result);
    });
  });

  describe('extractTokenPayload', () => {
    it('can extract token payload', () => {
      const result = extractTokenPayload(
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
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
        .withNonExpiredToken()
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

  describe('_hideTokens', () => {
    it.each([
      {
        hideAccessToken: true,
        expectedAccessToken: 'ACCESS_TOKEN_SECURED_BY_OIDC_SERVICE_WORKER_test_tab1',
        issued_at: '0',
        expires_in: '2',
      },
      {
        hideAccessToken: false,
        expectedAccessToken: 'test_access_token',
        issued_at: 0,
        expires_in: 2,
      },
    ])(
      'accesstoken will be hide $hideAccessToken result should be $expectedAccessToken',
      ({ hideAccessToken, expectedAccessToken, issued_at, expires_in }) => {
        const token = new TokenBuilder()
          .withIdTokenPayload({
            iss: oidcServerConfig.issuer,
            exp: 0,
            iat: 0,
            nonce: null,
          })
          .withNonExpiredToken()
          .withAccessToken('test_access_token')
          .withExpiresIn(expires_in)
          .withIssuedAt(issued_at)
          .build();
        const oidcConfiguration = new OidcConfigBuilder()
          .withTestingDefault()
          .withHideAccessToken(hideAccessToken)
          .build();
        const secureTokens = _hideTokens(token, oidcConfiguration, 'test', 'tab1');
        expect(secureTokens.access_token).toBe(expectedAccessToken);
        expect(typeof secureTokens.expiresAt).toBe('number');
      },
    );

    it('should reuse old id_token', () => {
      const token = new TokenBuilder().withNonExpiredToken().build();
      // @ts-ignore
      delete token.id_token;
      // @ts-ignore
      delete token.idTokenPayload;
      const oidcConfiguration = new OidcConfigBuilder()
        .withOidcConfiguration({
          token_renew_mode: 'access_token_invalid',
          demonstrating_proof_of_possession: false,
        })
        .withOidcServerConfiguration({
          issuer: '',
          authorizationEndpoint: '',
          revocationEndpoint: '',
          tokenEndpoint: '',
          userInfoEndpoint: '',
        })
        .withTokens(
          new TokenBuilder()
            .withNonExpiredToken()
            .withIdToken('old_id_token')
            .withIdTokenPayload({
              iss: oidcServerConfig.issuer,
              exp: 0,
              iat: 0,
              nonce: null,
            })
            .build(),
        )
        .build();
      _hideTokens(token, oidcConfiguration, 'test', 'tab1');
      expect(token.id_token).toBe('old_id_token');
    });
  });
});

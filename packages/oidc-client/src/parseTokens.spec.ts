import { describe, expect, it } from 'vitest';

import { sleepAsync } from './initWorker';
import {
  getValidTokenAsync,
  isTokensOidcValid,
  parseJwt,
  parseOriginalTokens,
  setTokens,
  TokenRenewMode,
} from './parseTokens';
import { StringMap, TokenAutomaticRenewMode } from './types';

describe('ParseTokens test Suite', () => {
  const currentTimeUnixSecond = new Date().getTime() / 1000;
  describe.each([
    [currentTimeUnixSecond + 120, currentTimeUnixSecond - 10, true],
    [currentTimeUnixSecond - 20, currentTimeUnixSecond - 50, false],
  ])('getValidTokenAsync', (expiresAt, issuedAt, expectIsValidToken) => {
    it('should getValidTokenAsync wait and return value', async () => {
      const oidc = {
        tokens: {
          refreshToken: 'youhou',
          idTokenPayload: null,
          idToken: 'youhou',
          accessTokenPayload: null,
          accessToken: 'youhou',
          expiresAt,
          issuedAt,
        },
        configuration: {
          token_automatic_renew_mode: TokenAutomaticRenewMode.AutomaticBeforeTokenExpiration,
          refresh_time_before_tokens_expiration_in_second: 0,
        },
        renewTokensAsync: async (_extras: StringMap) => {
          await sleepAsync({ milliseconds: 10 });
        },
      };
      const result = await getValidTokenAsync(oidc, 1, 1);
      expect(result.isTokensValid).toEqual(expectIsValidToken);
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

  const id_token =
    'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImtpZCI6IjUwNWZkODljLTM4YzktNGI2Mi04ZjQ3LWI4MGQ0ZTNhYjYxNSJ9.eyJpc3MiOiJodHRwOlwvXC9sb2NhbGhvc3Q6ODA4MCIsInN1YiI6ImFkbWluIiwiYXVkIjoiM2FTbk5XUGxZQWQwOGVES3c1UUNpSWVMcWpIdHkxTTVzSGFzcDJDZWREcWYzbmJkZm8xUFo1cXhmbWoyaFhkUyIsImV4cCI6MTY5MDk4NzQ1NCwiYXV0aF90aW1lIjoxNjkwOTg2NTUxLCJpYXQiOjE2OTA5ODY1NTQsImFjciI6IjAiLCJhenAiOiIzYVNuTldQbFlBZDA4ZURLdzVRQ2lJZUxxakh0eTFNNXNIYXNwMkNlZERxZjNuYmRmbzFQWjVxeGZtajJoWGRTIiwicHJlZmVycmVkX3VzZXJuYW1lIjoiYWRtaW4iLCJzY29wZSI6Im9wZW5pZCBwcm9maWxlIGdyb3VwcyBvZmZsaW5lX2FjY2VzcyIsIm5iZiI6MTY5MDk4NjU1NCwianRpIjoiNjMiLCJub25jZSI6ImNpQkVVOTdaVmRWVSIsImdyb3VwcyI6WyJhZG1pbiJdLCJuYW1lIjoiQWRtaW5pc3RyYXRvciIsInVwZGF0ZWRfYXQiOjE2OTA5ODY1NDV9.2MUdtQR_QtzDY9BTMctG8C4uvg92DgMIUUoJed2cI7WTd5_VEPFW87esDQLw4snVdAJM1_Wf3wB88B2MXFDMCnMTNn0TMnzetRDiG3xlr2LL-geL5SNgwD0Y6RPK_aITjrC9uiQCTj3LPEENrBulNRZPURwaVon9WUVNuuBmMTKd7QKEuFN0zYDoRs0HnXo6WKnFy1rldLGh_JpA3PBUuXt4VMjfGQ7yYEuNn7MkFVDX6OnTffR8jTQp74hREvuRLFjYxfgfgu547X7yIcboOl81D0ZQlP-gfvBOeypZolRLScuqAA3fHBYvE0vCtOM6ObekfeeTDfms75csMLUuZtTR07x32xYC8vdoFsY0sRpMByTqlhsae9VX_rETJ7PIWEfruojzcj47WN9dG0K3pdPiJHEwZ1CKgZfU_cY0gtuAGaIcIjKL0txXCevaiIiIsrgSU_HTjNVybp4WHSAs3h6x0XLz4_91luCylsaoMQbwKOQNwAfr2L74jF6DOg-8DIPb-WClRQzaQtrkx_iv6FtqCB3ogFoZwi6xljdYUc2EHUmoAo-LXal-QAgUXGGzfFU2YOpxV3RyAbMGPm7PfkMVzDsDJwORJNhh38QQ6o88GgNnV28BT-d2G0n7okc0QC6o2IW0jpyCrI6v0hWOBUX2EqiJ5Wao-4LYZfCaRgU';
  const refresh_token =
    'DEsqDca7nDGSgT6tJPkCwbPy98B8VOC4AA55lOPs03G3hqhZ8WH08REBcwTZg1s0jZyVoA3iCXzm4PPJ096gjV7ZKYyN8vnFKw6P6KLV3tUI6mWFaSROoh1LipThFrkS';
  const access_token = 'opqavdgHEYx8nhCdc3iByd1HD0jiYN30LevhJy4f5wIavINXKdh4lQ9C3kA49QF0OH0XeA02';
  describe.each([
    [
      {
        access_token: access_token,
        token_type: 'Bearer',
        expires_in: '900', // Here a string instead of a number
        refresh_token: refresh_token,
        id_token: id_token,
      },
    ],
    [
      {
        access_token: access_token,
        token_type: 'Bearer',
        expires_in: 900,
        refresh_token: refresh_token,
        id_token: id_token,
      },
    ],
    [
      {
        access_token: access_token,
        token_type: 'Bearer',
        expires_in: 900,
        expiresAt: 1609987454, // Here expiresAt that come from Service Worker
        refresh_token: refresh_token,
        id_token: id_token,
      },
    ],
  ])('getValidTokenAsync', tokens => {
    it('should parseOriginalTokens', async () => {
      // @ts-ignore
      const result = parseOriginalTokens(tokens);
      expect(typeof result.issuedAt).toEqual('number');
    });
  });

  const idTokenPayload = {
    iss: 'toto',
    exp: currentTimeUnixSecond + 900,
    iat: currentTimeUnixSecond - 900,
    nonce: 'nonce',
  };
  const oidcServerConfiguration = { issuer: 'toto' };
  const idTokenPayloadExpired = { ...idTokenPayload, exp: currentTimeUnixSecond - 20 };
  const idTokenPayloadIssuedTooLongTimeAgo = {
    ...idTokenPayload,
    iat: currentTimeUnixSecond - 20000000,
  };

  describe.each([
    [idTokenPayload, 'nonce', oidcServerConfiguration, true, 'success'],
    [idTokenPayload, 'other_nonce', oidcServerConfiguration, false, 'bad nonce'],
    [idTokenPayload, 'nonce', { issuer: 'tutu' }, false, 'different issuer'],
    [idTokenPayloadExpired, 'nonce', oidcServerConfiguration, false, 'id token expired issuer'],
    [
      idTokenPayloadIssuedTooLongTimeAgo,
      'nonce',
      oidcServerConfiguration,
      false,
      'id token expired issuer',
    ],
  ])(
    'isTokensOidcValid',
    (idTokenPayload, nonce, oidcServerConfiguration, expectIsValidToken, status) => {
      it('should isTokensOidcValid return ' + status, async () => {
        const oidc = {
          idTokenPayload,
        };
        const { isValid } = isTokensOidcValid(oidc, nonce, oidcServerConfiguration);
        expect(isValid).toEqual(expectIsValidToken);
      });
    },
  );

  const testTokens = {
    id_token:
      'eyJhbGciOiJSUzI1NiIsImtpZCI6IkMyNTJGOUNBQjc3Q0MxNTQwNTBFMTg1NTk5MjJCMTJGIiwidHlwIjoiSldUIn0.eyJpc3MiOiJodHRwczovL2RlbW8uZHVlbmRlc29mdHdhcmUuY29tIiwibmJmIjoxNzA2NTQwMjU4LCJpYXQiOjE3MDY1NDAyNTgsImV4cCI6MTcwNjU0MDU1OCwiYXVkIjoiaW50ZXJhY3RpdmUucHVibGljLnNob3J0IiwiYW1yIjpbInB3ZCJdLCJub25jZSI6IlA5dEo5eGxHZE05NiIsImF0X2hhc2giOiJOWnZhR0dZYlhoelRNWlVxUjlNYk5nIiwic2lkIjoiMzQ1QUJDODhFNkU1MEFGMTI3M0VENDE1QTdGRDZBMjMiLCJzdWIiOiIyIiwiYXV0aF90aW1lIjoxNzA2NTMxNjY1LCJpZHAiOiJsb2NhbCJ9.MVtXrCkshJFBplbOw7az3fdWB1Ewqixb2fuHXpx7KbGWUY6qgT9ijlldeD-ZV7JGA958AKqmGwfNjovAJE89pQsCFKkNft6fRO8eM9qKif6eRUqMMPiQrawARpuJOs1NvJ-SyeRs_jSNLwPVzI8NlZyFWHoyQ4DZnFoQLSQMy5UaHaCtWhC_FrWMFLQvbE3RuMlnJGzrsoMewFyVAZctMCTE1MOI3Akvhe1IGc1hmxzwNg3OkxwzHLinsDlDw8UVn8vX5iNI18GFuyTuJlawOq5OHHJH3LdKQD_RbwRF-9BFjKRZfWzGpdpxTD2lIPf1Irc3U_R6xCNuXYUwzrHp6Q',
    access_token: 'ACCESS_TOKEN_SECURED_BY_OIDC_SERVICE_WORKER_default',
    expires_in: 75,
    token_type: 'Bearer',
    refresh_token: 'REFRESH_TOKEN_SECURED_BY_OIDC_SERVICE_WORKER_default',
    scope: 'openid profile email api offline_access',
    issued_at: 1706540256.465,
    accessTokenPayload: {
      iss: 'https://demo.duendesoftware.com',
      nbf: 1706540258,
      iat: 1706540258,
      exp: 1706540333,
      aud: 'api',
      scope: ['openid', 'profile', 'email', 'api', 'offline_access'],
      amr: ['pwd'],
      client_id: 'interactive.public.short',
      sub: '2',
      auth_time: 1706531665,
      idp: 'local',
      name: 'Bob Smith',
      email: 'BobSmith@email.com',
      sid: '345ABC88E6E50AF1273ED415A7FD6A23',
      jti: 'E3CF3853D77AC90ABC774266CD381C43',
    },
    idTokenPayload: {
      iss: 'https://demo.duendesoftware.com',
      nbf: 1706540258,
      iat: 1706540258,
      exp: 1706540558,
      aud: 'interactive.public.short',
      amr: ['pwd'],
      nonce: 'NONCE_SECURED_BY_OIDC_SERVICE_WORKER_default',
      at_hash: 'NZvaGGYbXhzTMZUqR9MbNg',
      sid: '345ABC88E6E50AF1273ED415A7FD6A23',
      sub: '2',
      auth_time: 1706531665,
      idp: 'local',
    },
    expiresAt: 1706540333,
  };

  describe.each([
    [testTokens, null, TokenRenewMode.access_token_invalid, () => {}],
    [
      testTokens,
      { testTokens, idTokenPayload: undefined, id_token: undefined },
      TokenRenewMode.access_token_invalid,
      (newTokens: any) => {
        expect(newTokens.idTokenPayload).toBeDefined();
        expect(newTokens.id_token).toBeDefined();
      },
    ],
  ])('setTokens', (tokens, oldTokens, tokenRenewMode, validationFunction) => {
    it('should setTokens return updatedTokens', async () => {
      const newTokens = setTokens(tokens, oldTokens, tokenRenewMode);
      validationFunction(newTokens);
    });
  });
});

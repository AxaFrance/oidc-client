// import '@testing-library/jest-dom';

import { describe, expect, it, vi } from 'vitest';

import { ILOidcLocation } from './location';
import { logoutAsync } from './logout';

describe('Logout test suite', () => {
  const expectedFinalUrl =
    'http://api/connect/endsession?id_token_hint=abcd&post_logout_redirect_uri=http%3A%2F%2Flocalhost%3A4200%2Flogged_out';
  it.each([
    {
      logout_tokens_to_invalidate: ['access_token', 'refresh_token'],
      extras: null,
      expectedResults: [
        'token=abcd&token_type_hint=access_token&client_id=interactive.public.short',
        'token=abdc&token_type_hint=refresh_token&client_id=interactive.public.short',
      ],
      expectedFinalUrl,
    },
    {
      logout_tokens_to_invalidate: ['refresh_token'],
      extras: null,
      expectedResults: [
        'token=abdc&token_type_hint=refresh_token&client_id=interactive.public.short',
      ],
      expectedFinalUrl,
    },
    {
      logout_tokens_to_invalidate: ['access_token'],
      extras: null,
      expectedResults: [
        'token=abcd&token_type_hint=access_token&client_id=interactive.public.short',
      ],
      expectedFinalUrl,
    },
    { logout_tokens_to_invalidate: [], extras: null, expectedResults: [], expectedFinalUrl },
    {
      logout_tokens_to_invalidate: [],
      extras: { id_token_hint: undefined },
      expectedResults: [],
      expectedFinalUrl:
        'http://api/connect/endsession?post_logout_redirect_uri=http%3A%2F%2Flocalhost%3A4200%2Flogged_out',
    },
    {
      logout_tokens_to_invalidate: [],
      extras: { 'no_reload:oidc': 'true' },
      expectedResults: [],
      expectedFinalUrl: '',
    },
    {
      logout_tokens_to_invalidate: ['refresh_token'],
      extras: { 'client_secret:revoke_refresh_token': 'secret' },
      expectedResults: [
        'token=abdc&token_type_hint=refresh_token&client_id=interactive.public.short&client_secret=secret',
      ],
      expectedFinalUrl,
    },
    {
      logout_tokens_to_invalidate: ['access_token'],
      extras: { 'client_secret:revoke_access_token': 'secret' },
      expectedResults: [
        'token=abcd&token_type_hint=access_token&client_id=interactive.public.short&client_secret=secret',
      ],
      expectedFinalUrl,
    },
  ])(
    'Logout should revoke tokens $logout_tokens_to_invalidate',
    async ({ logout_tokens_to_invalidate, extras = null, expectedResults, expectedFinalUrl }) => {
      const configuration = {
        client_id: 'interactive.public.short',
        redirect_uri: 'http://localhost:4200/authentication/callback',
        scope: 'openid profile email api offline_access',
        authority: 'http://api',
        refresh_time_before_tokens_expiration_in_second: 70,
        logout_tokens_to_invalidate,
      };

      const fetch = (url, data) => {
        if (url === 'http://api/connect/revocation') {
          return Promise.resolve({ status: 200 });
        }
        return Promise.resolve({
          status: 200,
        });
      };

      const mockFetchFn = vi.fn().mockImplementation(fetch);

      const oidc = {
        configuration,
        tokens: { idToken: 'abcd', accessToken: 'abcd', refreshToken: 'abdc' },
        initAsync: () =>
          Promise.resolve({
            revocationEndpoint: 'http://api/connect/revocation',
            endSessionEndpoint: 'http://api/connect/endsession',
          }),
        destroyAsync: () => Promise.resolve(),
        logoutSameTabAsync: () => Promise.resolve(),
      };

      const oidcDatabase = { default: () => oidc };

      let finalUrl = '';
      class OidcLocationMock implements ILOidcLocation {
        open(url: string): void {
          finalUrl = url;
        }

        getCurrentHref(): string {
          return '';
        }

        getPath(): string {
          return '';
        }

        reload(): void {}

        getOrigin(): string {
          return 'http://localhost:4200';
        }
      }

      await logoutAsync(
        oidc,
        oidcDatabase,
        mockFetchFn,
        console,
        new OidcLocationMock(),
      )('/logged_out', extras);

      // @ts-ignore

      const results = mockFetchFn.mock.calls.map((call, index) => call[1].body);

      expect(results).toEqual(expectedResults);
      expect(finalUrl).toBe(expectedFinalUrl);
    },
  );
});

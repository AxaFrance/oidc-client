// import '@testing-library/jest-dom';

import { describe, expect, it, vi } from 'vitest';

import { eventNames } from './events';
import { ILOidcLocation } from './location';
import { clearSessionAsync, logoutAsync } from './logout';

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

  it('navigates to end_session_endpoint before clearing the local session (issue #1677)', async () => {
    // This is the regression test for the race described in issue #1677.
    // `OidcProvider`/`OidcSecure` watches `oidc.tokens`; if `destroyAsync`
    // runs before `oicLocation.open`, the React tree can briefly observe a
    // null token state and kick off a new auth flow before the navigation
    // to the IdP's end-session endpoint commits.
    const configuration = {
      client_id: 'interactive.public.short',
      authority: 'http://api',
      logout_tokens_to_invalidate: ['access_token', 'refresh_token'],
    };

    const callOrder: string[] = [];

    const mockFetchFn = vi.fn().mockImplementation(() => {
      callOrder.push('revoke');
      return Promise.resolve({ status: 200 });
    });

    const oidc: any = {
      configuration,
      tokens: {
        idToken: 'abcd',
        accessToken: 'abcd',
        refreshToken: 'abdc',
        idTokenPayload: { sub: 'sub-123' },
      },
      isLoggingOut: false,
      initAsync: () =>
        Promise.resolve({
          revocationEndpoint: 'http://api/connect/revocation',
          endSessionEndpoint: 'http://api/connect/endsession',
        }),
      destroyAsync: vi.fn().mockImplementation(() => {
        callOrder.push('destroyAsync');
        oidc.tokens = null;
        return Promise.resolve();
      }),
      logoutSameTabAsync: () => Promise.resolve(),
      publishEvent: (name: string) => callOrder.push(`publishEvent:${name}`),
    };

    const oidcDatabase = { default: oidc };

    let navigatedUrl = '';
    class OidcLocationMock implements ILOidcLocation {
      open(url: string): void {
        callOrder.push('open');
        navigatedUrl = url;
      }
      getCurrentHref() {
        return '';
      }
      getPath() {
        return '';
      }
      reload() {
        callOrder.push('reload');
      }
      getOrigin() {
        return 'http://localhost:4200';
      }
    }

    await logoutAsync(
      oidc,
      oidcDatabase,
      mockFetchFn,
      console,
      new OidcLocationMock(),
    )('/logged_out', null);

    // Revocation comes first (so tokens are still valid when revoked),
    // navigation comes second (page starts unloading), and only then we
    // clear local state and broadcast `logout_from_same_tab`.
    expect(callOrder[0]).toBe('revoke');
    expect(callOrder[1]).toBe('revoke');
    expect(callOrder[2]).toBe('open');
    expect(callOrder.indexOf('destroyAsync')).toBeGreaterThan(callOrder.indexOf('open'));
    expect(callOrder.indexOf(`publishEvent:${eventNames.logout_from_same_tab}`)).toBeGreaterThan(
      callOrder.indexOf('open'),
    );

    // The id_token_hint must still be present on the navigation URL, even
    // though local tokens have been cleared by `destroyAsync` afterwards.
    expect(navigatedUrl).toContain('id_token_hint=abcd');
    expect(navigatedUrl).toContain(
      'post_logout_redirect_uri=http%3A%2F%2Flocalhost%3A4200%2Flogged_out',
    );

    // The flag stays set after the call returns: the page is expected to be
    // unloading and any UI re-render that briefly observes `tokens === null`
    // should skip starting a new login flow.
    expect(oidc.isLoggingOut).toBe(true);
  });

  it('resets isLoggingOut and does not navigate when no_reload is requested', async () => {
    const configuration = {
      client_id: 'interactive.public.short',
      authority: 'http://api',
      logout_tokens_to_invalidate: [],
    };

    const events: string[] = [];
    let navigated = false;
    const oidc: any = {
      configuration,
      tokens: {
        idToken: 'abcd',
        accessToken: 'abcd',
        refreshToken: 'abdc',
        idTokenPayload: { sub: 'sub-123' },
      },
      isLoggingOut: false,
      initAsync: () =>
        Promise.resolve({
          revocationEndpoint: 'http://api/connect/revocation',
          endSessionEndpoint: 'http://api/connect/endsession',
        }),
      destroyAsync: () => Promise.resolve(),
      logoutSameTabAsync: () => Promise.resolve(),
      publishEvent: (name: string) => events.push(name),
    };
    const oidcDatabase = { default: oidc };

    class OidcLocationMock implements ILOidcLocation {
      open() {
        navigated = true;
      }
      getCurrentHref() {
        return '';
      }
      getPath() {
        return '';
      }
      reload() {
        navigated = true;
      }
      getOrigin() {
        return 'http://localhost:4200';
      }
    }

    await logoutAsync(
      oidc,
      oidcDatabase,
      vi.fn(),
      console,
      new OidcLocationMock(),
    )('/logged_out', { 'no_reload:oidc': 'true' });

    expect(navigated).toBe(false);
    expect(events).toContain(eventNames.logout_from_same_tab);
    expect(oidc.isLoggingOut).toBe(false);
  });

  describe('clearSessionAsync', () => {
    it('clears the local session and emits logout_from_same_tab without contacting the IdP', async () => {
      const events: { name: string; data: unknown }[] = [];
      const oidc: any = {
        configuration: { client_id: 'interactive.public.short' },
        tokens: {
          idToken: 'abcd',
          accessToken: 'abcd',
          refreshToken: 'abdc',
          idTokenPayload: { sub: 'sub-123' },
        },
        destroyAsync: vi.fn().mockImplementation(status => {
          oidc.tokens = null;
          events.push({ name: 'destroyAsync', data: status });
          return Promise.resolve();
        }),
        logoutSameTabAsync: vi.fn().mockResolvedValue(undefined),
        publishEvent: (name: string, data: unknown) => events.push({ name, data }),
      };
      const oidcDatabase = { default: oidc };

      await clearSessionAsync(oidc, oidcDatabase)();

      expect(oidc.destroyAsync).toHaveBeenCalledWith('LOGGED_OUT');
      expect(oidc.tokens).toBeNull();
      expect(events.some(e => e.name === eventNames.logout_from_same_tab)).toBe(true);
    });

    it('calls logoutSameTabAsync for sibling OIDC clients registered in the same tab', async () => {
      const oidc: any = {
        configuration: { client_id: 'interactive.public.short' },
        tokens: {
          idToken: 'abcd',
          accessToken: 'abcd',
          refreshToken: 'abdc',
          idTokenPayload: { sub: 'sub-123' },
        },
        destroyAsync: () => Promise.resolve(),
        logoutSameTabAsync: vi.fn().mockResolvedValue(undefined),
        publishEvent: () => undefined,
      };
      const sibling: any = { configuration: { client_id: 'other' } };
      const oidcDatabase = { default: oidc, other: sibling };

      await clearSessionAsync(oidc, oidcDatabase)();

      expect(oidc.logoutSameTabAsync).toHaveBeenCalledWith('interactive.public.short', 'sub-123');
    });
  });
});

import type { Tokens } from '@axa-fr/oidc-client';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useOidc, useOidcAccessToken, useOidcIdToken } from './ReactOidc';

const { get, subscribeEvents, removeEventSubscription, generateProof } = vi.hoisted(() => ({
  get: vi.fn(),
  subscribeEvents: vi.fn<(listener: (name: string) => void) => string>(),
  removeEventSubscription: vi.fn(),
  generateProof: vi.fn(),
}));

vi.mock('@axa-fr/oidc-client', () => ({
  OidcClient: {
    get,
    eventNames: {
      token_renewed: 'token_renewed',
      token_acquired: 'token_acquired',
      logout_from_another_tab: 'logout_from_another_tab',
      logout_from_same_tab: 'logout_from_same_tab',
      refreshTokensAsync_error: 'refreshTokensAsync_error',
      syncTokensAsync_error: 'syncTokensAsync_error',
    },
  },
}));

const initialTokens = {
  accessToken: 'access-example',
  accessTokenPayload: { sub: 'user' },
  idToken: 'id-example',
  idTokenPayload: { sub: 'user' },
};

const client = {
  tokens: null as Pick<
    Tokens,
    'accessToken' | 'accessTokenPayload' | 'idToken' | 'idTokenPayload'
  > | null,
  configuration: { demonstrating_proof_of_possession: false },
  subscribeEvents,
  removeEventSubscription,
  generateDemonstrationOfProofOfPossessionAsync: generateProof,
  loginAsync: vi.fn(),
  logoutAsync: vi.fn(),
  renewTokensAsync: vi.fn(),
};

beforeEach(() => {
  vi.resetAllMocks();
  client.tokens = { ...initialTokens };
  client.configuration.demonstrating_proof_of_possession = false;
  get.mockReturnValue(client);
  subscribeEvents.mockReturnValue('subscription');
});

describe.each([
  {
    name: 'access token',
    useToken: useOidcAccessToken,
    initial: {
      accessToken: initialTokens.accessToken,
      accessTokenPayload: initialTokens.accessTokenPayload,
      generateDemonstrationOfProofOfPossessionAsync: null,
    },
    empty: { accessToken: null, accessTokenPayload: null },
  },
  {
    name: 'ID token',
    useToken: useOidcIdToken,
    initial: {
      idToken: initialTokens.idToken,
      idTokenPayload: initialTokens.idTokenPayload,
    },
    empty: { idToken: null, idTokenPayload: null },
  },
])('$name hook', ({ useToken, initial, empty }) => {
  it('initializes from the configured client', () => {
    const { result } = renderHook(() => useToken('custom'));

    expect(result.current).toEqual(initial);
    expect(get).toHaveBeenCalledWith('custom');
  });

  it('uses the empty state when the client has no tokens', () => {
    client.tokens = null;
    const { result } = renderHook(() => useToken());

    expect(result.current).toEqual(empty);
  });

  it.each([
    'token_renewed',
    'token_acquired',
    'logout_from_another_tab',
    'logout_from_same_tab',
    'refreshTokensAsync_error',
    'syncTokensAsync_error',
  ])('refreshes token state on %s', eventName => {
    const { result } = renderHook(() => useToken());
    const listener = subscribeEvents.mock.calls[0][0];

    client.tokens = null;
    act(() => listener(eventName));
    expect(result.current).toEqual(empty);

    client.tokens = { ...initialTokens };
    act(() => listener(eventName));
    expect(result.current).toEqual(initial);
  });

  it('ignores unrelated events', () => {
    const { result } = renderHook(() => useToken());
    client.tokens = null;

    act(() => subscribeEvents.mock.calls[0][0]('unrelated'));

    expect(result.current).toEqual(initial);
  });

  it('cleans up subscriptions on configuration changes and unmount', () => {
    subscribeEvents.mockReturnValueOnce('first').mockReturnValueOnce('second');
    const { rerender, unmount } = renderHook(({ name }) => useToken(name), {
      initialProps: { name: 'first' },
    });

    rerender({ name: 'second' });
    expect(removeEventSubscription).toHaveBeenCalledExactlyOnceWith('first');
    expect(subscribeEvents).toHaveBeenCalledTimes(2);
    expect(get).toHaveBeenLastCalledWith('second');

    unmount();
    expect(removeEventSubscription.mock.calls).toEqual([['first'], ['second']]);
  });
});

describe('access token proof generation', () => {
  it('uses the initial access token when generating a proof', async () => {
    client.configuration.demonstrating_proof_of_possession = true;
    generateProof.mockResolvedValue('proof');
    const { result } = renderHook(() => useOidcAccessToken());

    await expect(
      result.current.generateDemonstrationOfProofOfPossessionAsync(
        'https://api.example.com',
        'GET',
      ),
    ).resolves.toBe('proof');
    expect(generateProof).toHaveBeenCalledExactlyOnceWith(
      'access-example',
      'https://api.example.com',
      'GET',
    );
  });

  it('uses refreshed tokens and forwards proof extras after a token event', async () => {
    client.configuration.demonstrating_proof_of_possession = true;
    const { result } = renderHook(() => useOidcAccessToken());
    client.tokens = { ...initialTokens, accessToken: 'renewed-example' };
    act(() => subscribeEvents.mock.calls[0][0]('token_renewed'));
    const extras = { nonce: 'example-nonce' };

    await result.current.generateDemonstrationOfProofOfPossessionAsync(
      'https://api.example.com',
      'POST',
      extras,
    );

    expect(generateProof).toHaveBeenCalledExactlyOnceWith(
      'renewed-example',
      'https://api.example.com',
      'POST',
      extras,
    );
  });
});

describe('useOidc', () => {
  it('tracks authentication on login and logout events', () => {
    client.tokens = null;
    const { result } = renderHook(() => useOidc('custom'));
    const listener = subscribeEvents.mock.calls[0][0];
    expect(result.current.isAuthenticated).toBe(false);

    client.tokens = { ...initialTokens };
    act(() => listener('token_acquired'));
    expect(result.current.isAuthenticated).toBe(true);

    client.tokens = null;
    act(() => listener('logout_from_same_tab'));
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('forwards login and logout arguments and returns their promises', () => {
    const loginPromise = Promise.resolve();
    const logoutPromise = Promise.resolve();
    client.loginAsync.mockReturnValue(loginPromise);
    client.logoutAsync.mockReturnValue(logoutPromise);
    const { result } = renderHook(() => useOidc('custom'));
    const extras = { prompt: 'login' };

    expect(result.current.login('/callback', extras, true, 'openid')).toBe(loginPromise);
    expect(client.loginAsync).toHaveBeenCalledExactlyOnceWith(
      '/callback',
      extras,
      false,
      'openid',
      true,
    );
    expect(result.current.logout('/logout', extras)).toBe(logoutPromise);
    expect(client.logoutAsync).toHaveBeenCalledExactlyOnceWith('/logout', extras);
  });

  it('returns renewed token data without adding internal fields', async () => {
    client.renewTokensAsync.mockResolvedValue({ ...initialTokens, internal: 'not exposed' });
    const { result } = renderHook(() => useOidc());
    const extras = { scope: 'openid' };

    await expect(result.current.renewTokens(extras)).resolves.toEqual(initialTokens);
    expect(client.renewTokensAsync).toHaveBeenCalledExactlyOnceWith(extras);
  });
});

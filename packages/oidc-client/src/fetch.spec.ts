import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchWithTokens } from './fetch';
import { OidcError, OidcErrorCode } from './oidcError';
import { Tokens } from './parseTokens';
import { userInfoAsync } from './user';

const buildOidc = () => {
  const tokens = {
    accessToken: 'access-token',
    expiresAt: Date.now() / 1000 + 3600,
    issuedAt: Date.now() / 1000,
  } as Tokens;
  const storage = {
    'oidc.default': JSON.stringify({ tokens }),
  } as unknown as Storage;
  const events: Array<{ name: string; data: unknown }> = [];
  const oidc: any = {
    configuration: {
      authority: 'https://issuer.example.com',
      client_id: 'client',
      redirect_uri: 'https://client.example.com/callback',
      scope: 'openid',
      storage,
      token_automatic_renew_mode: 'AutomaticBeforeTokenExpiration',
      refresh_time_before_tokens_expiration_in_second: 30,
    },
    configurationName: 'default',
    initAsync: vi.fn(async () => ({
      userInfoEndpoint: 'https://issuer.example.com/userinfo',
    })),
    publishEvent: (name: string, data: unknown) => events.push({ name, data }),
    renewTokensAsync: vi.fn(),
    tokens,
    userInfo: null,
  };
  return { events, oidc };
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchWithTokens typed errors', () => {
  it('returns a DPoP challenge response unchanged and publishes an api_request error', async () => {
    const { events, oidc } = buildOidc();
    const response = new Response('', {
      status: 401,
      headers: {
        'DPoP-Nonce': 'nonce',
        'WWW-Authenticate': 'DPoP error="use_dpop_nonce"',
      },
    });
    const fetchMock = vi.fn(async () => response);

    const result = await fetchWithTokens(
      fetchMock as any,
      oidc,
    )('https://api.example.com/resource');

    expect(result).toBe(response);
    expect(events.find(event => event.name === 'apiRequest_error')?.data).toMatchObject({
      code: OidcErrorCode.DPOP_NONCE_REQUIRED,
      phase: 'api_request',
      retryable: true,
      status: 401,
    });
  });

  it('wraps a rejected fetch as NETWORK_ERROR', async () => {
    const { events, oidc } = buildOidc();
    const cause = new TypeError('Failed to fetch');
    const fetchMock = vi.fn(async () => {
      throw cause;
    });

    await expect(
      fetchWithTokens(fetchMock as any, oidc)('https://api.example.com/resource'),
    ).rejects.toMatchObject({
      code: OidcErrorCode.NETWORK_ERROR,
      phase: 'api_request',
      retryable: true,
      cause,
    });
    expect(events.find(event => event.name === 'apiRequest_error')?.data).toBeInstanceOf(OidcError);
  });
});

describe('userInfoAsync typed errors', () => {
  it('keeps returning null on HTTP failure and publishes a userinfo error', async () => {
    const { events, oidc } = buildOidc();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 503 })),
    );

    await expect(userInfoAsync(oidc)(true)).resolves.toBeNull();
    expect(events.find(event => event.name === 'userInfoAsync_error')?.data).toMatchObject({
      code: OidcErrorCode.REQUEST_FAILED,
      phase: 'userinfo',
      retryable: true,
      status: 503,
    });
  });
});

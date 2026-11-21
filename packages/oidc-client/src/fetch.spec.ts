import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchWithTokens } from './fetch';
import {
  defaultDemonstratingProofOfPossessionConfiguration,
  generateJwkAsync,
  generateJwtDemonstratingProofOfPossessionAsync,
} from './jwt';
import { OidcError, OidcErrorCode } from './oidcError';
import { parseJwt, Tokens } from './parseTokens';
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

describe('fetchWithTokens DPoP target', () => {
  const apiUrl = 'https://localhost:5002/v1/usecases?filter=all&exposition=all#details';
  const request = new Request(apiUrl, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'X-Test': 'preserved' },
  });

  it.each([
    { name: 'a Request', input: request, init: undefined, method: 'PATCH' },
    {
      name: 'a Request with a method override',
      input: request,
      init: { method: 'post' },
      method: 'POST',
    },
    {
      name: 'a document-relative URL',
      input: '../v1/usecases?filter=all&exposition=all#details',
      init: {},
      method: 'GET',
    },
  ])('signs the actual URL and method for $name', async ({ input, init, method }) => {
    const { oidc } = buildOidc();
    const environment = {
      crypto: globalThis.crypto,
      location: { href: 'https://localhost:5173/app/index.html' },
    };
    vi.stubGlobal('window', environment);
    vi.stubGlobal('document', { baseURI: 'https://localhost:5002/api/' });
    const config = defaultDemonstratingProofOfPossessionConfiguration;
    const jwk = await generateJwkAsync(environment)(config.generateKeyAlgorithm);
    const signProof = generateJwtDemonstratingProofOfPossessionAsync(environment)(config);
    oidc.configuration.demonstrating_proof_of_possession = true;
    oidc.generateDemonstrationOfProofOfPossessionAsync = (
      _accessToken: string,
      target: string,
      httpMethod: string,
    ) => signProof(jwk, httpMethod, target);
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response());

    await fetchWithTokens(fetchMock, oidc, true)(input, init);

    expect(fetchMock).toHaveBeenCalledOnce();
    const [target, options] = fetchMock.mock.calls[0];
    const resolvedTarget =
      target instanceof Request ? target : new URL(target.toString(), document.baseURI);
    const outgoing = new Request(resolvedTarget, options);
    const proof = outgoing.headers.get('DPoP');
    expect(outgoing.url).toBe(apiUrl);
    expect(outgoing.method).toBe(method);
    expect(outgoing.headers.get('Authorization')).toBe('DPoP access-token');
    expect(parseJwt(proof.split('.')[1])).toMatchObject({
      htu: 'https://localhost:5002/v1/usecases',
      htm: method,
    });
    if (target instanceof Request) {
      expect(outgoing.headers.get('X-Test')).toBe('preserved');
      expect(outgoing.credentials).toBe('include');
    }
  });
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

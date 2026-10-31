/// <reference types="node" />
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getResourceContextName } from '../resource';
import type { DomainDetails } from '../types';

interface WorkerEvent {
  request?: Request;
  respondWith?: (response: Promise<Response>) => void;
  data?: { type: string; configurationName: string; tabId: string; data: unknown };
  ports?: Array<{ postMessage: (response: Record<string, unknown>) => void }>;
}

const resourceA = 'urn:example:api:a';
const resourceB = 'urn:example:api:b';
const issuer = 'https://issuer.example.com';
const jwt = (payload: Record<string, unknown>): string =>
  `e30.${btoa(JSON.stringify(payload))}.signature`;
const source = readFileSync(new URL('../../dist/OidcServiceWorker.js', import.meta.url), 'utf8');
let handlers: Map<string, (event: WorkerEvent) => void | Promise<void>>;
let network: ReturnType<typeof vi.fn<typeof fetch>>;
let trustedDomain: DomainDetails;
let configuration: {
  token_renew_mode: string;
  demonstrating_proof_of_possession: boolean;
  client_id: string;
  scope?: string;
  resource: string[];
  resources: Array<{
    resource: string;
    allowedUrlPrefixes: string[];
    audiences?: string[];
    scope?: string;
  }>;
};

const message = async (
  type: string,
  context = 'default',
  data: unknown = null,
  tabId = 'tab-one',
): Promise<Record<string, unknown>> => {
  let response: Record<string, unknown> | undefined;
  const handler = handlers.get('message');
  if (!handler) throw new Error('The worker message handler was not registered.');
  await handler({
    data: { type, configurationName: context, data, tabId },
    ports: [
      {
        postMessage: value => {
          response = value;
        },
      },
    ],
  });
  if (!response) throw new Error('The worker did not answer the message.');
  return response;
};

const dispatch = async (request: Request): Promise<Response> => {
  let response: Promise<Response> | undefined;
  const handler = handlers.get('fetch');
  if (!handler) throw new Error('The worker fetch handler was not registered.');
  await handler({
    request,
    respondWith: value => {
      response = value;
    },
  });
  return response ?? network(request);
};

const tokenRequest = (
  parameters: Record<string, string>,
  headers: Record<string, string> = {},
): Promise<Response> =>
  dispatch(
    new Request(`${issuer}/token`, {
      method: 'POST',
      body: new URLSearchParams(parameters),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...headers },
    }),
  );

const lastRequestParameters = (): URLSearchParams => {
  const call = network.mock.calls.at(-1);
  if (!call?.[1]?.body) throw new Error('The worker did not dispatch the expected form request.');
  return new URLSearchParams(String(call[1].body));
};

const init = (context = 'default', tabId = 'tab-one'): Promise<Record<string, unknown>> =>
  message(
    'init',
    context,
    {
      oidcServerConfiguration: {
        issuer,
        authorizationEndpoint: `${issuer}/authorize`,
        tokenEndpoint: `${issuer}/token`,
        revocationEndpoint: `${issuer}/revoke`,
        userInfoEndpoint: `${issuer}/userinfo`,
      },
      oidcConfiguration: configuration,
      where: 'test',
    },
    tabId,
  );

const login = async (tabId = 'tab-one'): Promise<Record<string, unknown>> => {
  await init('default', tabId);
  await message('setNonce', 'default', { nonce: { nonce: 'nonce' } }, tabId);
  await message('setCodeVerifier', 'default', { codeVerifier: 'actual-verifier' }, tabId);
  const verifier = await message('getCodeVerifier', 'default', null, tabId);
  return (
    await tokenRequest(
      {
        code: `code-${tabId}`,
        grant_type: 'authorization_code',
        code_verifier: String(verifier.codeVerifier),
        client_id: 'client',
      },
      trustedDomain.demonstratingProofOfPossession
        ? { DPoP: 'DPOP_SECURED_BY_OIDC_SERVICE_WORKER_default' }
        : {},
    )
  ).json();
};

beforeEach(() => {
  handlers = new Map();
  configuration = {
    token_renew_mode: 'access_token_invalid',
    demonstrating_proof_of_possession: false,
    client_id: 'client',
    scope: 'openid read write',
    resource: [resourceA, resourceB],
    resources: [
      { resource: resourceA, allowedUrlPrefixes: ['https://api.example.com/a'] },
      { resource: resourceB, allowedUrlPrefixes: ['https://api.example.com/b'] },
    ],
  };
  let refreshNumber = 0;
  trustedDomain = {
    showAccessToken: false,
    oidcDomains: [issuer],
    accessTokenDomains: ['https://api.example.com/'],
  };
  network = vi.fn<typeof fetch>().mockImplementation(async (input, init) => {
    const url = input instanceof Request ? input.url : String(input);
    if (url !== `${issuer}/token`) return new Response('api');
    const body = init?.body ?? (input instanceof Request ? await input.clone().text() : '');
    const parameters = new URLSearchParams(String(body));
    const resource = parameters.get('resource');
    if (parameters.has('refresh_token')) {
      refreshNumber++;
      return new Response(
        JSON.stringify({
          access_token: `${resource}-secret`,
          refresh_token: `refresh-${refreshNumber}`,
          expires_in: 120,
          token_type: trustedDomain.demonstratingProofOfPossession ? 'DPoP' : 'Bearer',
        }),
      );
    }
    return new Response(
      JSON.stringify({
        access_token: 'default-secret',
        refresh_token:
          parameters.get('code') === 'code-tab-two' ? 'second-tab-refresh' : 'refresh-0',
        expires_in: 120,
        token_type: trustedDomain.demonstratingProofOfPossession ? 'DPoP' : 'Bearer',
        id_token: jwt({
          iss: issuer,
          sub: 'user-one',
          nonce: 'nonce',
          iat: Date.now() / 1000,
          exp: Date.now() / 1000 + 3600,
        }),
      }),
    );
  });
  const self = {
    importScripts: vi.fn(),
    crypto: globalThis.crypto,
    addEventListener: (
      type: string,
      handler: (event: WorkerEvent) => void | Promise<void>,
    ): void => {
      handlers.set(type, handler);
    },
    clients: { claim: vi.fn().mockResolvedValue(undefined) },
    skipWaiting: vi.fn().mockResolvedValue(undefined),
  };
  runInNewContext(source, {
    self,
    fetch: network,
    Headers,
    Request,
    Response,
    URL,
    URLSearchParams,
    Date,
    crypto: globalThis.crypto,
    TextEncoder,
    Uint8Array,
    atob,
    btoa,
    setTimeout,
    clearTimeout,
    console: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
    trustedDomains: { default: trustedDomain },
  });
});

afterEach(() => vi.restoreAllMocks());

describe('standalone Service Worker resource integration', () => {
  it('never falls back to the default token outside mapped paths on a managed API origin', async () => {
    await login();
    network.mockClear();
    await dispatch(new Request('https://api.example.com/v2/items'));
    const request = network.mock.calls[0][0];
    if (!(request instanceof Request))
      throw new Error('The worker did not dispatch the anonymous request.');
    expect(request.headers.has('Authorization')).toBe(false);
  });
  it('ships one classic worker file without import statements or external chunks', () => {
    expect(source).not.toMatch(/^\s*(?:import|export)\s/m);
    expect(source).not.toMatch(/from\s+["']\.\//);
  });

  it('negotiates resource support without changing the default token entry', async () => {
    const tokens = await login();
    expect(tokens.access_token).toBe(
      'ACCESS_TOKEN_SECURED_BY_OIDC_SERVICE_WORKER_default#tabId=default',
    );
    expect((await init()).resourceTokenManagement).toBe(true);
    expect((await init(getResourceContextName('default', resourceA))).tokens).toBeNull();
    expect((await init()).tokens).toMatchObject({ access_token: tokens.access_token });
  });

  it('isolates two resource responses, rotates their shared grant, and keeps the default access token', async () => {
    const base = await login();
    const a = await (
      await tokenRequest({
        grant_type: 'refresh_token',
        refresh_token: String(base.refresh_token),
        resource: resourceA,
      })
    ).json();
    const b = await (
      await tokenRequest({
        grant_type: 'refresh_token',
        refresh_token: String(base.refresh_token),
        resource: resourceB,
      })
    ).json();
    expect(JSON.stringify(a)).not.toContain(`${resourceA}-secret`);
    expect(JSON.stringify(a)).not.toContain('refresh-1');
    expect(a.access_token).not.toBe(b.access_token);
    expect(a.resourceContext).toMatchObject({
      resource: resourceA,
      issuer,
      clientId: 'client',
      configurationName: 'default',
      subject: 'user-one',
      grantResource: null,
    });
    const refreshBodies = network.mock.calls
      .slice(1)
      .map(([, init]) => new URLSearchParams(String(init?.body)).get('refresh_token'));
    expect(refreshBodies).toEqual(['refresh-0', 'refresh-1']);
    network.mockClear();
    await dispatch(
      new Request('https://api.example.com/a/items', {
        headers: { Authorization: `Bearer ${a.access_token}` },
      }),
    );
    await dispatch(
      new Request('https://api.example.com/b/items', {
        headers: { Authorization: `Bearer ${b.access_token}` },
      }),
    );
    expect(new Headers((network.mock.calls[0][0] as Request).headers).get('Authorization')).toBe(
      `Bearer ${resourceA}-secret`,
    );
    expect(new Headers((network.mock.calls[1][0] as Request).headers).get('Authorization')).toBe(
      `Bearer ${resourceB}-secret`,
    );
    expect(network.mock.calls[0][1]).toEqual({ redirect: 'error' });
    expect((await init()).tokens).toMatchObject({ access_token: base.access_token });
  });

  it('never attaches a token for API B to API A', async () => {
    const base = await login();
    const b = await (
      await tokenRequest({
        grant_type: 'refresh_token',
        refresh_token: String(base.refresh_token),
        resource: resourceB,
      })
    ).json();
    network.mockClear();
    const response = await dispatch(
      new Request('https://api.example.com/a/items', {
        headers: { Authorization: `Bearer ${b.access_token}` },
      }),
    );
    expect(response.status).toBe(403);
    expect(network).not.toHaveBeenCalled();
  });

  it('does not widen trusted domains using a resource URL mapping', async () => {
    configuration.resources[0].allowedUrlPrefixes.push('https://untrusted.example.com/');
    const base = await login();
    const a = await (
      await tokenRequest({
        grant_type: 'refresh_token',
        refresh_token: String(base.refresh_token),
        resource: resourceA,
      })
    ).json();
    network.mockClear();
    expect(
      (
        await dispatch(
          new Request('https://untrusted.example.com/', {
            headers: { Authorization: `Bearer ${a.access_token}` },
          }),
        )
      ).status,
    ).toBe(403);
    expect(network).not.toHaveBeenCalled();
  });

  it('requires explicit markers rather than default or arbitrary resource-token attachment', async () => {
    const base = await login();
    await tokenRequest({
      grant_type: 'refresh_token',
      refresh_token: String(base.refresh_token),
      resource: resourceA,
    });
    network.mockClear();
    await dispatch(new Request('https://api.example.com/a/items'));
    expect((network.mock.calls[0][0] as Request).headers.get('Authorization')).toBeNull();
  });

  it('clears one entry without clearing its sibling or the default grant', async () => {
    const base = await login();
    const a = await (
      await tokenRequest({
        grant_type: 'refresh_token',
        refresh_token: String(base.refresh_token),
        resource: resourceA,
      })
    ).json();
    const b = await (
      await tokenRequest({
        grant_type: 'refresh_token',
        refresh_token: String(base.refresh_token),
        resource: resourceB,
      })
    ).json();
    await message('clear', getResourceContextName('default', resourceA), { status: 'LOGGED_OUT' });
    expect((await init(getResourceContextName('default', resourceA))).tokens).toBeNull();
    expect((await init(getResourceContextName('default', resourceB))).tokens).toMatchObject({
      access_token: b.access_token,
    });
    expect((await init()).tokens).toMatchObject({ access_token: base.access_token });
    network.mockClear();
    expect(
      (
        await dispatch(
          new Request('https://api.example.com/a', {
            headers: { Authorization: `Bearer ${a.access_token}` },
          }),
        )
      ).status,
    ).toBe(403);
    expect(network).not.toHaveBeenCalled();
  });

  it('clears all resource tokens on session logout', async () => {
    const base = await login();
    await tokenRequest({
      grant_type: 'refresh_token',
      refresh_token: String(base.refresh_token),
      resource: resourceA,
    });
    await message('clear', 'default', { status: 'LOGGED_OUT' });
    expect((await init()).tokens).toBeNull();
    expect((await init(getResourceContextName('default', resourceA))).tokens).toBeNull();
  });

  it('rejects unknown resource contexts and refresh resources outside their grant', async () => {
    const base = await login();
    expect(await init(getResourceContextName('default', 'urn:unknown'))).toHaveProperty('error');
    network.mockClear();
    expect(
      (
        await tokenRequest({
          grant_type: 'refresh_token',
          refresh_token: String(base.refresh_token),
          resource: 'urn:unknown',
        })
      ).status,
    ).toBe(500);
    expect(network).not.toHaveBeenCalled();
  });

  it('does not resurrect a cleared resource from a late token response', async () => {
    const base = await login();
    let resolve: ((response: Response) => void) | undefined;
    network.mockImplementation(
      () =>
        new Promise<Response>(complete => {
          resolve = complete;
        }),
    );
    const pending = tokenRequest({
      grant_type: 'refresh_token',
      refresh_token: String(base.refresh_token),
      resource: resourceA,
    });
    await vi.waitFor(() => expect(resolve).toBeTypeOf('function'));
    await message('clear', getResourceContextName('default', resourceA), { status: 'LOGGED_OUT' });
    if (!resolve) throw new Error('The token request did not start.');
    resolve(new Response(JSON.stringify({ access_token: 'late-secret', expires_in: 120 })));
    expect((await pending).status).toBe(500);
    expect((await init(getResourceContextName('default', resourceA))).tokens).toBeNull();
  });

  it('persists requested resource scopes when the provider omits them', async () => {
    configuration.scope = 'openid read write';
    configuration.resources[0].scope = 'read';
    const base = await login();
    const response = await (
      await tokenRequest({
        grant_type: 'refresh_token',
        refresh_token: String(base.refresh_token),
        resource: resourceA,
        scope: 'read',
      })
    ).json();
    expect(response.scope).toBe('read');
    expect((await init(getResourceContextName('default', resourceA))).tokens).toMatchObject({
      scope: 'read',
    });
  });

  it('does not refresh scopes outside the known grant', async () => {
    configuration.scope = 'openid read';
    configuration.resources[1].scope = 'write';
    const base = await login();
    network.mockClear();
    expect(
      (
        await tokenRequest({
          grant_type: 'refresh_token',
          refresh_token: String(base.refresh_token),
          resource: resourceB,
          scope: 'write',
        })
      ).status,
    ).toBe(500);
    expect(network).not.toHaveBeenCalled();
  });

  it('rejects insufficient scopes and wrong audiences before storing a resource token', async () => {
    configuration.resources[0].scope = 'read';
    configuration.resources[0].audiences = ['api-a'];
    const base = await login();
    network.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          access_token: jwt({ aud: 'api-a', iss: issuer, exp: Date.now() / 1000 + 120 }),
          scope: 'write',
          refresh_token: 'rotated-scope',
          expires_in: 120,
        }),
      ),
    );
    expect(
      (
        await tokenRequest({
          grant_type: 'refresh_token',
          refresh_token: String(base.refresh_token),
          resource: resourceA,
        })
      ).status,
    ).toBe(500);
    network.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          access_token: jwt({ aud: 'api-b', iss: issuer, exp: Date.now() / 1000 + 120 }),
          scope: 'read',
          refresh_token: 'rotated-audience',
          expires_in: 120,
        }),
      ),
    );
    expect(
      (
        await tokenRequest({
          grant_type: 'refresh_token',
          refresh_token: String(base.refresh_token),
          resource: resourceA,
        })
      ).status,
    ).toBe(500);
    expect((await init(getResourceContextName('default', resourceA))).tokens).toBeNull();
    await tokenRequest({
      grant_type: 'refresh_token',
      refresh_token: String(base.refresh_token),
      resource: resourceB,
    });
    expect(lastRequestParameters().get('refresh_token')).toBe('rotated-audience');
  });

  it('uses a separate authorization transaction and independent resource grant without overwriting default tokens', async () => {
    configuration.resource = [resourceA];
    const base = await login();
    const context = getResourceContextName('default', resourceB);
    await init(context);
    await message('setNonce', context, { nonce: { nonce: 'resource-nonce' } });
    await message('setCodeVerifier', context, { codeVerifier: 'resource-verifier' });
    const verifier = await message('getCodeVerifier', context);
    network.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          access_token: 'resource-code-secret',
          refresh_token: 'independent-refresh',
          expires_in: 120,
          id_token: jwt({
            iss: issuer,
            sub: 'user-one',
            nonce: 'resource-nonce',
            exp: Date.now() / 1000 + 10,
          }),
        }),
      ),
    );
    const resource = await (
      await tokenRequest({
        code: 'resource-code',
        grant_type: 'authorization_code',
        code_verifier: String(verifier.codeVerifier),
        client_id: 'client',
        resource: resourceB,
      })
    ).json();
    expect(resource.resourceContext).toMatchObject({
      resource: resourceB,
      grantResource: resourceB,
      subject: 'user-one',
    });
    expect(lastRequestParameters().get('code_verifier')).toBe('resource-verifier');
    expect((await init()).tokens).toMatchObject({
      access_token: base.access_token,
      refresh_token: base.refresh_token,
    });
    vi.spyOn(Date.prototype, 'getTime').mockReturnValue(Date.now() + 20000);
    const renewed = await tokenRequest({
      grant_type: 'refresh_token',
      refresh_token: String(resource.refresh_token),
      resource: resourceB,
    });
    expect(renewed.ok).toBe(true);
    expect((await renewed.json()).idTokenPayload).toBeNull();
    expect(lastRequestParameters().get('refresh_token')).toBe('independent-refresh');
    network.mockClear();
    expect(
      (
        await dispatch(
          new Request(`${issuer}/revoke`, {
            method: 'POST',
            body: new URLSearchParams({
              token: String(resource.refresh_token),
              token_type_hint: 'refresh_token',
            }),
          }),
        )
      ).ok,
    ).toBe(true);
    expect(lastRequestParameters().get('token')).toMatch(/^refresh-/);
  });

  it.each(['different subject', 'missing ID token', 'missing nonce', 'malformed ID token'])(
    'rejects resource authorization with %s',
    async failure => {
      await login();
      const context = getResourceContextName('default', resourceB);
      await init(context);
      await message('setNonce', context, { nonce: { nonce: 'resource-nonce' } });
      await message('setCodeVerifier', context, { codeVerifier: 'resource-verifier' });
      const verifier = await message('getCodeVerifier', context);
      network.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: 'other-subject-secret',
            expires_in: 120,
            id_token:
              failure === 'missing ID token'
                ? undefined
                : failure === 'malformed ID token'
                  ? 'invalid.jwt'
                  : jwt({
                      iss: issuer,
                      sub: failure === 'different subject' ? 'another-user' : 'user-one',
                      nonce: failure === 'missing nonce' ? undefined : 'resource-nonce',
                      exp: Date.now() / 1000 + 3600,
                    }),
          }),
        ),
      );
      expect(
        (
          await tokenRequest({
            code: 'resource-code',
            code_verifier: String(verifier.codeVerifier),
            resource: resourceB,
          })
        ).status,
      ).toBe(500);
      expect((await init(context)).tokens).toBeNull();
    },
  );

  it('preserves shared rotation after resource-only clear but not after a new identity transaction', async () => {
    const base = await login();
    let complete: ((response: Response) => void) | undefined;
    network.mockImplementationOnce(
      () =>
        new Promise<Response>(resolve => {
          complete = resolve;
        }),
    );
    const pending = tokenRequest({
      grant_type: 'refresh_token',
      refresh_token: String(base.refresh_token),
      resource: resourceA,
    });
    await vi.waitFor(() => expect(complete).toBeTypeOf('function'));
    await message('clear', getResourceContextName('default', resourceA), { status: 'LOGGED_OUT' });
    if (!complete) throw new Error('The token request did not start.');
    complete(
      new Response(
        JSON.stringify({
          access_token: 'late-secret',
          refresh_token: 'late-rotation',
          expires_in: 120,
        }),
      ),
    );
    expect((await pending).status).toBe(500);
    await tokenRequest({
      grant_type: 'refresh_token',
      refresh_token: String(base.refresh_token),
      resource: resourceB,
    });
    expect(lastRequestParameters().get('refresh_token')).toBe('late-rotation');
    expect((await init(getResourceContextName('default', resourceA))).tokens).toBeNull();
    await message('setNonce', 'default', { nonce: { nonce: 'new-login' } });
    expect((await init(getResourceContextName('default', resourceB))).tokens).toBeNull();
  });

  it('isolates resource contexts and refresh grants across independently authenticated tabs', async () => {
    trustedDomain.allowMultiTabLogin = true;
    const first = await login();
    const second = await login('tab-two');
    const firstResource = await (
      await tokenRequest({
        grant_type: 'refresh_token',
        refresh_token: String(first.refresh_token),
        resource: resourceA,
      })
    ).json();
    expect((await init(getResourceContextName('default', resourceA), 'tab-two')).tokens).toBeNull();
    const secondResource = await (
      await tokenRequest({
        grant_type: 'refresh_token',
        refresh_token: String(second.refresh_token),
        resource: resourceA,
      })
    ).json();
    expect(firstResource.access_token).not.toBe(secondResource.access_token);
    expect(lastRequestParameters().get('refresh_token')).toBe('second-tab-refresh');
  });

  it('binds resource DPoP proofs to the selected token, original key and nonce', async () => {
    trustedDomain.demonstratingProofOfPossession = true;
    const base = await login();
    const originalProof = new Headers(network.mock.calls[0]?.[1]?.headers).get('DPoP');
    if (!originalProof) throw new Error('The authorization grant did not include a DPoP proof.');
    network.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          access_token: 'resource-dpop-secret',
          refresh_token: 'dpop-rotation',
          token_type: 'DPoP',
          expires_in: 120,
        }),
        { headers: { 'DPoP-Nonce': 'resource-nonce' } },
      ),
    );
    const resource = await (
      await tokenRequest(
        {
          grant_type: 'refresh_token',
          refresh_token: String(base.refresh_token),
          resource: resourceA,
        },
        { DPoP: 'DPOP_SECURED_BY_OIDC_SERVICE_WORKER_default' },
      )
    ).json();
    network.mockClear();
    network.mockResolvedValueOnce(new Response('api', { headers: { 'DPoP-Nonce': 'api-nonce' } }));
    await dispatch(
      new Request('https://api.example.com/a/items', {
        method: 'POST',
        body: 'payload',
        headers: {
          Authorization: `DPoP ${resource.access_token}`,
          DPoP: 'DPOP_SECURED_BY_OIDC_SERVICE_WORKER_default',
        },
      }),
    );
    const request = network.mock.calls[0][0];
    if (!(request instanceof Request)) throw new Error('The worker did not dispatch a Request.');
    const proof = request.headers.get('DPoP');
    if (!proof) throw new Error('The resource request did not include a DPoP proof.');
    const header = JSON.parse(atob(proof.split('.')[0]));
    const payload = JSON.parse(atob(proof.split('.')[1]));
    expect(payload).toMatchObject({
      htm: 'POST',
      htu: 'https://api.example.com/a/items',
      ath: createHash('sha256').update('resource-dpop-secret').digest('base64url'),
    });
    expect(header.jwk).toEqual(JSON.parse(atob(originalProof.split('.')[0])).jwk);
    expect(request.headers.get('Authorization')).toBe('DPoP resource-dpop-secret');
    expect(payload).not.toHaveProperty('nonce');
    await dispatch(
      new Request('https://api.example.com/a/items', {
        headers: {
          Authorization: `DPoP ${resource.access_token}`,
          DPoP: 'DPOP_SECURED_BY_OIDC_SERVICE_WORKER_default',
        },
      }),
    );
    const next = network.mock.calls[1][0];
    if (!(next instanceof Request))
      throw new Error('The worker did not dispatch the next resource request.');
    const nextProof = next.headers.get('DPoP');
    if (!nextProof) throw new Error('The next resource request did not include a DPoP proof.');
    expect(JSON.parse(atob(nextProof.split('.')[1])).nonce).toBe('api-nonce');
    const sibling = await (
      await tokenRequest(
        {
          grant_type: 'refresh_token',
          refresh_token: String(base.refresh_token),
          resource: resourceB,
        },
        { DPoP: 'DPOP_SECURED_BY_OIDC_SERVICE_WORKER_default' },
      )
    ).json();
    const tokenProof = new Headers(network.mock.calls[2][1]?.headers).get('DPoP');
    if (!tokenProof) throw new Error('The sibling token request did not include a DPoP proof.');
    expect(JSON.parse(atob(tokenProof.split('.')[1])).nonce).toBe('resource-nonce');
    await dispatch(
      new Request('https://api.example.com/b/items', {
        headers: {
          Authorization: `DPoP ${sibling.access_token}`,
          DPoP: 'DPOP_SECURED_BY_OIDC_SERVICE_WORKER_default',
        },
      }),
    );
    const siblingRequest = network.mock.calls[3][0];
    if (!(siblingRequest instanceof Request))
      throw new Error('The worker did not dispatch the sibling request.');
    const siblingProof = siblingRequest.headers.get('DPoP');
    if (!siblingProof) throw new Error('The sibling request did not include a DPoP proof.');
    expect(JSON.parse(atob(siblingProof.split('.')[1]))).not.toHaveProperty('nonce');
  });

  it('returns explicit errors for malformed resource contexts and invalid initialization', async () => {
    await login();
    expect(await init('default#resource=%')).toHaveProperty('error');
    expect(
      await message('init', 'default', {
        oidcServerConfiguration: {
          issuer: 'https://untrusted.test',
          tokenEndpoint: 'https://untrusted.test/token',
        },
        oidcConfiguration: configuration,
      }),
    ).toHaveProperty('error');
  });

  it('reports lost parent worker state without restoring stale resource tokens', async () => {
    const base = await login();
    await message('clear', 'default', { status: 'SESSION_LOST' });
    network.mockClear();
    expect(
      (
        await tokenRequest({
          grant_type: 'refresh_token',
          refresh_token: String(base.refresh_token),
          resource: resourceA,
        })
      ).status,
    ).toBe(500);
    expect(network).not.toHaveBeenCalled();
    expect((await init(getResourceContextName('default', resourceA))).tokens).toBeNull();
  });
});

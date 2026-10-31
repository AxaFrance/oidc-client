import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { base64urlOfHashOfASCIIEncodingAsync } from './crypto';
import { eventNames } from './events';
import { initSession } from './initSession';
import { registrationCache } from './initWorker';
import { generateJwkAsync } from './jwt';
import { Oidc } from './oidc';
import { OidcClient } from './oidcClient';
import { OidcErrorCode } from './oidcError';
import { parseJwt, parseOriginalTokens, TokenRenewMode, Tokens } from './parseTokens';
import { getResourceContextName } from './protocol';
import {
  performAuthorizationRequestAsync,
  performFirstTokenRequestAsync,
  performPushedAuthorizationRequestAsync,
  performTokenRequestAsync,
} from './requests';
import {
  cancelResourceTransactions,
  getCallbackResource,
  rememberResourceTransaction,
} from './resourceParameters';
import timer from './timer';
import type { Fetch, OidcConfiguration } from './types';
import { TokenAutomaticRenewMode } from './types';
import codeVersion from './version';

class TestStorage implements Storage {
  [key: string]: unknown;
  get length(): number {
    return Object.keys(this).length;
  }
  clear(): void {
    for (const key of Object.keys(this)) delete this[key];
  }
  getItem(key: string): string | null {
    return typeof this[key] === 'string' ? this[key] : null;
  }
  key(index: number): string | null {
    return Object.keys(this)[index] ?? null;
  }
  removeItem(key: string): void {
    delete this[key];
  }
  setItem(key: string, value: string): void {
    this[key] = value;
  }
}

const issuer = 'https://issuer.example.com';
const resourceA = 'urn:example:api:a';
const resourceB = 'urn:example:api:b';
const jwt = (payload: Record<string, unknown>): string =>
  `e30.${btoa(JSON.stringify(payload))}.signature`;
let storage: TestStorage;
let oidc: Oidc;
let client: OidcClient;
let fetch: ReturnType<typeof vi.fn<Fetch>>;

const createTokens = (): Tokens =>
  parseOriginalTokens(
    {
      access_token: 'default-token',
      refresh_token: 'refresh-0',
      expires_in: 3600,
      token_type: 'Bearer',
      id_token: jwt({
        iss: issuer,
        sub: 'user-one',
        nonce: 'nonce',
        iat: Date.now() / 1000,
        exp: Date.now() / 1000 + 3600,
      }),
    },
    null,
    TokenRenewMode.access_token_invalid,
  );

const tokenResponse = (resource: string, refreshToken?: string): Response =>
  new Response(
    JSON.stringify({
      access_token: `${resource}-token`,
      expires_in: 120,
      token_type: 'Bearer',
      ...(refreshToken ? { refresh_token: refreshToken } : {}),
    }),
  );

beforeEach(() => {
  storage = new TestStorage();
  vi.stubGlobal('sessionStorage', storage);
  vi.stubGlobal('localStorage', storage);
  vi.stubGlobal('window', {
    sessionStorage: storage,
    location: { href: 'https://app.example.com/' },
    crypto: globalThis.crypto,
  });
  vi.stubGlobal('navigator', { onLine: true });
  fetch = vi.fn<Fetch>().mockImplementation(async (_input, init) => {
    const resource = new URLSearchParams(String(init?.body)).get('resource');
    return tokenResponse(resource);
  });
  vi.stubGlobal('fetch', fetch);
  const configuration: OidcConfiguration = {
    authority: issuer,
    client_id: 'client',
    redirect_uri: 'https://app.example.com/callback',
    scope: 'openid read write',
    authority_configuration: {
      issuer,
      authorization_endpoint: `${issuer}/authorize`,
      token_endpoint: `${issuer}/token`,
      revocation_endpoint: `${issuer}/revoke`,
    },
    resources: [
      { resource: resourceA, allowedUrlPrefixes: ['https://api.example.com/a'], scope: 'read' },
      { resource: resourceB, allowedUrlPrefixes: ['https://api.example.com/b'], scope: 'write' },
    ],
    resource: [resourceA, resourceB],
    storage,
    token_automatic_renew_mode: TokenAutomaticRenewMode.AutomaticOnlyWhenFetchExecuted,
    refresh_time_before_tokens_expiration_in_second: 0,
  };
  oidc = new Oidc(configuration, 'default', () => fetch);
  oidc.tokens = createTokens();
  initSession('default', storage).setTokens(oidc.tokens);
  initSession('default', storage).setNonceAsync({ nonce: 'nonce' });
  client = new OidcClient(oidc);
  oidc.location = {
    open: vi.fn(),
    reload: vi.fn(),
    getCurrentHref: () => 'https://app.example.com/',
    getPath: () => '/',
    getOrigin: () => 'https://app.example.com',
  };
});

afterEach(async () => {
  await oidc.resourceTokens.clearAllAsync();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('resource-specific access tokens', () => {
  it('shares concurrent login attempts before asynchronous resource clearing finishes', async () => {
    let release: () => void;
    const gate = new Promise<void>(resolve => {
      release = resolve;
    });
    const clear = vi.spyOn(oidc.resourceTokens, 'clearAllAsync').mockReturnValue(gate);
    vi.spyOn(oidc, 'initAsync').mockRejectedValue(new Error('Stop before authorization.'));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const first = oidc.loginAsync();
    const second = oidc.loginAsync();
    const clearingCalls = clear.mock.calls.length;
    release();
    await Promise.allSettled([first, second]);
    expect(clearingCalls).toBe(1);
    expect(oidc.initAsync).toHaveBeenCalledOnce();
    expect(oidc.loginPromise).toBeNull();
  });

  const installSilentFrame = () => {
    const frame = { contentWindow: {}, setAttribute: vi.fn(), style: {}, remove: vi.fn() };
    const append = vi.fn();
    let listener: (event: { origin: string; source: unknown; data: string }) => void;
    vi.stubGlobal('window', {
      ...window,
      addEventListener: (_type: string, callback: typeof listener) => {
        listener = callback;
      },
      removeEventListener: vi.fn(),
    });
    vi.stubGlobal('document', { createElement: () => frame, body: { appendChild: append } });
    oidc.configuration.silent_login_uri = 'https://app.example.com/silent-login';
    oidc.configuration.silent_redirect_uri = 'https://app.example.com/silent-callback';
    oidc.configuration.silent_login_timeout = 500;
    return {
      frame,
      append,
      reply: (data: string): void =>
        listener({ origin: 'https://app.example.com', source: frame.contentWindow, data }),
    };
  };

  it('automatically authorizes a new resource silently without replacing the original grant', async () => {
    const { frame, append, reply } = installSilentFrame();
    oidc.configuration.resource = resourceA;
    const request = client.getAccessTokenForResourceAsync(resourceB);
    await vi.waitFor(() => expect(append).toHaveBeenCalledOnce());
    expect(frame.setAttribute.mock.calls[0][1]).toContain('prompt=none');
    expect(frame.setAttribute.mock.calls[0][1]).toContain(
      `resource=${encodeURIComponent(resourceB)}`,
    );
    reply(
      `default_oidc_tokens:${JSON.stringify({ resource: resourceB, tokens: { ...createTokens(), accessToken: 'new-resource-token', refreshToken: 'own-grant-refresh' }, sessionState: 'session' })}`,
    );
    await expect(request).resolves.toMatchObject({
      resource: resourceB,
      accessToken: 'new-resource-token',
    });
    expect(oidc.tokens.refreshToken).toBe('refresh-0');
    expect(oidc.tokens.accessToken).toBe('default-token');
    await client.getAccessTokenForResourceAsync(resourceB, { forceRenew: true });
    expect(new URLSearchParams(String(fetch.mock.calls[0][1].body)).get('refresh_token')).toBe(
      'own-grant-refresh',
    );
    expect(frame.remove).toHaveBeenCalledOnce();
  });

  it.each(['consent_required', 'login_required', 'invalid_target'])(
    'surfaces silent provider error %s without dropping the default session',
    async error => {
      const { append, reply } = installSilentFrame();
      oidc.configuration.resource = resourceA;
      const request = client.getAccessTokenForResourceAsync(resourceB);
      const rejection = expect(request).rejects.toMatchObject({ oauthError: error });
      await vi.waitFor(() => expect(append).toHaveBeenCalledOnce());
      reply(
        `default_oidc_error:${JSON.stringify({ error, error_description: 'Provider rejected this request' })}`,
      );
      await rejection;
      expect(oidc.tokens.accessToken).toBe('default-token');
      expect(fetch).not.toHaveBeenCalled();
    },
  );

  it('rejects silent authorization for a different authenticated subject', async () => {
    const { append, reply } = installSilentFrame();
    oidc.configuration.resource = resourceA;
    const request = client.getAccessTokenForResourceAsync(resourceB);
    const rejection = expect(request).rejects.toMatchObject({
      code: OidcErrorCode.RESOURCE_CONTEXT_MISMATCH,
    });
    await vi.waitFor(() => expect(append).toHaveBeenCalledOnce());
    const tokens = createTokens();
    tokens.idTokenPayload.sub = 'different-user';
    reply(`default_oidc_tokens:${JSON.stringify({ resource: resourceB, tokens })}`);
    await rejection;
    expect(oidc.tokens.idTokenPayload.sub).toBe('user-one');
  });

  it('reports a bounded silent timeout', async () => {
    vi.useFakeTimers();
    const { append } = installSilentFrame();
    oidc.configuration.resource = resourceA;
    const request = client.getAccessTokenForResourceAsync(resourceB);
    const rejection = expect(request).rejects.toMatchObject({
      code: OidcErrorCode.SILENT_LOGIN_TIMEOUT,
    });
    await vi.waitFor(() => expect(append).toHaveBeenCalledOnce());
    await vi.advanceTimersByTimeAsync(500);
    await rejection;
  });

  it('renews acquired resources automatically before their access tokens expire', async () => {
    vi.useFakeTimers();
    vi.spyOn(timer, 'setTimeout').mockImplementation((handler, delay, ...args) =>
      setTimeout(handler, delay, ...args),
    );
    vi.spyOn(timer, 'clearTimeout').mockImplementation(timeout => clearTimeout(timeout));
    oidc.configuration.token_automatic_renew_mode =
      TokenAutomaticRenewMode.AutomaticBeforeTokenExpiration;
    await client.getAccessTokenForResourceAsync(resourceA);
    await client.getAccessTokenForResourceAsync(resourceB);
    await vi.advanceTimersByTimeAsync(120000);
    expect(fetch).toHaveBeenCalledTimes(4);
    expect(client.getAccessTokenForResource(resourceA)).not.toBeNull();
    expect(client.getAccessTokenForResource(resourceB)).not.toBeNull();
  });

  it('caps renewal margins for short-lived API tokens without renewing siblings early', async () => {
    vi.useFakeTimers();
    vi.spyOn(timer, 'setTimeout').mockImplementation((handler, delay, ...args) =>
      setTimeout(handler, delay, ...args),
    );
    vi.spyOn(timer, 'clearTimeout').mockImplementation(timeout => clearTimeout(timeout));
    oidc.configuration.token_automatic_renew_mode =
      TokenAutomaticRenewMode.AutomaticBeforeTokenExpiration;
    oidc.configuration.refresh_time_before_tokens_expiration_in_second = 80;
    fetch.mockImplementation(async (_input, init) => {
      const resource = new URLSearchParams(String(init?.body)).get('resource');
      return new Response(
        JSON.stringify({
          access_token: `${resource}-token`,
          expires_in: resource === resourceA ? 20 : 120,
        }),
      );
    });
    await client.getAccessTokenForResourceAsync(resourceA);
    const b = await client.getAccessTokenForResourceAsync(resourceB);
    await client.getAccessTokenForResourceAsync(resourceA);
    expect(fetch).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(9999);
    expect(fetch).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(new URLSearchParams(String(fetch.mock.calls[2][1].body)).get('resource')).toBe(
      resourceA,
    );
    expect(client.getAccessTokenForResource(resourceB)).toEqual(b);
    expect(client.getAccessTokenForResource(resourceA).expiresAt).toBeGreaterThan(
      Date.now() / 1000 + 19,
    );
  });

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects an invalid renewal margin before acquisition: %s',
    async margin => {
      oidc.configuration.refresh_time_before_tokens_expiration_in_second = margin;
      await expect(client.getAccessTokenForResourceAsync(resourceA)).rejects.toThrow(
        'finite, non-negative renewal margin',
      );
      expect(fetch).not.toHaveBeenCalled();
    },
  );

  it('acquires and caches two API tokens without replacing the default token', async () => {
    const a = await client.getAccessTokenForResourceAsync(resourceA);
    const b = await client.getAccessTokenForResourceAsync(resourceB);
    expect(a).toMatchObject({
      resource: resourceA,
      accessToken: `${resourceA}-token`,
      issuer,
      clientId: 'client',
      configurationName: 'default',
    });
    expect(b.accessToken).toBe(`${resourceB}-token`);
    expect(oidc.tokens.accessToken).toBe('default-token');
    expect(await client.getAccessTokenForResourceAsync(resourceA)).toEqual(a);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(client.getAccessTokenForResource(resourceB)).toEqual(b);
    expect(a.expiresAt).toBeGreaterThan(Date.now() / 1000 + 100);
    expect(a).not.toHaveProperty('refreshToken');
  });

  it('serializes rotating shared refresh tokens across different resources', async () => {
    fetch.mockImplementation(async (_input, init) => {
      const parameters = new URLSearchParams(String(init?.body));
      return tokenResponse(
        parameters.get('resource'),
        parameters.get('refresh_token') === 'refresh-0' ? 'refresh-1' : 'refresh-2',
      );
    });

    const [a, b] = await Promise.all([
      client.getAccessTokenForResourceAsync(resourceA),
      client.getAccessTokenForResourceAsync(resourceB),
    ]);
    expect(
      fetch.mock.calls.map(([, init]) =>
        new URLSearchParams(String(init.body)).get('refresh_token'),
      ),
    ).toEqual(['refresh-0', 'refresh-1']);
    expect(oidc.tokens.refreshToken).toBe('refresh-2');
    expect(oidc.tokens.accessToken).toBe('default-token');
    expect(client.getAccessTokenForResource(resourceA)).toEqual(a);
    expect(client.getAccessTokenForResource(resourceB)).toEqual(b);
  });

  it('notifies subscribers when a persisted resource token is restored without a network request', async () => {
    const token = await client.getAccessTokenForResourceAsync(resourceA);
    const restoredOidc = new Oidc(oidc.configuration, 'default', () => fetch);
    restoredOidc.tokens = oidc.tokens;
    const restoredClient = new OidcClient(restoredOidc);
    const listener = vi.fn();
    restoredOidc.subscribeEvents(listener);

    expect(restoredClient.getAccessTokenForResource(resourceA)).toBeNull();
    await expect(restoredClient.getAccessTokenForResourceAsync(resourceA)).resolves.toEqual(token);
    expect(fetch).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith(eventNames.resource_token_acquired, {
      resource: resourceA,
    });
    listener.mockClear();
    await restoredClient.getAccessTokenForResourceAsync(resourceA);
    expect(listener).not.toHaveBeenCalled();
  });

  it('does not restore a persisted token after the resource is cleared during its cache lookup', async () => {
    await client.getAccessTokenForResourceAsync(resourceA);
    let release: () => void;
    const gate = new Promise<void>(resolve => {
      release = resolve;
    });
    const initialize = oidc.initAsync.bind(oidc);
    const initialization = vi
      .spyOn(oidc, 'initAsync')
      .mockImplementationOnce(initialize)
      .mockImplementationOnce(async (...parameters) => {
        await gate;
        return initialize(...parameters);
      });

    const acquisition = client.getAccessTokenForResourceAsync(resourceA);
    const rejection = expect(acquisition).rejects.toMatchObject({
      code: OidcErrorCode.RESOURCE_TOKEN_UNAVAILABLE,
    });
    await vi.waitFor(() => expect(initialization).toHaveBeenCalledTimes(2));
    await client.clearResourceTokensAsync(resourceA);
    release();

    await rejection;
    expect(client.getAccessTokenForResource(resourceA)).toBeNull();
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('deduplicates concurrent requests for the same resource', async () => {
    const requests = [
      client.getAccessTokenForResourceAsync(resourceA),
      client.getAccessTokenForResourceAsync(resourceA),
    ];
    expect(requests[0]).toBe(requests[1]);
    await Promise.all(requests);
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('renews only the expired or explicitly selected token', async () => {
    await client.getAccessTokenForResourceAsync(resourceA);
    const b = await client.getAccessTokenForResourceAsync(resourceB);
    const name = getResourceContextName('default', resourceA);
    const saved = JSON.parse(storage.getItem(`oidc.${name}`));
    saved.tokens.expiresAt = Date.now() / 1000 - 1;
    storage.setItem(`oidc.${name}`, JSON.stringify(saved));
    await client.getAccessTokenForResourceAsync(resourceA);
    await client.getAccessTokenForResourceAsync(resourceA, { forceRenew: true });
    expect(fetch).toHaveBeenCalledTimes(4);
    expect(client.getAccessTokenForResource(resourceB)).toEqual(b);
  });

  it('clears one resource without revoking the shared grant or discarding its sibling', async () => {
    await client.getAccessTokenForResourceAsync(resourceA);
    const b = await client.getAccessTokenForResourceAsync(resourceB);
    await client.clearResourceTokensAsync(resourceA);
    expect(client.getAccessTokenForResource(resourceA)).toBeNull();
    expect(client.getAccessTokenForResource(resourceB)).toEqual(b);
    expect(oidc.tokens.refreshToken).toBe('refresh-0');
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it.each(['issuer', 'clientId', 'configurationName', 'resource', 'subject'])(
    'rejects cached tokens with a different %s',
    async field => {
      await client.getAccessTokenForResourceAsync(resourceA);
      const key = `oidc.${getResourceContextName('default', resourceA)}`;
      const saved = JSON.parse(storage.getItem(key));
      saved.tokens.resourceContext[field] = 'wrong';
      storage.setItem(key, JSON.stringify(saved));
      await expect(client.getAccessTokenForResourceAsync(resourceA)).rejects.toMatchObject({
        code: OidcErrorCode.RESOURCE_CONTEXT_MISMATCH,
      });
      expect(fetch).toHaveBeenCalledOnce();
    },
  );

  it('preserves invalid_target without retrying without resource', async () => {
    fetch.mockResolvedValue(
      new Response(
        JSON.stringify({ error: 'invalid_target', error_description: 'Resource is unsupported' }),
        { status: 400 },
      ),
    );
    await expect(client.getAccessTokenForResourceAsync(resourceA)).rejects.toMatchObject({
      code: OidcErrorCode.INVALID_TARGET,
      oauthError: 'invalid_target',
      oauthErrorDescription: 'Resource is unsupported',
    });
    expect(fetch).toHaveBeenCalledOnce();
    expect(oidc.tokens.accessToken).toBe('default-token');
  });

  it('requires a silent authorization setup for resources outside the known grant', async () => {
    oidc.configuration.resource = resourceA;
    await expect(client.getAccessTokenForResourceAsync(resourceB)).rejects.toThrow(
      'Configure silent_redirect_uri',
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it('silently authorizes scopes not granted to the original session instead of reusing its refresh token', async () => {
    oidc.tokens.scope = 'openid read';
    initSession('default', storage).setTokens(oidc.tokens);
    await expect(client.getAccessTokenForResourceAsync(resourceB)).rejects.toThrow(
      'Configure silent_redirect_uri',
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects resource worker fallback when the configured worker is unavailable', async () => {
    oidc.configuration.service_worker_relative_url = '/OidcServiceWorker.js';
    await expect(client.getAccessTokenForResourceAsync(resourceA)).rejects.toMatchObject({
      code: OidcErrorCode.RESOURCE_WORKER_UNSUPPORTED,
    });
    expect(fetch).not.toHaveBeenCalled();
    oidc.configuration.service_worker_relative_url = undefined;
  });

  it('negotiates the base capability and rejects an older worker before creating resource state', async () => {
    const postMessage = vi.fn(
      (message: unknown, options?: Transferable[] | StructuredSerializeOptions): void => {
        const port = (Array.isArray(options) ? options : options?.transfer)?.[0];
        if (!(port instanceof MessagePort))
          throw new Error('The adapter did not transfer a MessagePort.');
        if (!message || typeof message !== 'object' || !('configurationName' in message))
          throw new Error('The adapter omitted the configuration name.');
        port.postMessage({
          configurationName: message.configurationName,
          version: codeVersion,
          tokens: null,
        });
      },
    );
    const active: ServiceWorker = {
      postMessage,
      scriptURL: 'https://app.example.com/LegacyOidcServiceWorker.js',
      state: 'activated',
      onstatechange: null,
      onerror: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn().mockReturnValue(true),
    };
    const partialRegistration: Pick<
      ServiceWorkerRegistration,
      'active' | 'waiting' | 'installing' | 'addEventListener' | 'update'
    > = {
      active,
      waiting: null,
      installing: null,
      addEventListener: vi.fn(),
      update: vi.fn().mockResolvedValue(undefined),
    };
    const registration = partialRegistration as ServiceWorkerRegistration;
    vi.stubGlobal('navigator', {
      onLine: true,
      serviceWorker: {
        controller: active,
        ready: Promise.resolve(registration),
        addEventListener: vi.fn(),
      },
    });
    oidc.configuration.service_worker_relative_url = '/LegacyOidcServiceWorker.js';
    oidc.configuration.service_worker_activate = () => true;
    oidc.configuration.service_worker_register = async (): Promise<ServiceWorkerRegistration> =>
      registration;
    await expect(client.getAccessTokenForResourceAsync(resourceA)).rejects.toMatchObject({
      code: OidcErrorCode.RESOURCE_WORKER_UNSUPPORTED,
    });
    expect(postMessage).toHaveBeenCalledOnce();
    expect(postMessage.mock.calls[0][0]).toMatchObject({ configurationName: 'default' });
    expect(fetch).not.toHaveBeenCalled();
    registrationCache.clear();
    oidc.configuration.service_worker_relative_url = undefined;
  });

  it('does not allow invalid identifiers or conflicting token extras', async () => {
    await expect(
      client.getAccessTokenForResourceAsync('https://unknown.example.com/'),
    ).rejects.toThrow('registered');
    oidc.configuration.token_request_extras = { resource: resourceB };
    await expect(client.getAccessTokenForResourceAsync(resourceA)).rejects.toMatchObject({
      code: OidcErrorCode.INVALID_RESOURCE,
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('validates configured JWT audiences without assuming audience equals resource', async () => {
    oidc.configuration.resources = [
      {
        resource: resourceA,
        allowedUrlPrefixes: ['https://api.example.com/a'],
        audiences: ['api-a'],
      },
    ];
    fetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: jwt({ aud: 'api-a', iss: issuer, exp: Date.now() / 1000 + 120 }),
          expires_in: 120,
        }),
      ),
    );
    await expect(client.getAccessTokenForResourceAsync(resourceA)).resolves.toMatchObject({
      resource: resourceA,
    });
    fetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: jwt({ aud: 'api-b', iss: issuer, exp: Date.now() / 1000 + 120 }),
          expires_in: 120,
        }),
      ),
    );
    await expect(
      client.getAccessTokenForResourceAsync(resourceA, { forceRenew: true }),
    ).rejects.toMatchObject({ code: OidcErrorCode.RESOURCE_CONTEXT_MISMATCH });
  });

  it('does not resurrect a resource when a refresh completes after clearing it', async () => {
    let resolve: (response: Response) => void;
    fetch.mockImplementation(
      () =>
        new Promise<Response>(complete => {
          resolve = complete;
        }),
    );
    const request = client.getAccessTokenForResourceAsync(resourceA);
    const rejection = expect(request).rejects.toThrow('cleared');
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    await client.clearResourceTokensAsync(resourceA);
    resolve(tokenResponse(resourceA));
    await rejection;
    expect(client.getAccessTokenForResource(resourceA)).toBeNull();
    expect(
      JSON.parse(storage.getItem(`oidc.${getResourceContextName('default', resourceA)}`)).tokens,
    ).toBeNull();
  });

  it('clears all resource state on local session logout', async () => {
    await client.getAccessTokenForResourceAsync(resourceA);
    await client.getAccessTokenForResourceAsync(resourceB);
    await client.clearSessionAsync();
    expect(client.getAccessTokenForResource(resourceA)).toBeNull();
    expect(client.getAccessTokenForResource(resourceB)).toBeNull();
    expect(oidc.tokens).toBeNull();
  });

  it('retains shared refresh rotation after clearing only the requested resource', async () => {
    let complete: (response: Response) => void;
    fetch.mockImplementationOnce(
      () =>
        new Promise<Response>(resolve => {
          complete = resolve;
        }),
    );
    const pending = client.getAccessTokenForResourceAsync(resourceA);
    const rejection = expect(pending).rejects.toThrow('cleared');
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    await client.clearResourceTokensAsync(resourceA);
    complete(tokenResponse(resourceA, 'rotated-after-clear'));
    await rejection;
    expect(oidc.tokens.refreshToken).toBe('rotated-after-clear');
    expect(client.getAccessTokenForResource(resourceA)).toBeNull();
  });

  it('rejects a refresh response when the identity session changes during acquisition', async () => {
    let complete: (response: Response) => void;
    fetch.mockImplementationOnce(
      () =>
        new Promise<Response>(resolve => {
          complete = resolve;
        }),
    );
    const pending = client.getAccessTokenForResourceAsync(resourceA);
    const rejection = expect(pending).rejects.toThrow('session changed');
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    const replacement = createTokens();
    replacement.idTokenPayload.sub = 'new-user';
    replacement.refreshToken = 'new-session-refresh';
    oidc.tokens = replacement;
    initSession('default', storage).setTokens(replacement);
    complete(tokenResponse(resourceA, 'old-session-rotation'));
    await rejection;
    expect(oidc.tokens.refreshToken).toBe('new-session-refresh');
    expect(client.getAccessTokenForResource(resourceA)).toBeNull();
  });

  it('rejects insufficient returned scopes while retaining a rotated shared grant', async () => {
    fetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: 'wrong-scope',
          expires_in: 120,
          refresh_token: 'rotated',
          scope: 'write',
        }),
      ),
    );
    await expect(client.getAccessTokenForResourceAsync(resourceA)).rejects.toThrow(
      'required resource scopes',
    );
    expect(oidc.tokens.refreshToken).toBe('rotated');
    expect(client.getAccessTokenForResource(resourceA)).toBeNull();
  });

  it('surfaces network failures without silently substituting the default token', async () => {
    fetch.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(client.getAccessTokenForResourceAsync(resourceA)).rejects.toMatchObject({
      code: OidcErrorCode.NETWORK_ERROR,
    });
    expect(oidc.tokens.accessToken).toBe('default-token');
  });

  it('removes resource-owned transaction secrets without deleting the base context', async () => {
    await client.getAccessTokenForResourceAsync(resourceA);
    const session = initSession(getResourceContextName('default', resourceA), storage);
    await session.setStateAsync('resource-state');
    await session.setCodeVerifierAsync('resource-verifier');
    await session.setNonceAsync({ nonce: 'resource-nonce' });
    await session.setDemonstratingProofOfPossessionNonce('resource-dpop-nonce');
    await client.clearResourceTokensAsync(resourceA);
    expect(await session.getStateAsync()).toBeUndefined();
    expect(await session.getCodeVerifierAsync()).toBeUndefined();
    expect(await session.getNonceAsync()).toEqual({ nonce: undefined });
    expect(session.getDemonstratingProofOfPossessionNonce()).toBeUndefined();
    expect(await initSession('default', storage).getNonceAsync()).toEqual({ nonce: 'nonce' });
  });

  it('revokes resource tokens and independent grants without duplicating the shared refresh token', async () => {
    await client.getAccessTokenForResourceAsync(resourceA);
    await oidc.resourceTokens.acceptAuthorizationAsync(resourceB, {
      ...createTokens(),
      accessToken: 'independent-access',
      refreshToken: 'independent-refresh',
    });
    fetch.mockClear();
    fetch.mockResolvedValue(new Response(null, { status: 200 }));
    await oidc.logoutAsync(null, { 'no_reload:oidc': 'true' });
    expect(
      fetch.mock.calls
        .map(([, init]) => new URLSearchParams(String(init.body)).get('token'))
        .sort(),
    ).toEqual(
      [
        'default-token',
        'refresh-0',
        `${resourceA}-token`,
        'independent-access',
        'independent-refresh',
      ].sort(),
    );
    expect(oidc.tokens).toBeNull();
  });

  it('waits for a pending rotation before revoking the current grant during logout', async () => {
    let complete: (response: Response) => void;
    fetch.mockImplementationOnce(
      () =>
        new Promise<Response>(resolve => {
          complete = resolve;
        }),
    );
    const pending = client.getAccessTokenForResourceAsync(resourceA);
    const rejection = expect(pending).rejects.toThrow('cleared');
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    fetch.mockResolvedValue(new Response(null, { status: 200 }));
    const logout = oidc.logoutAsync(null, { 'no_reload:oidc': 'true' });
    await vi.waitFor(() => expect(oidc.isLoggingOut).toBe(true));
    complete(tokenResponse(resourceA, 'latest-refresh'));
    await rejection;
    await logout;
    const revoked = fetch.mock.calls
      .slice(1)
      .map(([, init]) => new URLSearchParams(String(init.body)).get('token'));
    expect(revoked).toContain('latest-refresh');
    expect(revoked).toContain(`${resourceA}-token`);
    expect(revoked).not.toContain('refresh-0');
  });

  it('rejects refresh-token reuse across separate authorization transactions', async () => {
    await expect(
      oidc.resourceTokens.acceptAuthorizationAsync(resourceB, createTokens()),
    ).rejects.toThrow('separate authorization');
    expect(oidc.tokens.refreshToken).toBe('refresh-0');
  });

  it.each([false, true])(
    'routes a real resource callback with DPoP=%s through its own state, nonce and PKCE without replacing default tokens',
    async isDpop => {
      oidc.configuration.demonstrating_proof_of_possession = isDpop;
      const originalKey = isDpop
        ? await generateJwkAsync(window)(
            oidc.configuration.demonstrating_proof_of_possession_configuration.generateKeyAlgorithm,
          )
        : undefined;
      if (originalKey)
        await initSession('default', storage).setDemonstratingProofOfPossessionJwkAsync(
          originalKey,
        );
      const context = initSession(getResourceContextName('default', resourceB), storage);
      await context.setNonceAsync({ nonce: 'resource-nonce' });
      await context.setStateAsync('resource-state');
      await context.setCodeVerifierAsync('resource-verifier');
      context.setLoginParams({ callbackPath: '/done', extras: {} });
      rememberResourceTransaction('default', 'resource-state', resourceB);
      oidc.location.getCurrentHref = () =>
        'https://app.example.com/silent-callback?state=resource-state&code=resource-code';
      fetch.mockResolvedValue(
        new Response(
          JSON.stringify({
            access_token: 'callback-access',
            refresh_token: 'callback-refresh',
            token_type: isDpop ? 'DPoP' : 'Bearer',
            expires_in: 120,
            id_token: jwt({
              iss: issuer,
              sub: 'user-one',
              nonce: 'resource-nonce',
              exp: Date.now() / 1000 + 3600,
            }),
          }),
        ),
      );
      expect(await oidc.loginCallbackAsync(true)).toMatchObject({
        callbackPath: '/done',
        parsedTokens: { accessToken: 'callback-access' },
      });
      expect(new URLSearchParams(String(fetch.mock.calls[0][1].body)).get('resource')).toBe(
        resourceB,
      );
      expect(new URLSearchParams(String(fetch.mock.calls[0][1].body)).get('code_verifier')).toBe(
        'resource-verifier',
      );
      expect(oidc.tokens.accessToken).toBe('default-token');
      expect(getCallbackResource('default', oidc.location.getCurrentHref())).toBeUndefined();
      if (originalKey) {
        expect(initSession('default', storage).getDemonstratingProofOfPossessionJwkAsync()).toEqual(
          originalKey,
        );
        expect(context.getDemonstratingProofOfPossessionJwkAsync()).toEqual(originalKey);
        const apiFetch = vi.fn<Fetch>().mockResolvedValue(new Response());
        await client.fetchForResource(resourceB, apiFetch)('https://api.example.com/b/items');
        const proof = new Headers(apiFetch.mock.calls[0][1].headers).get('DPoP');
        expect(parseJwt(proof.split('.')[1]).ath).toBe(
          await base64urlOfHashOfASCIIEncodingAsync('callback-access'),
        );
      }
    },
  );

  it('validates callback token extras after merging them with the selected resource', async () => {
    const context = initSession(getResourceContextName('default', resourceB), storage);
    await context.setNonceAsync({ nonce: 'resource-nonce' });
    await context.setStateAsync('resource-state');
    context.setLoginParams({ callbackPath: '/', extras: {} });
    rememberResourceTransaction('default', 'resource-state', resourceB);
    oidc.location.getCurrentHref = () =>
      'https://app.example.com/silent-callback?state=resource-state&code=resource-code';
    oidc.configuration.token_request_extras = { resource: resourceA };
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(oidc.loginCallbackAsync(true)).rejects.toMatchObject({
      code: OidcErrorCode.INVALID_RESOURCE,
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each(['missing ID token', 'missing nonce'])(
    'rejects a real resource callback with %s before persisting tokens',
    async failure => {
      const context = initSession(getResourceContextName('default', resourceB), storage);
      await context.setNonceAsync({ nonce: 'resource-nonce' });
      await context.setStateAsync('resource-state');
      await context.setCodeVerifierAsync('resource-verifier');
      context.setLoginParams({ callbackPath: '/', extras: {} });
      rememberResourceTransaction('default', 'resource-state', resourceB);
      oidc.location.getCurrentHref = () =>
        'https://app.example.com/silent-callback?state=resource-state&code=resource-code';
      fetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: 'unverified-resource',
            expires_in: 120,
            id_token:
              failure === 'missing ID token'
                ? undefined
                : jwt({
                    iss: issuer,
                    sub: 'user-one',
                    exp: Date.now() / 1000 + 3600,
                  }),
          }),
        ),
      );
      vi.spyOn(console, 'error').mockImplementation(() => {});
      await expect(oidc.loginCallbackAsync(true)).rejects.toMatchObject({
        code: OidcErrorCode.INVALID_NONCE,
      });
      expect(context.getTokens()).toBeNull();
      expect(oidc.tokens.accessToken).toBe('default-token');
    },
  );

  it('retries a DPoP nonce challenge with the bound grant key and persists the successful nonce', async () => {
    oidc.configuration.demonstrating_proof_of_possession = true;
    const context = initSession('default', storage);
    await context.setDemonstratingProofOfPossessionJwkAsync(
      await generateJwkAsync(window)(
        oidc.configuration.demonstrating_proof_of_possession_configuration.generateKeyAlgorithm,
      ),
    );
    fetch
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'use_dpop_nonce' }), {
          status: 400,
          headers: { 'DPoP-Nonce': 'required-nonce' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ access_token: 'dpop-resource', token_type: 'DPoP', expires_in: 120 }),
          { headers: { 'DPoP-Nonce': 'successful-nonce' } },
        ),
      );
    await client.getAccessTokenForResourceAsync(resourceA);
    expect(parseJwt(fetch.mock.calls[1][1].headers['DPoP'].split('.')[1])).toMatchObject({
      nonce: 'required-nonce',
      htm: 'POST',
      htu: `${issuer}/token`,
    });
    expect(context.getDemonstratingProofOfPossessionNonce()).toBe('successful-nonce');
  });
});

describe('resource-aware authenticated fetch', () => {
  it('does not restore an API DPoP nonce from a response arriving after resource clearing', async () => {
    oidc.configuration.demonstrating_proof_of_possession = true;
    await initSession('default', storage).setDemonstratingProofOfPossessionJwkAsync(
      await generateJwkAsync(window)(
        oidc.configuration.demonstrating_proof_of_possession_configuration.generateKeyAlgorithm,
      ),
    );
    fetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          access_token: 'dpop-resource',
          token_type: 'DPoP',
          expires_in: 120,
        }),
      ),
    );
    let complete: ((response: Response) => void) | undefined;
    const apiFetch = vi.fn<Fetch>().mockImplementation(
      () =>
        new Promise<Response>(resolve => {
          complete = resolve;
        }),
    );
    const pending = client.fetchForResource(resourceA, apiFetch)('https://api.example.com/a/items');
    await vi.waitFor(() => expect(apiFetch).toHaveBeenCalledOnce());
    await client.clearResourceTokensAsync(resourceA);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    if (!complete) throw new Error('The API request did not start.');
    complete(new Response('api', { headers: { 'DPoP-Nonce': 'late-nonce' } }));
    expect((await pending).ok).toBe(true);
    expect(
      initSession(
        getResourceContextName('default', resourceA),
        storage,
      ).getDemonstratingProofOfPossessionApiNonce(),
    ).toBeUndefined();
    expect(client.getAccessTokenForResource(resourceA)).toBeNull();
    expect(warn).toHaveBeenCalledOnce();
  });

  it('keeps API DPoP nonces separate by resource and from token-endpoint nonces', async () => {
    oidc.configuration.demonstrating_proof_of_possession = true;
    const base = initSession('default', storage);
    await base.setDemonstratingProofOfPossessionJwkAsync(
      await generateJwkAsync(window)(
        oidc.configuration.demonstrating_proof_of_possession_configuration.generateKeyAlgorithm,
      ),
    );
    await base.setDemonstratingProofOfPossessionNonce('authorization-nonce');
    fetch.mockImplementation(async (_input, init) => {
      const resource = new URLSearchParams(String(init.body)).get('resource');
      return new Response(
        JSON.stringify({ access_token: `${resource}-dpop`, token_type: 'DPoP', expires_in: 120 }),
      );
    });
    const apiFetch = vi.fn<Fetch>().mockImplementation(
      async input =>
        new Response('api', {
          headers: { 'DPoP-Nonce': String(input).includes('/a/') ? 'api-a-nonce' : 'api-b-nonce' },
        }),
    );
    const a = client.fetchForResource(resourceA, apiFetch);
    const b = client.fetchForResource(resourceB, apiFetch);
    await a('https://api.example.com/a/items');
    await b('https://api.example.com/b/items');
    await a('https://api.example.com/a/items');
    await b('https://api.example.com/b/items');
    const claims = apiFetch.mock.calls.map(([, init]) =>
      parseJwt(new Headers(init.headers).get('DPoP').split('.')[1]),
    );
    expect(claims[0]).not.toHaveProperty('nonce');
    expect(claims[1]).not.toHaveProperty('nonce');
    expect(claims[2].nonce).toBe('api-a-nonce');
    expect(claims[3].nonce).toBe('api-b-nonce');
    expect(base.getDemonstratingProofOfPossessionNonce()).toBe('authorization-nonce');
    await client.getAccessTokenForResourceAsync(resourceA, { forceRenew: true });
    expect(
      parseJwt(fetch.mock.calls[fetch.mock.calls.length - 1][1].headers['DPoP'].split('.')[1])
        .nonce,
    ).toBe('authorization-nonce');
    await a('https://api.example.com/a/items');
    expect(
      parseJwt(
        new Headers(apiFetch.mock.calls[apiFetch.mock.calls.length - 1][1].headers)
          .get('DPoP')
          .split('.')[1],
      ).nonce,
    ).toBe('api-a-nonce');
    await client.clearResourceTokensAsync(resourceA);
    expect(
      initSession(
        getResourceContextName('default', resourceA),
        storage,
      ).getDemonstratingProofOfPossessionApiNonce(),
    ).toBeUndefined();
    expect(
      initSession(
        getResourceContextName('default', resourceB),
        storage,
      ).getDemonstratingProofOfPossessionApiNonce(),
    ).toBe('api-b-nonce');
  });
  it.each(['https://api.example.com/b', 'https://api.example.com/v2/items'])(
    'never reuses the default token for a managed API origin without selection: %s',
    async destination => {
      const apiFetch = vi.fn<Fetch>();
      await expect(client.fetchWithTokens(apiFetch)(destination)).rejects.toThrow(
        'Select a resource explicitly',
      );
      expect(apiFetch).not.toHaveBeenCalled();
      expect(fetch).not.toHaveBeenCalled();
    },
  );
  it.each([resourceA, resourceB])('attaches only the token for %s', async resource => {
    const response = new Response('api response');
    const apiFetch = vi.fn<Fetch>().mockResolvedValue(response);
    const path = resource === resourceA ? 'a' : 'b';
    expect(
      await client.fetchForResource(resource, apiFetch)(`https://api.example.com/${path}/items`),
    ).toBe(response);
    expect(new Headers(apiFetch.mock.calls[0][1].headers).get('Authorization')).toBe(
      `Bearer ${resource}-token`,
    );
    expect(apiFetch.mock.calls[0][1].redirect).toBe('error');
  });

  it.each([
    'https://api.example.com/b/items',
    'https://api.example.com.evil.test/a',
    'https://api.example.com/a-other',
  ])('does not acquire or dispatch tokens to %s', async destination => {
    const apiFetch = vi.fn<Fetch>();
    await expect(client.fetchForResource(resourceA, apiFetch)(destination)).rejects.toMatchObject({
      code: OidcErrorCode.INVALID_RESOURCE,
    });
    expect(apiFetch).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects redirect following before acquisition or dispatch', async () => {
    const apiFetch = vi.fn<Fetch>();
    await expect(
      client.fetchForResource(resourceA, apiFetch)('https://api.example.com/a', {
        redirect: 'follow',
      }),
    ).rejects.toThrow('redirects');
    expect(apiFetch).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([undefined, 'https://%'])(
    'rejects invalid explicit selectors or URLs without default-token fallback',
    async value => {
      const apiFetch = vi.fn<Fetch>();
      const request =
        value === undefined
          ? client.fetchWithTokens(apiFetch, false, { resource: value })(
              'https://api.example.com/a',
            )
          : client.fetchForResource(resourceA, apiFetch)(value);
      await expect(request).rejects.toMatchObject({ code: OidcErrorCode.INVALID_RESOURCE });
      expect(apiFetch).not.toHaveBeenCalled();
      expect(fetch).not.toHaveBeenCalled();
    },
  );

  it('preserves Request method, body and signal and does not mutate headers', async () => {
    const controller = new AbortController();
    const input = new Request('https://api.example.com/a/items', {
      method: 'POST',
      body: 'payload',
      signal: controller.signal,
      headers: { 'X-Custom': 'kept' },
    });
    const headers = new Headers({ 'X-Init': 'kept' });
    const apiFetch = vi.fn<Fetch>().mockResolvedValue(new Response());
    await client.fetchWithTokens(apiFetch, false, { resource: resourceA })(input, { headers });
    const [request, init] = apiFetch.mock.calls[0];
    expect(request).toBe(input);
    expect(init.method).toBe('POST');
    expect(headers.has('Authorization')).toBe(false);
    expect(input.headers.has('Authorization')).toBe(false);
    expect(await input.text()).toBe('payload');
    controller.abort();
    expect(input.signal.aborted).toBe(true);
  });

  it.each(['inferred', 'explicit'])(
    'uses the resource token and shared grant key in %s DPoP mode',
    async mode => {
      oidc.configuration.demonstrating_proof_of_possession = true;
      const key = await generateJwkAsync(window)(
        oidc.configuration.demonstrating_proof_of_possession_configuration.generateKeyAlgorithm,
      );
      await initSession('default', storage).setDemonstratingProofOfPossessionJwkAsync(key);
      fetch.mockResolvedValue(
        new Response(
          JSON.stringify({
            access_token: 'resource-dpop-token',
            token_type: mode === 'inferred' ? 'DPoP' : 'Bearer',
            expires_in: 120,
          }),
        ),
      );
      const apiFetch = vi.fn<Fetch>().mockResolvedValue(new Response());
      const authenticatedFetch =
        mode === 'inferred'
          ? client.fetchForResource(resourceA, apiFetch)
          : client.fetchWithTokens(apiFetch, false, {
              resource: resourceA,
              demonstratingProofOfPossession: true,
            });
      await authenticatedFetch(
        new Request('https://api.example.com/a/items', { method: 'POST', body: 'payload' }),
      );
      const headers = new Headers(apiFetch.mock.calls[0][1].headers);
      expect(headers.get('Authorization')).toBe('DPoP resource-dpop-token');
      expect(parseJwt(headers.get('DPoP').split('.')[1])).toMatchObject({
        htm: 'POST',
        htu: 'https://api.example.com/a/items',
      });
      expect(headers.get('DPoP')).not.toContain('default-token');
      expect(parseJwt(headers.get('DPoP').split('.')[1]).ath).toBe(
        await base64urlOfHashOfASCIIEncodingAsync('resource-dpop-token'),
      );
    },
  );
});

describe('OAuth repeated resource transport', () => {
  it.each(['authorization', 'PAR', 'code', 'refresh'])(
    'serializes repeated resources in %s without changing scope encoding',
    async kind => {
      const parameters = {
        client_id: 'client',
        state: 'state',
        scope: 'openid read',
        resource: [resourceA, resourceB],
      };
      const network = vi
        .fn<Fetch>()
        .mockResolvedValue(
          new Response(
            JSON.stringify(
              kind === 'PAR'
                ? { request_uri: 'urn:request:one', expires_in: 60 }
                : { access_token: 'token', expires_in: 60 },
            ),
            { status: kind === 'PAR' ? 201 : 200 },
          ),
        );
      const open = vi.fn();
      const location = {
        open,
        reload: vi.fn(),
        getCurrentHref: () => '',
        getPath: () => '',
        getOrigin: () => '',
      };
      const session = initSession('default', storage);
      let encoded: string;
      if (kind === 'authorization') {
        await performAuthorizationRequestAsync(session, location)(
          `${issuer}/authorize`,
          parameters,
        );
        encoded = open.mock.calls[0][0].split('?')[1];
      } else if (kind === 'PAR') {
        await performPushedAuthorizationRequestAsync(network)(`${issuer}/par`, parameters);
        encoded = String(network.mock.calls[0][1].body);
      } else if (kind === 'code') {
        vi.stubGlobal('fetch', network);
        await session.setCodeVerifierAsync('verifier');
        await performFirstTokenRequestAsync(session)(
          `${issuer}/token`,
          parameters,
          {},
          TokenRenewMode.access_token_invalid,
        );
        encoded = String(network.mock.calls[0][1].body);
      } else {
        await performTokenRequestAsync(network)(
          `${issuer}/token`,
          { ...parameters, grant_type: 'refresh_token' },
          {},
          null,
          {},
          TokenRenewMode.access_token_invalid,
        );
        encoded = String(network.mock.calls[0][1].body);
      }
      expect(new URLSearchParams(encoded).getAll('resource')).toEqual([resourceA, resourceB]);
      expect(encoded).toContain('scope=openid%20read');
    },
  );

  it('associates callback state with its resource and cancels only that resource', () => {
    rememberResourceTransaction('default', 'state-a', resourceA);
    rememberResourceTransaction('default', 'state-b', resourceB);
    cancelResourceTransactions('default', resourceA);
    expect(
      getCallbackResource('default', 'https://app.example.com/callback?state=state-a'),
    ).toBeUndefined();
    expect(getCallbackResource('default', 'https://app.example.com/callback?state=state-b')).toBe(
      resourceB,
    );
  });
});

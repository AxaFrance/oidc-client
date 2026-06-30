// Tests for the guards added to loginCallbackAsync to surface missing /
// mismatched state and missing nonce as typed `OidcStateError` instead of a
// generic TypeError. See https://github.com/AxaFrance/oidc-client/issues/1678
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ILOidcLocation } from './location';
import { loginCallbackAsync } from './login';
import { OidcErrorCode, OidcLoginRequiredError, OidcServerError } from './oidcError';
import { OidcStateError, OidcStateErrorCode } from './oidcStateError';

const makeStorage = (): Storage => {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      for (const key of Object.keys(store)) {
        delete store[key];
      }
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
    [Symbol.iterator]: function* () {
      yield* Object.entries(store);
    },
  } as unknown as Storage;
};

class FakeLocation implements ILOidcLocation {
  constructor(private currentHref: string) {}
  open(): void {}
  reload(): void {}
  getCurrentHref(): string {
    return this.currentHref;
  }
  getPath(): string {
    return '/callback';
  }
  getOrigin(): string {
    return 'http://localhost:4200';
  }
}

const buildOidc = ({ href, storage }: { href: string; storage: Storage }) => {
  const publishedEvents: Array<{ name: string; data: unknown }> = [];
  const configurationName = 'default';
  const configuration = {
    client_id: 'interactive.public.short',
    redirect_uri: 'http://localhost:4200/authentication/callback',
    silent_redirect_uri: 'http://localhost:4200/authentication/silent-callback',
    scope: 'openid profile email',
    authority: 'http://api',
    refresh_time_before_tokens_expiration_in_second: 70,
    token_request_timeout: 30000,
    authority_configuration: null,
    storage,
    login_state_storage: storage,
    // no service_worker_relative_url -> initWorkerAsync returns null
  };
  const oidc: any = {
    configuration,
    configurationName,
    location: new FakeLocation(href),
    publishEvent: (name: string, data: unknown) => {
      publishedEvents.push({ name, data });
    },
    initAsync: vi.fn(async () => ({
      issuer: 'http://api',
      authorizationEndpoint: 'http://api/connect/authorize',
      tokenEndpoint: 'http://api/connect/token',
      checkSessionIframe: 'http://api/connect/checksession',
    })),
    startCheckSessionAsync: vi.fn(async () => undefined),
  };
  return { oidc, publishedEvents };
};

describe('loginCallbackAsync — state/nonce guards (issue #1678)', () => {
  let storage: Storage;

  beforeEach(() => {
    storage = makeStorage();
  });

  it('throws OidcStateError(STATE_MISSING) when stored state is missing but callback URL contains state', async () => {
    // No `oidc.state.default` written into storage at all (simulates a
    // private-browsing tab, manual storage clear, or browser eviction
    // between the authorize redirect and the callback).
    const href = 'http://localhost:4200/authentication/callback?code=abc&state=server-state-value';
    const { oidc, publishedEvents } = buildOidc({ href, storage });

    await expect(loginCallbackAsync(oidc)()).rejects.toBeInstanceOf(OidcStateError);
    await expect(loginCallbackAsync(oidc)()).rejects.toMatchObject({
      code: OidcStateErrorCode.STATE_MISSING,
    });

    // The error must also be published as a loginCallbackAsync_error event
    // so listeners (incl. the React provider) can react to it.
    const errorEvent = publishedEvents.find(e => e.name === 'loginCallbackAsync_error');
    expect(errorEvent).toBeDefined();
    expect(errorEvent!.data).toBeInstanceOf(OidcStateError);
  });

  it('throws OidcStateError(STATE_MISMATCH) when the stored state differs from the returned one', async () => {
    storage[`oidc.state.default`] = 'stored-state-value';
    storage[`oidc.nonce.default`] = 'stored-nonce-value';
    const href =
      'http://localhost:4200/authentication/callback?code=abc&state=different-state-value';
    const { oidc } = buildOidc({ href, storage });

    await expect(loginCallbackAsync(oidc)()).rejects.toBeInstanceOf(OidcStateError);
    await expect(loginCallbackAsync(oidc)()).rejects.toMatchObject({
      code: OidcStateErrorCode.STATE_MISMATCH,
    });
  });

  it('throws OidcStateError(NONCE_MISSING) when state is valid but nonce is missing from storage', async () => {
    storage[`oidc.state.default`] = 'matching-state';
    // No oidc.nonce.default written -> getNonceAsync returns { nonce: undefined }
    const href = 'http://localhost:4200/authentication/callback?code=abc&state=matching-state';
    const { oidc } = buildOidc({ href, storage });

    await expect(loginCallbackAsync(oidc)()).rejects.toBeInstanceOf(OidcStateError);
    await expect(loginCallbackAsync(oidc)()).rejects.toMatchObject({
      code: OidcStateErrorCode.NONCE_MISSING,
    });
  });

  it('does not throw a generic TypeError when state and nonce are both missing', async () => {
    // Regression: before the fix, a missing nonce would surface as
    // "Cannot read properties of undefined (reading 'nonce')" when reaching
    // isTokensOidcValid(..., nonceData.nonce, ...).
    const href = 'http://localhost:4200/authentication/callback?code=abc&state=server-state-value';
    const { oidc } = buildOidc({ href, storage });

    let caught: unknown;
    try {
      await loginCallbackAsync(oidc)();
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(OidcStateError);
    expect(caught).not.toBeInstanceOf(TypeError);
  });
});

describe('loginCallbackAsync — typed IdP error responses (issue #1676)', () => {
  let storage: Storage;

  beforeEach(() => {
    storage = makeStorage();
  });

  it('throws OidcLoginRequiredError when the IdP returns error=login_required', async () => {
    const href =
      'http://localhost:4200/authentication/callback?error=login_required&error_description=User%20must%20re-authenticate';
    const { oidc, publishedEvents } = buildOidc({ href, storage });

    let caught: unknown;
    try {
      await loginCallbackAsync(oidc)();
    } catch (e) {
      caught = e;
    }

    expect(caught).toBeInstanceOf(OidcLoginRequiredError);
    // The login_required error is also an OidcServerError so consumers can
    // either match the specific subclass or branch on the parent type.
    expect(caught).toBeInstanceOf(OidcServerError);
    expect((caught as OidcLoginRequiredError).code).toBe(OidcErrorCode.LOGIN_REQUIRED);
    expect((caught as OidcLoginRequiredError).serverError).toBe('login_required');
    expect((caught as OidcLoginRequiredError).serverErrorDescription).toBe(
      'User must re-authenticate',
    );
    // Message text is preserved for legacy string-matching consumers.
    expect((caught as Error).message).toBe(
      'Error from OIDC server: login_required - User must re-authenticate',
    );

    const errorEvent = publishedEvents.find(e => e.name === 'loginCallbackAsync_error');
    expect(errorEvent).toBeDefined();
    expect(errorEvent!.data).toBeInstanceOf(OidcLoginRequiredError);
  });

  it('throws OidcServerError for non-login_required IdP errors', async () => {
    const href =
      'http://localhost:4200/authentication/callback?error=invalid_request&error_description=redirect_uri%20mismatch';
    const { oidc } = buildOidc({ href, storage });

    let caught: unknown;
    try {
      await loginCallbackAsync(oidc)();
    } catch (e) {
      caught = e;
    }

    expect(caught).toBeInstanceOf(OidcServerError);
    expect(caught).not.toBeInstanceOf(OidcLoginRequiredError);
    expect((caught as OidcServerError).code).toBe(OidcErrorCode.OIDC_SERVER_ERROR);
    expect((caught as OidcServerError).serverError).toBe('invalid_request');
    expect((caught as OidcServerError).serverErrorDescription).toBe('redirect_uri mismatch');
    expect((caught as Error).message).toBe(
      'Error from OIDC server: invalid_request - redirect_uri mismatch',
    );
  });
});

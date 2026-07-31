import { afterEach, describe, expect, it, vi } from 'vitest';

import { OidcError, OidcErrorCode, serializeOidcError } from './oidcError';
import { isOidcStateError, OidcStateError, OidcStateErrorCode } from './oidcStateError';
import { _silentLoginAsync } from './silentLogin';

const installDom = () => {
  const contentWindow = {};
  const iframe = {
    contentWindow,
    height: '',
    id: '',
    remove: vi.fn(),
    setAttribute: vi.fn(),
    style: { display: '' },
    width: '',
  };
  let listener: (event: MessageEvent) => void;
  vi.stubGlobal('document', {
    body: { appendChild: vi.fn() },
    createElement: vi.fn(() => iframe),
  });
  vi.stubGlobal('window', {
    addEventListener: vi.fn((_name: string, callback: (event: MessageEvent) => void) => {
      listener = callback;
    }),
    removeEventListener: vi.fn(),
  });
  return { contentWindow, iframe, getListener: () => listener };
};

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('_silentLoginAsync typed errors', () => {
  it('rejects with SILENT_LOGIN_TIMEOUT and publishes the same error', async () => {
    vi.useFakeTimers();
    installDom();
    const publishEvent = vi.fn();

    const promise = _silentLoginAsync(
      'default',
      {
        authority: 'https://issuer.example.com',
        client_id: 'client',
        redirect_uri: 'https://client.example.com/callback',
        scope: 'openid',
        silent_login_uri: 'https://issuer.example.com/silent-login',
        silent_redirect_uri: 'https://client.example.com/silent-callback',
        silent_login_timeout: 25,
      },
      publishEvent,
      'refresh',
    )();
    const rejection = expect(promise).rejects.toMatchObject({
      code: OidcErrorCode.SILENT_LOGIN_TIMEOUT,
      message: 'timeout',
      phase: 'refresh',
      retryable: true,
    });

    await vi.advanceTimersByTimeAsync(25);
    await rejection;
    const publishedError = publishEvent.mock.calls.find(
      ([name]) => name === 'silentLoginAsync_error',
    )?.[1];
    expect(publishedError).toBeInstanceOf(OidcError);
    expect(publishedError.code).toBe(OidcErrorCode.SILENT_LOGIN_TIMEOUT);
  });

  it('reconstructs a serialized OidcError received from the callback iframe', async () => {
    const { contentWindow, getListener } = installDom();
    const publishEvent = vi.fn();
    const original = new OidcError(OidcErrorCode.LOGIN_REQUIRED, 'login required', {
      phase: 'refresh',
      retryable: false,
      oauthError: 'login_required',
    });

    const promise = _silentLoginAsync(
      'default',
      {
        authority: 'https://issuer.example.com',
        client_id: 'client',
        redirect_uri: 'https://client.example.com/callback',
        scope: 'openid',
        silent_login_uri: 'https://issuer.example.com/silent-login',
        silent_redirect_uri: 'https://client.example.com/silent-callback',
        silent_login_timeout: 1000,
      },
      publishEvent,
      'refresh',
    )();
    getListener()({
      origin: 'https://issuer.example.com',
      source: contentWindow,
      data: `default_oidc_exception:${JSON.stringify({
        error: original.toString(),
        oidcError: serializeOidcError(original),
      })}`,
    } as unknown as MessageEvent);

    await expect(promise).rejects.toMatchObject({
      code: OidcErrorCode.LOGIN_REQUIRED,
      phase: 'refresh',
      oauthError: 'login_required',
    });
  });

  it('keeps serialized OidcStateError instances detectable after the iframe round-trip', async () => {
    const { contentWindow, getListener } = installDom();
    const publishEvent = vi.fn();
    const original = new OidcStateError(
      OidcStateErrorCode.NONCE_MISSING,
      'refresh token: nonce missing from storage',
      'refresh',
    );

    const promise = _silentLoginAsync(
      'default',
      {
        authority: 'https://issuer.example.com',
        client_id: 'client',
        redirect_uri: 'https://client.example.com/callback',
        scope: 'openid',
        silent_login_uri: 'https://issuer.example.com/silent-login',
        silent_redirect_uri: 'https://client.example.com/silent-callback',
        silent_login_timeout: 1000,
      },
      publishEvent,
      'refresh',
    )();
    getListener()({
      origin: 'https://issuer.example.com',
      source: contentWindow,
      data: `default_oidc_exception:${JSON.stringify({
        error: original.toString(),
        oidcError: serializeOidcError(original),
      })}`,
    } as unknown as MessageEvent);

    let thrownError: unknown;
    try {
      await promise;
    } catch (error) {
      thrownError = error;
    }

    expect(isOidcStateError(thrownError)).toBe(true);
    expect(thrownError).toMatchObject({
      code: OidcStateErrorCode.NONCE_MISSING,
      phase: 'refresh',
      name: 'OidcStateError',
    });
  });
});

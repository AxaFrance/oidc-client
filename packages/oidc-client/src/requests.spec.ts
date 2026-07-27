import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { ILOidcLocation } from './location';
import {
  PushedAuthorizationRequestError,
  PushedAuthorizationRequestErrorCode,
} from './pushedAuthorizationRequestError';
import {
  performAuthorizationRequestAsync,
  performPushedAuthorizationRequestAsync,
} from './requests';
import { Fetch } from './types';

class FakeLocation implements ILOidcLocation {
  openedUrl: string = null;

  open(url: string): void {
    this.openedUrl = url;
  }

  reload(): void {}

  getCurrentHref(): string {
    return '';
  }

  getPath(): string {
    return '/';
  }

  getOrigin(): string {
    return 'https://client.example.com';
  }
}

const createResponse = (status: number, data: unknown): Response =>
  ({
    status,
    json: vi.fn(async () => data),
  }) as unknown as Response;

const asFetch = (mock: ReturnType<typeof vi.fn>): Fetch => mock as unknown as Fetch;

describe('Pushed Authorization Requests', () => {
  it('posts the authorization parameters as form data and accepts a RFC 9126 response', async () => {
    const fetchMock = vi.fn(async (_url: string, _request: RequestInit) =>
      createResponse(201, {
        request_uri: 'urn:ietf:params:oauth:request_uri:abc',
        expires_in: 90,
      }),
    );

    const result = await performPushedAuthorizationRequestAsync(asFetch(fetchMock))(
      'https://issuer.example.com/par',
      {
        client_id: 'client',
        redirect_uri: 'https://client.example.com/callback',
        scope: 'openid profile',
        state: 'state-value',
      },
    );

    expect(result).toEqual({
      request_uri: 'urn:ietf:params:oauth:request_uri:abc',
      expires_in: 90,
    });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, request] = fetchMock.mock.calls[0];
    expect(url).toBe('https://issuer.example.com/par');
    expect(request.method).toBe('POST');
    expect(request.headers).toEqual({
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
    });
    expect(Object.fromEntries(new URLSearchParams(request.body as string))).toEqual({
      client_id: 'client',
      redirect_uri: 'https://client.example.com/callback',
      scope: 'openid profile',
      state: 'state-value',
    });
  });

  it('surfaces OAuth error details returned by the PAR endpoint', async () => {
    const fetchMock = vi.fn(async () =>
      createResponse(400, {
        error: 'invalid_request',
        error_description: 'redirect_uri is invalid',
      }),
    );

    await expect(
      performPushedAuthorizationRequestAsync(asFetch(fetchMock))('https://issuer.example.com/par', {
        client_id: 'client',
      }),
    ).rejects.toMatchObject({
      name: 'PushedAuthorizationRequestError',
      code: PushedAuthorizationRequestErrorCode.REQUEST_FAILED,
      status: 400,
      oauthError: 'invalid_request',
      oauthErrorDescription: 'redirect_uri is invalid',
    });
  });

  it.each([
    [{ expires_in: 90 }, 'missing request_uri'],
    [{ request_uri: 'urn:request:abc' }, 'missing expires_in'],
    [{ request_uri: '', expires_in: 90 }, 'empty request_uri'],
    [{ request_uri: 'urn:request:abc', expires_in: 0 }, 'invalid expires_in'],
  ])('rejects an invalid successful response (%s: %s)', async (data: any, _description) => {
    const fetchMock = vi.fn(async () => createResponse(201, data));

    await expect(
      performPushedAuthorizationRequestAsync(asFetch(fetchMock))('https://issuer.example.com/par', {
        client_id: 'client',
      }),
    ).rejects.toMatchObject({
      code: PushedAuthorizationRequestErrorCode.INVALID_RESPONSE,
      status: 201,
    });
  });

  it('rejects request_uri in the pushed parameters before sending a request', async () => {
    const fetchMock = vi.fn();

    await expect(
      performPushedAuthorizationRequestAsync(asFetch(fetchMock))('https://issuer.example.com/par', {
        client_id: 'client',
        request_uri: 'urn:request:not-allowed',
      }),
    ).rejects.toBeInstanceOf(PushedAuthorizationRequestError);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('performAuthorizationRequestAsync', () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');

  beforeAll(() => {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: { crypto: globalThis.crypto },
    });
  });

  afterAll(() => {
    if (originalWindow) {
      Object.defineProperty(globalThis, 'window', originalWindow);
    } else {
      delete (globalThis as { window?: unknown }).window;
    }
  });

  it('keeps the existing front-channel authorization request when PAR is not selected', async () => {
    const storage = {
      setCodeVerifierAsync: vi.fn(async () => undefined),
      setStateAsync: vi.fn(async () => undefined),
    };
    const location = new FakeLocation();

    await performAuthorizationRequestAsync(storage, location)(
      'https://issuer.example.com/authorize',
      {
        client_id: 'client',
        redirect_uri: 'https://client.example.com/callback',
        response_type: 'code',
        scope: 'openid',
        state: 'state-value',
      },
    );

    const url = new URL(location.openedUrl);
    expect(url.origin + url.pathname).toBe('https://issuer.example.com/authorize');
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      client_id: 'client',
      redirect_uri: 'https://client.example.com/callback',
      response_type: 'code',
      scope: 'openid',
      state: 'state-value',
      code_challenge_method: 'S256',
    });
    expect(url.searchParams.get('code_challenge')).toBeTruthy();
    expect(storage.setCodeVerifierAsync).toHaveBeenCalledWith(expect.any(String));
    expect(storage.setStateAsync).toHaveBeenCalledWith('state-value');
  });

  it('pushes the complete PKCE request and redirects with only client_id and request_uri', async () => {
    const storage = {
      setCodeVerifierAsync: vi.fn(async () => undefined),
      setStateAsync: vi.fn(async () => undefined),
    };
    const location = new FakeLocation();
    const fetchMock = vi.fn(async (_url: string, _request: RequestInit) =>
      createResponse(201, {
        request_uri: 'urn:ietf:params:oauth:request_uri:abc/123',
        expires_in: 60,
      }),
    );

    await performAuthorizationRequestAsync(storage, location)(
      'https://issuer.example.com/authorize',
      {
        client_id: 'client',
        redirect_uri: 'https://client.example.com/callback',
        response_type: 'code',
        scope: 'openid profile',
        state: 'state-value',
        nonce: 'nonce-value',
      },
      {
        endpoint: 'https://issuer.example.com/par',
        fetch: asFetch(fetchMock),
        timeoutMs: 5000,
      },
    );

    const [, request] = fetchMock.mock.calls[0];
    const pushedParameters = Object.fromEntries(new URLSearchParams(request.body as string));
    expect(pushedParameters).toMatchObject({
      client_id: 'client',
      redirect_uri: 'https://client.example.com/callback',
      response_type: 'code',
      scope: 'openid profile',
      state: 'state-value',
      nonce: 'nonce-value',
      code_challenge_method: 'S256',
    });
    expect(pushedParameters.code_challenge).toBeTruthy();

    const redirect = new URL(location.openedUrl);
    expect(Object.fromEntries(redirect.searchParams)).toEqual({
      client_id: 'client',
      request_uri: 'urn:ietf:params:oauth:request_uri:abc/123',
    });
  });
});

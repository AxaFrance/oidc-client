import { afterEach, describe, expect, it, vi } from 'vitest';

import { TokenRenewMode } from './parseTokens';
import {
  performFirstTokenRequestAsync,
  performPushedAuthorizationRequestAsync,
  performRevocationRequestAsync,
  performTokenRequestAsync,
} from './requests';
import type { Fetch, StringMap } from './types';

describe('OAuth request form encoding', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each(['revocation', 'token', 'first token', 'PAR'])(
    'preserves encoding and parameters for %s requests',
    async requestType => {
      const fetch = vi
        .fn<Fetch>()
        .mockResolvedValue(
          new Response(
            JSON.stringify(
              requestType === 'PAR'
                ? { request_uri: 'urn:request:example', expires_in: 60 }
                : { access_token: 'opaque', issued_at: 1000, expires_in: 60 },
            ),
            { status: requestType === 'PAR' ? 201 : 200 },
          ),
        );
      const parameters = {
        'custom key': 'a+b &c=値',
        scope: 'openid profile',
        empty: '',
      };
      const endpoint = 'https://issuer.example.com/endpoint';
      const expectedParameters: StringMap = { ...parameters };

      if (requestType === 'revocation') {
        await performRevocationRequestAsync(fetch)(
          endpoint,
          'opaque',
          'access_token',
          'client',
          parameters,
        );
        Object.assign(expectedParameters, {
          token: 'opaque',
          token_type_hint: 'access_token',
          client_id: 'client',
        });
      } else if (requestType === 'token') {
        await performTokenRequestAsync(fetch)(
          endpoint,
          { grant_type: 'refresh_token' },
          parameters,
          null,
          {},
          TokenRenewMode.access_token_invalid,
        );
        expectedParameters.grant_type = 'refresh_token';
      } else if (requestType === 'first token') {
        vi.stubGlobal('fetch', fetch);
        const storage = {
          getCodeVerifierAsync: vi.fn().mockResolvedValue('test-verifier'),
          setCodeVerifierAsync: vi.fn(),
          setStateAsync: vi.fn(),
        };
        await performFirstTokenRequestAsync(storage)(
          endpoint,
          parameters,
          {},
          TokenRenewMode.access_token_invalid,
        );
        expectedParameters.code_verifier = 'test-verifier';
        expect(storage.setCodeVerifierAsync).toHaveBeenCalledWith(null);
        expect(storage.setStateAsync).toHaveBeenCalledWith(null);
      } else {
        await performPushedAuthorizationRequestAsync(fetch)(endpoint, parameters);
      }

      expect(fetch).toHaveBeenCalledOnce();
      const [url, request] = fetch.mock.calls[0];
      expect(url).toBe(endpoint);
      expect(request.method).toBe('POST');
      expect(request.headers).toEqual({
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      });
      expect(request.body).toContain('custom%20key=a%2Bb%20%26c%3D%E5%80%A4');
      expect(request.body).toContain('scope=openid%20profile');
      expect(Object.fromEntries(new URLSearchParams(request.body as string))).toEqual(
        expectedParameters,
      );
      expect(parameters).toEqual({
        'custom key': 'a+b &c=値',
        scope: 'openid profile',
        empty: '',
      });
    },
  );

  it('does not let revocation extras override existing parameters', async () => {
    const fetch = vi.fn<Fetch>().mockResolvedValue(new Response(null, { status: 200 }));

    await performRevocationRequestAsync(fetch)(
      'https://issuer.example.com/revoke',
      'original',
      'access_token',
      'client',
      { token: 'replacement', client_id: 'other', token_type_hint: 'refresh_token' },
    );

    expect(fetch.mock.calls[0][1].body).toBe(
      'token=original&token_type_hint=access_token&client_id=client',
    );
  });

  it('preserves enumerable inherited parameters in token requests', async () => {
    const fetch = vi.fn<Fetch>().mockResolvedValue(new Response('{}', { status: 400 }));
    const details: StringMap = Object.assign(Object.create({ inherited: 'value' }), {
      grant_type: 'refresh_token',
    });

    await performTokenRequestAsync(fetch)(
      'https://issuer.example.com/token',
      details,
      { grant_type: 'ignored', extra: 'added' },
      null,
      {},
      TokenRenewMode.access_token_invalid,
    );

    expect(fetch.mock.calls[0][1].body).toBe(
      'grant_type=refresh_token&extra=added&inherited=value',
    );
    expect(details.extra).toBe('added');
  });
});

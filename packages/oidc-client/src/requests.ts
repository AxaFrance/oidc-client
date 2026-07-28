import { getFromCache, setCache } from './cache.js';
import { deriveChallengeAsync, generateRandom } from './crypto.js';
import { ILOidcLocation } from './location';
import { OidcAuthorizationServiceConfiguration } from './oidc.js';
import { parseOriginalTokens } from './parseTokens.js';
import {
  PushedAuthorizationRequestError,
  PushedAuthorizationRequestErrorCode,
} from './pushedAuthorizationRequestError.js';
import { Fetch, StringMap } from './types.js';

const oneHourSecond = 60 * 60;
export const fetchFromIssuer =
  fetch =>
  async (
    openIdIssuerUrl: string,
    timeCacheSecond = oneHourSecond,
    storage = window.sessionStorage,
    timeoutMs = 10000,
  ): Promise<OidcAuthorizationServiceConfiguration> => {
    const fullUrl = `${openIdIssuerUrl}/.well-known/openid-configuration`;

    const localStorageKey = `oidc.server:${openIdIssuerUrl}`;
    const data = getFromCache(localStorageKey, storage, timeCacheSecond);
    if (data) {
      return new OidcAuthorizationServiceConfiguration(data);
    }
    const response = await internalFetch(fetch)(fullUrl, {}, timeoutMs);

    if (response.status !== 200) {
      return null;
    }

    const result = await response.json();

    setCache(localStorageKey, result, storage);
    return new OidcAuthorizationServiceConfiguration(result);
  };

const internalFetch =
  fetch =>
  async (url: string, headers = {}, timeoutMs = 10000, numberRetry = 0): Promise<Response> => {
    let response;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      try {
        response = await fetch(url, { ...headers, signal: controller.signal });
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (e: any) {
      if (e.name === 'AbortError' || e.message === 'Network request failed') {
        if (numberRetry <= 1) {
          return await internalFetch(fetch)(url, headers, timeoutMs, numberRetry + 1);
        } else {
          throw e;
        }
      } else {
        console.error(e.message);
        throw e; // rethrow other unexpected errors
      }
    }
    return response;
  };

export const TOKEN_TYPE = {
  refresh_token: 'refresh_token',
  access_token: 'access_token',
};

export const performRevocationRequestAsync =
  fetch =>
  async (
    url,
    token,
    token_type = TOKEN_TYPE.refresh_token,
    client_id,
    extras: StringMap = {},
    timeoutMs = 10000,
  ) => {
    const details = {
      token,
      token_type_hint: token_type,
      client_id,
    };
    for (const [key, value] of Object.entries(extras)) {
      if (details[key] === undefined) {
        details[key] = value;
      }
    }

    const formBody = [];
    for (const property in details) {
      const encodedKey = encodeURIComponent(property);
      const encodedValue = encodeURIComponent(details[property]);
      formBody.push(`${encodedKey}=${encodedValue}`);
    }
    const formBodyString = formBody.join('&');

    const response = await internalFetch(fetch)(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        },
        body: formBodyString,
      },
      timeoutMs,
    );
    if (response.status !== 200) {
      return { success: false };
    }
    return {
      success: true,
    };
  };

type PerformTokenRequestResponse = {
  success: boolean;
  status?: number;
  data?: any;
  demonstratingProofOfPossessionNonce?: string;
};

export type PushedAuthorizationRequestResponse = {
  request_uri: string;
  expires_in: number;
};

const getResponseJsonAsync = async (response: Response): Promise<any> => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

export const performPushedAuthorizationRequestAsync =
  (fetch: Fetch) =>
  async (
    url: string,
    details: StringMap,
    timeoutMs = 10000,
  ): Promise<PushedAuthorizationRequestResponse> => {
    if (details.request_uri !== undefined) {
      throw new PushedAuthorizationRequestError(
        PushedAuthorizationRequestErrorCode.REQUEST_FAILED,
        'The request_uri parameter must not be included in a pushed authorization request.',
      );
    }

    const formBody = [];
    for (const property in details) {
      const encodedKey = encodeURIComponent(property);
      const encodedValue = encodeURIComponent(details[property]);
      formBody.push(`${encodedKey}=${encodedValue}`);
    }

    let response: Response;
    try {
      response = await internalFetch(fetch)(
        url,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          },
          body: formBody.join('&'),
        },
        timeoutMs,
      );
    } catch (cause) {
      throw new PushedAuthorizationRequestError(
        PushedAuthorizationRequestErrorCode.REQUEST_FAILED,
        'The pushed authorization request could not be sent.',
        { cause },
      );
    }

    const data = await getResponseJsonAsync(response);
    if (response.status !== 201) {
      const oauthError = typeof data?.error === 'string' ? data.error : undefined;
      const oauthErrorDescription =
        typeof data?.error_description === 'string' ? data.error_description : undefined;
      const serverError = [oauthError, oauthErrorDescription].filter(Boolean).join(': ');
      throw new PushedAuthorizationRequestError(
        PushedAuthorizationRequestErrorCode.REQUEST_FAILED,
        `The pushed authorization request failed with HTTP status ${response.status}${
          serverError ? ` (${serverError})` : ''
        }.`,
        {
          status: response.status,
          oauthError,
          oauthErrorDescription,
        },
      );
    }

    if (
      typeof data?.request_uri !== 'string' ||
      data.request_uri.length === 0 ||
      !Number.isInteger(data?.expires_in) ||
      data.expires_in <= 0
    ) {
      throw new PushedAuthorizationRequestError(
        PushedAuthorizationRequestErrorCode.INVALID_RESPONSE,
        'The pushed authorization response must contain a non-empty request_uri and a positive integer expires_in.',
        { status: response.status },
      );
    }

    return {
      request_uri: data.request_uri,
      expires_in: data.expires_in,
    };
  };

export const performTokenRequestAsync =
  (fetch: Fetch) =>
  async (
    url: string,
    details,
    extras,
    oldTokens,
    headersExtras = {},
    tokenRenewMode: string,
    timeoutMs = 10000,
  ): Promise<PerformTokenRequestResponse> => {
    for (const [key, value] of Object.entries(extras)) {
      if (details[key] === undefined) {
        details[key] = value;
      }
    }

    const formBody = [];
    for (const property in details) {
      const encodedKey = encodeURIComponent(property);
      const encodedValue = encodeURIComponent(details[property]);
      formBody.push(`${encodedKey}=${encodedValue}`);
    }
    const formBodyString = formBody.join('&');

    const response = await internalFetch(fetch)(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          ...headersExtras,
        },
        body: formBodyString,
      },
      timeoutMs,
    );
    if (response.status !== 200) {
      return {
        success: false,
        status: response.status,
        demonstratingProofOfPossessionNonce: null,
      };
    }
    const tokens = await response.json();

    let demonstratingProofOfPossessionNonce = null;
    if (response.headers.has(demonstratingProofOfPossessionNonceResponseHeader)) {
      demonstratingProofOfPossessionNonce = response.headers.get(
        demonstratingProofOfPossessionNonceResponseHeader,
      );
    }
    return {
      success: true,
      status: response.status,
      data: parseOriginalTokens(tokens, oldTokens, tokenRenewMode),
      demonstratingProofOfPossessionNonce: demonstratingProofOfPossessionNonce,
    };
  };

export const performAuthorizationRequestAsync =
  (storage: any, oidcLocation: ILOidcLocation) =>
  async (
    url,
    extras: StringMap,
    pushedAuthorizationRequest?: {
      endpoint: string;
      fetch: Fetch;
      timeoutMs?: number;
    },
  ) => {
    extras = extras ? { ...extras } : {};
    const codeVerifier = generateRandom(128);
    const codeChallenge = await deriveChallengeAsync(codeVerifier);
    await storage.setCodeVerifierAsync(codeVerifier);
    await storage.setStateAsync(extras.state);
    extras.code_challenge = codeChallenge;
    extras.code_challenge_method = 'S256';

    if (pushedAuthorizationRequest) {
      const response = await performPushedAuthorizationRequestAsync(
        pushedAuthorizationRequest.fetch,
      )(pushedAuthorizationRequest.endpoint, extras, pushedAuthorizationRequest.timeoutMs);
      oidcLocation.open(
        `${url}?client_id=${encodeURIComponent(extras.client_id)}&request_uri=${encodeURIComponent(
          response.request_uri,
        )}`,
      );
      return;
    }

    let queryString = '';
    if (extras) {
      for (const [key, value] of Object.entries(extras)) {
        if (queryString === '') {
          queryString += '?';
        } else {
          queryString += '&';
        }
        queryString += `${key}=${encodeURIComponent(value)}`;
      }
    }
    oidcLocation.open(`${url}${queryString}`);
  };

const demonstratingProofOfPossessionNonceResponseHeader = 'DPoP-Nonce';
export const performFirstTokenRequestAsync =
  (storage: any) =>
  async (url, formBodyExtras, headersExtras, tokenRenewMode: string, timeoutMs = 10000) => {
    formBodyExtras = formBodyExtras ? { ...formBodyExtras } : {};
    formBodyExtras.code_verifier = await storage.getCodeVerifierAsync();
    const formBody = [];
    for (const property in formBodyExtras) {
      const encodedKey = encodeURIComponent(property);
      const encodedValue = encodeURIComponent(formBodyExtras[property]);
      formBody.push(`${encodedKey}=${encodedValue}`);
    }
    const formBodyString = formBody.join('&');
    const response = await internalFetch(fetch)(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          ...headersExtras,
        },
        body: formBodyString,
      },
      timeoutMs,
    );
    await Promise.all([storage.setCodeVerifierAsync(null), storage.setStateAsync(null)]);
    if (response.status !== 200) {
      return { success: false, status: response.status };
    }
    let demonstratingProofOfPossessionNonce: string = null;
    if (response.headers.has(demonstratingProofOfPossessionNonceResponseHeader)) {
      demonstratingProofOfPossessionNonce = response.headers.get(
        demonstratingProofOfPossessionNonceResponseHeader,
      );
    }
    const tokens = await response.json();
    return {
      success: true,
      data: {
        state: formBodyExtras.state,
        tokens: parseOriginalTokens(tokens, null, tokenRenewMode),
        demonstratingProofOfPossessionNonce,
      },
    };
  };

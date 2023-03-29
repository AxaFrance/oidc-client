import { getFromCache, setCache } from './cache.js';
import { deriveChallengeAsync, generateRandom } from './crypto.js';
import { OidcAuthorizationServiceConfiguration } from './oidc.js';
import { parseOriginalTokens } from './parseTokens.js';
import { StringMap } from './types.js';

const oneHourSecond = 60 * 60;
export const fetchFromIssuer = async (openIdIssuerUrl: string, timeCacheSecond = oneHourSecond, storage = window.sessionStorage):
    Promise<OidcAuthorizationServiceConfiguration> => {
    const fullUrl = `${openIdIssuerUrl}/.well-known/openid-configuration`;

    const localStorageKey = `oidc.server:${openIdIssuerUrl}`;
    const data = getFromCache(localStorageKey, storage, timeCacheSecond);
    if (data) {
        return new OidcAuthorizationServiceConfiguration(data);
    }
    const response = await fetch(fullUrl);

    if (response.status !== 200) {
        return null;
    }

    const result = await response.json();

    setCache(localStorageKey, result, storage);
    return new OidcAuthorizationServiceConfiguration(result);
};

const internalFetch = async (url, headers, timeoutMs = 10000, numberRetry = 0) => {
    let response;
    try {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), timeoutMs);
        response = await fetch(url, { ...headers, signal: controller.signal });
    } catch (e) {
        if (e.message === 'AbortError' ||
            e.message === 'Network request failed') {
            if (numberRetry <= 1) {
                return await internalFetch(url, headers, timeoutMs, numberRetry + 1);
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

export const performRevocationRequestAsync = async (url, token, token_type = TOKEN_TYPE.refresh_token, client_id, timeoutMs = 10000) => {
    const details = {
        token,
        token_type_hint: token_type,
        client_id,
    };

    const formBody = [];
    for (const property in details) {
        const encodedKey = encodeURIComponent(property);
        const encodedValue = encodeURIComponent(details[property]);
        formBody.push(`${encodedKey}=${encodedValue}`);
    }
    const formBodyString = formBody.join('&');

    const response = await internalFetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        },
        body: formBodyString,
    }, timeoutMs);
    if (response.status !== 200) {
        return { success: false };
    }
    return {
        success: true,
    };
};

export const performTokenRequestAsync = async (url, details, extras, oldTokens, tokenRenewMode: string, timeoutMs = 10000) => {
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

    const response = await internalFetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        },
        body: formBodyString,
    }, timeoutMs);
    if (response.status !== 200) {
        return { success: false, status: response.status };
    }
    const tokens = await response.json();
    return {
        success: true,
        data: parseOriginalTokens(tokens, oldTokens, tokenRenewMode),
    };
};

export const performAuthorizationRequestAsync = (storage: any) => async (url, extras: StringMap) => {
    extras = extras ? { ...extras } : {};
    const codeVerifier = generateRandom(128);
    const codeChallenge = await deriveChallengeAsync(codeVerifier);
    await storage.setCodeVerifierAsync(codeVerifier);
    await storage.setStateAsync(extras.state);
    extras.code_challenge = codeChallenge;
    extras.code_challenge_method = 'S256';
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
    window.location.href = `${url}${queryString}`;
};

export const performFirstTokenRequestAsync = (storage:any) => async (url, extras, tokenRenewMode: string, timeoutMs = 10000) => {
    extras = extras ? { ...extras } : {};
    extras.code_verifier = await storage.getCodeVerifierAsync();
    const formBody = [];
    for (const property in extras) {
        const encodedKey = encodeURIComponent(property);
        const encodedValue = encodeURIComponent(extras[property]);
        formBody.push(`${encodedKey}=${encodedValue}`);
    }
    const formBodyString = formBody.join('&');
    const response = await internalFetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        },
        body: formBodyString,
    }, timeoutMs);
    await Promise.all([storage.setCodeVerifierAsync(null), storage.setStateAsync(null)]);
    if (response.status !== 200) {
        return { success: false, status: response.status };
    }
    const tokens = await response.json();
    return {
        success: true,
        data: {
            state: extras.state,
            tokens: parseOriginalTokens(tokens, null, tokenRenewMode),
            },
    };
};

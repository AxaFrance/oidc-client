import { getFromCache, setCache } from './cache.js';
import { deriveChallengeAsync, generateRandom } from './crypto.js';
import { OidcAuthorizationServiceConfiguration } from './oidc.js';
import { parseOriginalTokens } from './parseTokens.js';
import { Fetch, StringMap } from './types.js';
import EC, {JWK, JWT} from './jwt';

const oneHourSecond = 60 * 60;
export const fetchFromIssuer = (fetch) => async (openIdIssuerUrl: string, timeCacheSecond = oneHourSecond, storage = window.sessionStorage, timeoutMs = 10000):
    Promise<OidcAuthorizationServiceConfiguration> => {
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

const internalFetch = (fetch) => async (url, headers = {}, timeoutMs = 10000, numberRetry = 0) : Promise<Response> => {
    let response;
    try {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), timeoutMs);
        response = await fetch(url, { ...headers, signal: controller.signal });
    } catch (e: any) {
        if (e.name === 'AbortError' ||
            e.message === 'Network request failed') {
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

export const performRevocationRequestAsync = (fetch) => async (url, token, token_type = TOKEN_TYPE.refresh_token, client_id, timeoutMs = 10000) => {
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

    const response = await internalFetch(fetch)(url, {
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

const guid = function () {
    // RFC4122: The version 4 UUID is meant for generating UUIDs from truly-random or
    // pseudo-random numbers.
    // The algorithm is as follows:
    //     Set the two most significant bits (bits 6 and 7) of the
    //        clock_seq_hi_and_reserved to zero and one, respectively.
    //     Set the four most significant bits (bits 12 through 15) of the
    //        time_hi_and_version field to the 4-bit version number from
    //        Section 4.1.3. Version4 
    //     Set all the other bits to randomly (or pseudo-randomly) chosen
    //     values.
    // UUID                   = time-low "-" time-mid "-"time-high-and-version "-"clock-seq-reserved and low(2hexOctet)"-" node
    // time-low               = 4hexOctet
    // time-mid               = 2hexOctet
    // time-high-and-version  = 2hexOctet
    // clock-seq-and-reserved = hexOctet: 
    // clock-seq-low          = hexOctet
    // node                   = 6hexOctet
    // Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    // y could be 1000, 1001, 1010, 1011 since most significant two bits needs to be 10
    // y values are 8, 9, A, B
    const guidHolder = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
    const hex = '0123456789abcdef';
    let r = 0;
    let guidResponse = "";
    for (var i = 0; i < 36; i++) {
        if (guidHolder[i] !== '-' && guidHolder[i] !== '4') {
            // each x and y needs to be random
            r = Math.random() * 16 | 0;
        }

        if (guidHolder[i] === 'x') {
            guidResponse += hex[r];
        } else if (guidHolder[i] === 'y') {
            // clock-seq-and-reserved first hex is filtered and remaining hex values are random
            r &= 0x3; // bit and with 0011 to set pos 2 to zero ?0??
            r |= 0x8; // set pos 3 to 1 as 1???
            guidResponse += hex[r];
        } else {
            guidResponse += guidHolder[i];
        }
    }

    return guidResponse;
};


export const generateJwkAsync = () => {
    // @ts-ignore
    return EC.generate().then(function(jwk) {
        console.info('Private Key:', JSON.stringify(jwk));
        // @ts-ignore
        console.info('Public Key:', JSON.stringify(EC.neuter(jwk)));
        return jwk; 
    });
}

export const generateJwtDpopAsync = (jwk, method = 'POST', url: string, extrasClaims={}) => {
    
    const claims = {
        // https://www.rfc-editor.org/rfc/rfc9449.html#name-concept
        jit: btoa(guid()),
        htm: method,
        htu: url,
        iat: Math.round(Date.now() / 1000),
        ...extrasClaims,
    };
    // @ts-ignore
    return JWK.thumbprint(jwk).then(function(kid) {
        // @ts-ignore
        return JWT.sign(jwk, { /*kid: kid*/ }, claims).then(function(jwt) {
            console.info('JWT:', jwt);
            return jwt;
        });
    });
}


export const performTokenRequestAsync = (fetch:Fetch) => async (url:string, 
                                                                details, 
                                                                extras, 
                                                                oldTokens,
                                                                headersExtras = {},
                                                                tokenRenewMode: string, 
                                                                timeoutMs = 10000) => {
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
    
    const response = await internalFetch(fetch)(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
            ...headersExtras
        },
        body: formBodyString,
    }, timeoutMs);
    if (response.status !== 200) {
        return { success: false, status: response.status };
    }
    const tokens = await response.json();

    let dPoPNonce = null;
    if( response.headers.has(popNonceResponseHeader)){
        dPoPNonce = response.headers.get(popNonceResponseHeader);
    }
    return {
        success: true,
        data: parseOriginalTokens(tokens, oldTokens, tokenRenewMode),
        dPoPNonce: dPoPNonce,
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

const popNonceResponseHeader = "DPoP-Nonce";
export const performFirstTokenRequestAsync = (storage:any) => async (url, 
                                                                     formBodyExtras, 
                                                                     headersExtras, 
                                                                     tokenRenewMode: string, 
                                                                     timeoutMs = 10000) => {
    formBodyExtras = formBodyExtras ? { ...formBodyExtras } : {};
    formBodyExtras.code_verifier = await storage.getCodeVerifierAsync();
    const formBody = [];
    for (const property in formBodyExtras) {
        const encodedKey = encodeURIComponent(property);
        const encodedValue = encodeURIComponent(formBodyExtras[property]);
        formBody.push(`${encodedKey}=${encodedValue}`);
    }
    const formBodyString = formBody.join('&');
    const response = await internalFetch(fetch)(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
            ...headersExtras,
        },
        body: formBodyString,
    }, timeoutMs);
    await Promise.all([storage.setCodeVerifierAsync(null), storage.setStateAsync(null)]);
    if (response.status !== 200) {
        return { success: false, status: response.status };
    }
    let dPoPNonce = null;
    if( response.headers.has(popNonceResponseHeader)){
        dPoPNonce = response.headers.get(popNonceResponseHeader);
    }
    const tokens = await response.json();
    return {
        success: true,
        data: {
            state: formBodyExtras.state,
            tokens: parseOriginalTokens(tokens, null, tokenRenewMode),
            dPoPNonce: dPoPNonce,
        },
    };
};

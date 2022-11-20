const scriptFilename = 'OidcTrustedDomains.js'; /* global trustedDomains */
this.importScripts(scriptFilename);

const id = Math.round(new Date().getTime() / 1000).toString();

const acceptAnyDomainToken = '*';

const keepAliveJsonFilename = 'OidcKeepAliveServiceWorker.json';
const handleInstall = (event) => {
    console.log('[OidcServiceWorker] service worker installed ' + id);
    event.waitUntil(self.skipWaiting());
};

const handleActivate = (event) => {
    console.log('[OidcServiceWorker] service worker activated ' + id);
    event.waitUntil(self.clients.claim());
};

let currentLoginCallbackConfigurationName = null;
const database = {
    default: {
        configurationName: 'default',
        tokens: null,
        status: null,
        items: [],
        nonce: null,
        oidcServerConfiguration: null,
    },
};

const countLetter = (str, find) => {
    return (str.split(find)).length - 1;
};

const b64DecodeUnicode = (str) =>
    decodeURIComponent(Array.prototype.map.call(atob(str), (c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
const parseJwt = (token) => JSON.parse(b64DecodeUnicode(token.split('.')[1].replace('-', '+').replace('_', '/')));
const extractTokenPayload = (token) => {
    try {
        if (!token) {
            return null;
        }
        if (countLetter(token, '.') === 2) {
            return parseJwt(token);
        } else {
            return null;
        }
    } catch (e) {
        console.warn(e);
    }
    return null;
};

const computeTimeLeft = (refreshTimeBeforeTokensExpirationInSecond, expiresAt) => {
    const currentTimeUnixSecond = new Date().getTime() / 1000;
    return Math.round(((expiresAt - refreshTimeBeforeTokensExpirationInSecond) - currentTimeUnixSecond));
};

const isTokensValid = (tokens) => {
    if (!tokens) {
        return false;
    }
    return computeTimeLeft(0, tokens.expiresAt) > 0;
};

// https://openid.net/specs/openid-connect-core-1_0.html#IDTokenValidation (excluding rules #1, #4, #5, #7, #8, #12, and #13 which did not apply).
// https://github.com/openid/AppAuth-JS/issues/65
const isTokensOidcValid = (tokens, nonce, oidcServerConfiguration) => {
    if (tokens.idTokenPayload) {
        const idTokenPayload = tokens.idTokenPayload;
        // 2: The Issuer Identifier for the OpenID Provider (which is typically obtained during Discovery) MUST exactly match the value of the iss (issuer) Claim.
        if (oidcServerConfiguration.issuer !== idTokenPayload.iss) {
            return false;
        }
        // 3: The Client MUST validate that the aud (audience) Claim contains its client_id value registered at the Issuer identified by the iss (issuer) Claim as an audience. The aud (audience) Claim MAY contain an array with more than one element. The ID Token MUST be rejected if the ID Token does not list the Client as a valid audience, or if it contains additional audiences not trusted by the Client.

        // 6: If the ID Token is received via direct communication between the Client and the Token Endpoint (which it is in this flow), the TLS server validation MAY be used to validate the issuer in place of checking the token signature. The Client MUST validate the signature of all other ID Tokens according to JWS [JWS] using the algorithm specified in the JWT alg Header Parameter. The Client MUST use the keys provided by the Issuer.

        // 9: The current time MUST be before the time represented by the exp Claim.
        const currentTimeUnixSecond = new Date().getTime() / 1000;
        if (idTokenPayload.exp && idTokenPayload.exp < currentTimeUnixSecond) {
            return false;
        }
        // 10: The iat Claim can be used to reject tokens that were issued too far away from the current time, limiting the amount of time that nonces need to be stored to prevent attacks. The acceptable range is Client specific.
        const timeInSevenDays = 60 * 60 * 24 * 7;
        if (idTokenPayload.iat && (idTokenPayload.iat + timeInSevenDays) < currentTimeUnixSecond) {
            return false;
        }
        // 11: If a nonce value was sent in the Authentication Request, a nonce Claim MUST be present and its value checked to verify that it is the same value as the one that was sent in the Authentication Request. The Client SHOULD check the nonce value for replay attacks. The precise method for detecting replay attacks is Client specific.
        if (idTokenPayload.nonce && nonce != null && idTokenPayload.nonce !== nonce) {
            return false;
        }
    }
    return true;
};

const TokenRenewMode = {
    access_token_or_id_token_invalid: 'access_token_or_id_token_invalid',
    access_token_invalid: 'access_token_invalid',
    id_token_invalid: 'id_token_invalid',
};

function hideTokens(currentDatabaseElement) {
    const configurationName = currentDatabaseElement.configurationName;
    return (response) => {
        if (response.status !== 200) {
            return response;
        }
        return response.json().then(tokens => {
            if (!tokens.issued_at) {
                const currentTimeUnixSecond = new Date().getTime() / 1000;
                tokens.issued_at = currentTimeUnixSecond;
            }

            const accessTokenPayload = extractTokenPayload(tokens.access_token);
            const secureTokens = {
                ...tokens,
                access_token: ACCESS_TOKEN + '_' + configurationName,
                accessTokenPayload,
            };
            tokens.accessTokenPayload = accessTokenPayload;

            let _idTokenPayload = null;
            if (tokens.id_token) {
                _idTokenPayload = extractTokenPayload(tokens.id_token);
                tokens.idTokenPayload = { ..._idTokenPayload };
                if (_idTokenPayload.nonce && currentDatabaseElement.nonce != null) {
                    const keyNonce = NONCE_TOKEN + '_' + currentDatabaseElement.configurationName;
                    _idTokenPayload.nonce = keyNonce;
                }
                secureTokens.idTokenPayload = _idTokenPayload;
            }
            if (tokens.refresh_token) {
                secureTokens.refresh_token = REFRESH_TOKEN + '_' + configurationName;
            }

            const idTokenExpiresAt = (_idTokenPayload && _idTokenPayload.exp) ? _idTokenPayload.exp : Number.MAX_VALUE;
            const accessTokenExpiresAt = (accessTokenPayload && accessTokenPayload.exp) ? accessTokenPayload.exp : tokens.issued_at + tokens.expires_in;

            let expiresAt;
            const tokenRenewMode = currentDatabaseElement.oidcConfiguration.token_renew_mode;
            if (tokenRenewMode === TokenRenewMode.access_token_invalid) {
                expiresAt = accessTokenExpiresAt;
            } else if (tokenRenewMode === TokenRenewMode.id_token_invalid) {
                expiresAt = idTokenExpiresAt;
            } else {
                expiresAt = idTokenExpiresAt < accessTokenExpiresAt ? idTokenExpiresAt : accessTokenExpiresAt;
            }
            secureTokens.expiresAt = expiresAt;

            tokens.expiresAt = expiresAt;
            const nonce = currentDatabaseElement.nonce ? currentDatabaseElement.nonce.nonce : null;
            if (!isTokensOidcValid(tokens, nonce, currentDatabaseElement.oidcServerConfiguration)) {
                throw Error('Tokens are not OpenID valid');
            }

            // When refresh_token is not rotated we reuse ald refresh_token
            if (currentDatabaseElement.tokens != null && 'refresh_token' in currentDatabaseElement.tokens && !('refresh_token' in tokens)) {
                const refreshToken = currentDatabaseElement.tokens.refresh_token;
                currentDatabaseElement.tokens = { ...tokens, refresh_token: refreshToken };
            } else {
                currentDatabaseElement.tokens = tokens;
            }

            currentDatabaseElement.status = 'LOGGED_IN';
            const body = JSON.stringify(secureTokens);
            return new Response(body, response);
        });
    };
}

const getCurrentDatabasesTokenEndpoint = (database, url) => {
    const databases = [];
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for (const [key, value] of Object.entries(database)) {
        if (value) {
            if (value.oidcServerConfiguration != null && url.startsWith(value.oidcServerConfiguration.tokenEndpoint)) {
                databases.push(value);
            } else if (value.oidcServerConfiguration != null && value.oidcServerConfiguration.revocationEndpoint && url.startsWith(value.oidcServerConfiguration.revocationEndpoint)) {
                databases.push(value);
            }
        }
    }
    return databases;
};

const openidWellknownUrlEndWith = '/.well-known/openid-configuration';
const getCurrentDatabaseDomain = (database, url) => {
    if (url.endsWith(openidWellknownUrlEndWith)) {
        return null;
    }
    for (const [key, currentDatabase] of Object.entries(database)) {
        const oidcServerConfiguration = currentDatabase.oidcServerConfiguration;

        if (!oidcServerConfiguration) {
            continue;
        }

        if (oidcServerConfiguration.tokenEndpoint && url === oidcServerConfiguration.tokenEndpoint) {
            continue;
        }
        if (oidcServerConfiguration.revocationEndpoint && url === oidcServerConfiguration.revocationEndpoint) {
            continue;
        }

        const domainsToSendTokens = oidcServerConfiguration.userInfoEndpoint
            ? [
                oidcServerConfiguration.userInfoEndpoint, ...trustedDomains[key],
            ]
            : [...trustedDomains[key]];

        let hasToSendToken = false;
        if (domainsToSendTokens.find((f) => f === acceptAnyDomainToken)) {
            hasToSendToken = true;
        } else {
            for (let i = 0; i < domainsToSendTokens.length; i++) {
                const domain = domainsToSendTokens[i];
                if (url.startsWith(domain)) {
                    hasToSendToken = true;
                    break;
                }
            }
        }

        if (hasToSendToken) {
            if (!currentDatabase.tokens) {
                return null;
            }
            return currentDatabase;
        }
    }

    return null;
};

const serializeHeaders = (headers) => {
    const headersObj = {};
    for (const key of headers.keys()) {
        headersObj[key] = headers.get(key);
    }
    return headersObj;
};

const REFRESH_TOKEN = 'REFRESH_TOKEN_SECURED_BY_OIDC_SERVICE_WORKER';
const ACCESS_TOKEN = 'ACCESS_TOKEN_SECURED_BY_OIDC_SERVICE_WORKER';
const NONCE_TOKEN = 'NONCE_SECURED_BY_OIDC_SERVICE_WORKER';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const keepAliveAsync = async (event) => {
    const originalRequest = event.request;
    const isFromVanilla = originalRequest.headers.has('oidc-vanilla');
    const init = { status: 200, statusText: 'oidc-service-worker' };
    const response = new Response('{}', init);
    if (!isFromVanilla) {
        for (let i = 0; i < 240; i++) {
            await sleep(1000 + Math.floor(Math.random() * 1000));
            const cache = await caches.open('oidc_dummy_cache');
            await cache.put(event.request, response.clone());
        }
    }

    return response;
};

const handleFetch = async (event) => {
    const originalRequest = event.request;
    const url = originalRequest.url;
    if (originalRequest.url.includes(keepAliveJsonFilename)) {
        event.respondWith(keepAliveAsync(event));
        return;
    }

    const currentDatabaseForRequestAccessToken = getCurrentDatabaseDomain(database, originalRequest.url);
    if (currentDatabaseForRequestAccessToken && currentDatabaseForRequestAccessToken.tokens && currentDatabaseForRequestAccessToken.tokens.access_token) {
        while (currentDatabaseForRequestAccessToken.tokens && !isTokensValid(currentDatabaseForRequestAccessToken.tokens)) {
            await sleep(200);
        }
        const newRequest = new Request(originalRequest, {
            headers: {
                ...serializeHeaders(originalRequest.headers),
                authorization: 'Bearer ' + currentDatabaseForRequestAccessToken.tokens.access_token,
            },
        });
        event.waitUntil(event.respondWith(fetch(newRequest)));
        return;
    }

    if (event.request.method !== 'POST') {
        return;
    }

    let currentDatabase = null;
    const currentDatabases = getCurrentDatabasesTokenEndpoint(database, originalRequest.url);
    const numberDatabase = currentDatabases.length;
    if (numberDatabase > 0) {
        const maPromesse = new Promise((resolve, reject) => {
            const clonedRequest = originalRequest.clone();
            const response = clonedRequest.text().then(actualBody => {
                if (actualBody.includes(REFRESH_TOKEN) || actualBody.includes(ACCESS_TOKEN)) {
                    let newBody = actualBody;
                    for (let i = 0; i < numberDatabase; i++) {
                        const currentDb = currentDatabases[i];

                        if (currentDb && currentDb.tokens != null) {
                            const keyRefreshToken = REFRESH_TOKEN + '_' + currentDb.configurationName;
                            if (actualBody.includes(keyRefreshToken)) {
                                newBody = newBody.replace(keyRefreshToken, encodeURIComponent(currentDb.tokens.refresh_token));
                                currentDatabase = currentDb;
                                break;
                            }
                            const keyAccessToken = ACCESS_TOKEN + '_' + currentDb.configurationName;
                            if (actualBody.includes(keyAccessToken)) {
                                newBody = newBody.replace(keyAccessToken, encodeURIComponent(currentDb.tokens.access_token));
                                currentDatabase = currentDb;
                                break;
                            }
                        }
                    }
                    const fetchPromise = fetch(originalRequest, {
                        body: newBody,
                        method: clonedRequest.method,
                        headers: {
                            ...serializeHeaders(originalRequest.headers),
                        },
                        mode: clonedRequest.mode,
                        cache: clonedRequest.cache,
                        redirect: clonedRequest.redirect,
                        referrer: clonedRequest.referrer,
                        credentials: clonedRequest.credentials,
                        integrity: clonedRequest.integrity,
                    });
                    if (currentDatabase.oidcServerConfiguration != null && currentDatabase.oidcServerConfiguration.revocationEndpoint && url.startsWith(currentDatabase.oidcServerConfiguration.revocationEndpoint)) {
                        return fetchPromise.then(async response => {
                            const text = await response.text();
                            return new Response(text, response);
                        });
                    }
                    return fetchPromise.then(hideTokens(currentDatabase));
                } else if (actualBody.includes('code_verifier=') && currentLoginCallbackConfigurationName) {
                    currentDatabase = database[currentLoginCallbackConfigurationName];
                    currentLoginCallbackConfigurationName = null;
                    return fetch(originalRequest, {
                        body: actualBody,
                        method: clonedRequest.method,
                        headers: {
                            ...serializeHeaders(originalRequest.headers),
                        },
                        mode: clonedRequest.mode,
                        cache: clonedRequest.cache,
                        redirect: clonedRequest.redirect,
                        referrer: clonedRequest.referrer,
                        credentials: clonedRequest.credentials,
                        integrity: clonedRequest.integrity,
                    }).then(hideTokens(currentDatabase));
                }
            });
            response.then(r => {
                if (r !== undefined) {
                    resolve(r);
                } else {
                    console.log('success undefined');
                    reject(new Error('Response is undefined inside a success'));
                }
            }).catch(err => {
                if (err !== undefined) {
                    reject(err);
                } else {
                    console.log('error undefined');
                    reject(new Error('Response is undefined inside a error'));
                }
            });
        });
        event.waitUntil(event.respondWith(maPromesse));
    }
};

self.addEventListener('install', handleInstall);
self.addEventListener('activate', handleActivate);
self.addEventListener('fetch', handleFetch);

const checkDomain = (domains, endpoint) => {
    if (!endpoint) {
        return;
    }

    const domain = domains.find(domain => endpoint.startsWith(domain));
    if (!domain) {
        throw new Error('Domain ' + endpoint + ' is not trusted, please add domain in ' + scriptFilename);
    }
};

addEventListener('message', event => {
    const port = event.ports[0];
    const data = event.data;
    const configurationName = data.configurationName;
    let currentDatabase = database[configurationName];

    if (!currentDatabase) {
        database[configurationName] = {
            tokens: null,
            items: [],
            oidcServerConfiguration: null,
            oidcConfiguration: null,
            status: null,
            configurationName,
        };
        currentDatabase = database[configurationName];
        if (!trustedDomains[configurationName]) {
            trustedDomains[configurationName] = [];
        }
    }

    switch (data.type) {
        case 'loadItems':
            port.postMessage(database[configurationName].items);
            return;
        case 'clear':
            currentDatabase.tokens = null;
            currentDatabase.items = null;
            currentDatabase.status = data.data.status;
            port.postMessage({ configurationName });
            return;
        case 'init':
        {
            const oidcServerConfiguration = data.data.oidcServerConfiguration;
            const domains = trustedDomains[configurationName];
            if (!domains.find(f => f === acceptAnyDomainToken)) {
                checkDomain(domains, oidcServerConfiguration.tokenEndpoint);
                checkDomain(domains, oidcServerConfiguration.revocationEndpoint);
                checkDomain(domains, oidcServerConfiguration.userInfoEndpoint);
                checkDomain(domains, oidcServerConfiguration.issuer);
            }
            currentDatabase.oidcServerConfiguration = oidcServerConfiguration;
            currentDatabase.oidcConfiguration = data.data.oidcConfiguration;
            const where = data.data.where;
            if (where === 'loginCallbackAsync' || where === 'tryKeepExistingSessionAsync') {
                currentLoginCallbackConfigurationName = configurationName;
            } else {
                currentLoginCallbackConfigurationName = null;
            }

            if (!currentDatabase.tokens) {
                port.postMessage({
                    tokens: null,
                    status: currentDatabase.status,
                    configurationName,
                });
            } else {
                const tokens = {
                    ...currentDatabase.tokens,
                    access_token: ACCESS_TOKEN + '_' + configurationName,
                };
                if (tokens.refresh_token) {
                    tokens.refresh_token = REFRESH_TOKEN + '_' + configurationName;
                }
                if (tokens.idTokenPayload && tokens.idTokenPayload.nonce && currentDatabase.nonce != null) {
                    tokens.idTokenPayload.nonce = NONCE_TOKEN + '_' + configurationName;
                }
                port.postMessage({
                    tokens,
                    status: currentDatabase.status,
                    configurationName,
                });
            }
            return;
        }

        case 'setSessionState':
            currentDatabase.sessionState = data.data.sessionState;
            port.postMessage({ configurationName });
            return;
        case 'getSessionState':
        {
            const sessionState = currentDatabase.sessionState;
            port.postMessage({ configurationName, sessionState });
            return;
        }
        case 'setNonce':
            currentDatabase.nonce = data.data.nonce;
            port.postMessage({ configurationName });
            return;
        default:
            currentDatabase.items = { ...data.data };
            port.postMessage({ configurationName });
    }
});

import { acceptAnyDomainToken, scriptFilename, TOKEN } from './constants';
import { base64urlOfHashOfASCIIEncodingAsync } from './crypto';
import { getDpopConfiguration, getDpopOnlyWhenDpopHeaderPresent } from './dpop';
import { generateJwkAsync, generateJwtDemonstratingProofOfPossessionAsync } from './jwt';
import { getCurrentDatabasesTokenEndpoint } from './oidcConfig';
import { Database, MessageEventData, OidcConfig, TrustedDomains } from './types';
import {
  checkDomain,
  getCurrentDatabaseDomain,
  getDomains,
  hideTokens,
  normalizeUrl,
  serializeHeaders,
  sleep,
  waitForValidTokens,
} from './utils';
import {
  extractConfigurationNameFromCodeVerifier,
  replaceCodeVerifier,
} from './utils/codeVerifier';
import version from './version';

// @ts-ignore
if (typeof trustedTypes !== 'undefined' && typeof trustedTypes.createPolicy === 'function') {
  // @ts-ignore
  trustedTypes.createPolicy('default', {
    createScriptURL: function (url: string) {
      if (url === scriptFilename) {
        return url;
      } else {
        throw new Error('Untrusted script URL blocked: ' + url);
      }
    },
  });
}

const _self = self as ServiceWorkerGlobalScope & typeof globalThis;

// `trustedDomains` is declared in the externally loaded script (OidcTrustedDomains.js)
declare let trustedDomains: TrustedDomains;

_self.importScripts(scriptFilename);

const id = Math.round(new Date().getTime() / 1000).toString();
console.log('init service worker with id', id);
const keepAliveJsonFilename = 'OidcKeepAliveServiceWorker.json';
const database: Database = {};

/**
 * Keeps the service worker alive by responding with a cached response after a sleep.
 */
const keepAliveAsync = async (event: FetchEvent) => {
  const originalRequest = event.request;
  const isFromVanilla = originalRequest.headers.has('oidc-vanilla');
  const init = { status: 200, statusText: 'oidc-service-worker' };
  const response = new Response('{}', init);

  if (!isFromVanilla) {
    const originalRequestUrl = new URL(originalRequest.url);
    const minSleepSeconds = Number(originalRequestUrl.searchParams.get('minSleepSeconds')) || 240;
    for (let i = 0; i < minSleepSeconds; i++) {
      await sleep(1000 + Math.floor(Math.random() * 1000));
      const cache = await caches.open('oidc_dummy_cache');
      await cache.put(event.request, response.clone());
    }
  }
  return response;
};

/**
 * Generates DPoP headers when a DPoP configuration is present.
 */
async function generateDpopAsync(
  originalRequest: Request,
  currentDatabase: OidcConfig | null,
  url: string,
  extrasClaims = {},
) {
  const headersExtras = serializeHeaders(originalRequest.headers);
  if (
    currentDatabase?.demonstratingProofOfPossessionConfiguration &&
    currentDatabase.demonstratingProofOfPossessionJwkJson &&
    (!currentDatabase.demonstratingProofOfPossessionOnlyWhenDpopHeaderPresent ||
      (currentDatabase.demonstratingProofOfPossessionOnlyWhenDpopHeaderPresent &&
        headersExtras.dpop))
  ) {
    const dpopConfiguration = currentDatabase.demonstratingProofOfPossessionConfiguration;
    const jwk = currentDatabase.demonstratingProofOfPossessionJwkJson;
    const method = originalRequest.method;
    const dpop = await generateJwtDemonstratingProofOfPossessionAsync(self)(dpopConfiguration)(
      jwk,
      method,
      url,
      extrasClaims,
    );

    headersExtras.dpop = dpop;
    if (currentDatabase.demonstratingProofOfPossessionNonce != null) {
      headersExtras.nonce = currentDatabase.demonstratingProofOfPossessionNonce;
    }
  }
  return headersExtras;
}

/**
 * Intercepts fetch requests to inject access tokens and handle token endpoints.
 */
const handleFetch = (event: FetchEvent): void => {
  /**
   * Exit early for requests that do not need to have an auth token attached.
   */
  const bypassedDestinations = ['image', 'font', 'media', 'document', 'iframe', 'script'];
  if (bypassedDestinations.includes(event.request.destination)) {
    return; // Don't call event.respondWith() - let browser handle naturally
  }
  event.respondWith(
    (async (): Promise<Response> => {
      try {
        const originalRequest = event.request;
        const url = normalizeUrl(originalRequest.url);

        // 1) Handle keep-alive requests
        if (url.includes(keepAliveJsonFilename)) {
          return keepAliveAsync(event);
        }

        // Check if an access token is available for this request
        const currentDatabasesForRequestAccessToken = getCurrentDatabaseDomain(
          database,
          url,
          trustedDomains,
        );

        const authorization = originalRequest.headers.get('authorization');
        let authenticationMode = 'Bearer';
        let key = 'default';

        if (authorization) {
          const split = authorization.split(' ');
          authenticationMode = split[0];
          if (split[1]?.includes('ACCESS_TOKEN_SECURED_BY_OIDC_SERVICE_WORKER_')) {
            key = split[1].split('ACCESS_TOKEN_SECURED_BY_OIDC_SERVICE_WORKER_')[1];
          }
        }

        const currentDatabaseForRequestAccessToken = currentDatabasesForRequestAccessToken?.find(
          c => c.configurationName.endsWith(key),
        );

        // Inject the access token into the request if one is available
        if (currentDatabaseForRequestAccessToken?.tokens?.access_token) {
          // Wait for token to become valid (a parallel refresh may be in progress)
          const tokenError = await waitForValidTokens(currentDatabaseForRequestAccessToken);
          if (tokenError) {
            return tokenError;
          }

          // Adjust request mode for CORS if configured
          let requestMode = originalRequest.mode;
          if (
            originalRequest.mode !== 'navigate' &&
            currentDatabaseForRequestAccessToken.convertAllRequestsToCorsExceptNavigate
          ) {
            requestMode = 'cors';
          }

          // Build request headers
          let headers: { [p: string]: string };

          // Skip the access token for navigate requests when setAccessTokenToNavigateRequests is false
          if (
            originalRequest.mode === 'navigate' &&
            !currentDatabaseForRequestAccessToken.setAccessTokenToNavigateRequests
          ) {
            headers = {
              ...serializeHeaders(originalRequest.headers),
            };
          } else {
            if (
              authenticationMode.toLowerCase() === 'dpop' ||
              (!currentDatabaseForRequestAccessToken.demonstratingProofOfPossessionOnlyWhenDpopHeaderPresent &&
                currentDatabaseForRequestAccessToken.demonstratingProofOfPossessionConfiguration)
            ) {
              // DPoP mode
              const claimsExtras = {
                ath: await base64urlOfHashOfASCIIEncodingAsync(
                  currentDatabaseForRequestAccessToken.tokens.access_token,
                ),
              };
              const dpopHeaders = await generateDpopAsync(
                originalRequest,
                currentDatabaseForRequestAccessToken,
                url,
                claimsExtras,
              );
              headers = {
                ...dpopHeaders,
                authorization: `DPoP ${currentDatabaseForRequestAccessToken.tokens.access_token}`,
              };
            } else {
              // Bearer mode
              headers = {
                ...serializeHeaders(originalRequest.headers),
                authorization: `${authenticationMode} ${currentDatabaseForRequestAccessToken.tokens.access_token}`,
              };
            }
          }

          let init: RequestInit;
          if (originalRequest.mode === 'navigate') {
            init = {
              headers: headers,
            };
          } else {
            init = {
              headers: headers,
              mode: requestMode,
            };
          }

          const newRequest = new Request(originalRequest, init);
          return fetch(newRequest);
        }

        // Pass through non-POST requests without modification
        if (event.request.method !== 'POST') {
          return fetch(originalRequest);
        }

        // Handle POST requests to known token/revocation endpoints
        const currentDatabases = getCurrentDatabasesTokenEndpoint(database, url);
        const numberDatabase = currentDatabases.length;

        if (numberDatabase > 0) {
          const responsePromise = new Promise<Response>((resolve, reject) => {
            const clonedRequest = originalRequest.clone();
            clonedRequest
              .text()
              .then(async actualBody => {
                let currentDatabase: OidcConfig | null = null;
                try {
                  // Replace hidden token placeholders with the real token values
                  if (
                    actualBody.includes(TOKEN.REFRESH_TOKEN) ||
                    actualBody.includes(TOKEN.ACCESS_TOKEN)
                  ) {
                    let headers = serializeHeaders(originalRequest.headers);
                    let newBody = actualBody;

                    for (let i = 0; i < numberDatabase; i++) {
                      const currentDb = currentDatabases[i];
                      if (currentDb?.tokens) {
                        const claimsExtras = {
                          ath: await base64urlOfHashOfASCIIEncodingAsync(
                            currentDb.tokens.access_token,
                          ),
                        };
                        headers = await generateDpopAsync(
                          originalRequest,
                          currentDb,
                          url,
                          claimsExtras,
                        );

                        const keyRefreshToken = encodeURIComponent(
                          `${TOKEN.REFRESH_TOKEN}_${currentDb.configurationName}`,
                        );
                        if (actualBody.includes(keyRefreshToken)) {
                          newBody = newBody.replace(
                            keyRefreshToken,
                            encodeURIComponent(currentDb.tokens.refresh_token as string),
                          );
                          currentDatabase = currentDb;
                          break;
                        }

                        const keyAccessToken = encodeURIComponent(
                          `${TOKEN.ACCESS_TOKEN}_${currentDb.configurationName}`,
                        );
                        if (actualBody.includes(keyAccessToken)) {
                          newBody = newBody.replace(
                            keyAccessToken,
                            encodeURIComponent(currentDb.tokens.access_token),
                          );
                          currentDatabase = currentDb;
                          break;
                        }
                      }
                    }

                    const fetchPromise = fetch(originalRequest, {
                      body: newBody,
                      method: clonedRequest.method,
                      headers,
                      mode: clonedRequest.mode,
                      cache: clonedRequest.cache,
                      redirect: clonedRequest.redirect,
                      referrer: clonedRequest.referrer,
                      credentials: clonedRequest.credentials,
                      integrity: clonedRequest.integrity,
                    });

                    // Forward revocation requests without modifying the response body
                    if (
                      currentDatabase?.oidcServerConfiguration?.revocationEndpoint &&
                      url.startsWith(
                        normalizeUrl(currentDatabase.oidcServerConfiguration.revocationEndpoint),
                      )
                    ) {
                      const resp = await fetchPromise;
                      const txt = await resp.text();
                      resolve(new Response(txt, resp));
                      return;
                    }

                    // Hide real token values in the response
                    const hidden = await fetchPromise.then(
                      hideTokens(currentDatabase as OidcConfig),
                    );
                    resolve(hidden);
                    return;
                  }

                  // Handle authorization code exchange: replace the PKCE code_verifier placeholder
                  const isCodeVerifier = actualBody.includes('code_verifier=');
                  if (isCodeVerifier) {
                    const currentLoginCallbackConfigurationName =
                      extractConfigurationNameFromCodeVerifier(actualBody);
                    if (
                      !currentLoginCallbackConfigurationName ||
                      currentLoginCallbackConfigurationName === ''
                    ) {
                      throw new Error('No configuration name found in code_verifier');
                    }
                    currentDatabase = database[currentLoginCallbackConfigurationName];
                    let newBody = actualBody;
                    const codeVerifier = currentDatabase.codeVerifier;
                    if (codeVerifier != null) {
                      newBody = replaceCodeVerifier(newBody, codeVerifier);
                    }

                    const headersExtras = await generateDpopAsync(
                      originalRequest,
                      currentDatabase,
                      url,
                    );
                    const resp = await fetch(originalRequest, {
                      body: newBody,
                      method: clonedRequest.method,
                      headers: headersExtras,
                      mode: clonedRequest.mode,
                      cache: clonedRequest.cache,
                      redirect: clonedRequest.redirect,
                      referrer: clonedRequest.referrer,
                      credentials: clonedRequest.credentials,
                      integrity: clonedRequest.integrity,
                    });
                    const hidden = await hideTokens(currentDatabase)(resp);
                    resolve(hidden);
                    return;
                  }

                  // Pass through all other POST requests unchanged
                  const normalResp = await fetch(originalRequest, {
                    body: actualBody,
                    method: clonedRequest.method,
                    headers: serializeHeaders(originalRequest.headers),
                    mode: clonedRequest.mode,
                    cache: clonedRequest.cache,
                    redirect: clonedRequest.redirect,
                    referrer: clonedRequest.referrer,
                    credentials: clonedRequest.credentials,
                    integrity: clonedRequest.integrity,
                  });
                  resolve(normalResp);
                } catch (err) {
                  reject(err);
                }
              })
              .catch(reject);
          });

          return responsePromise;
        }

        // Default: pass through the request unchanged
        return fetch(originalRequest);
      } catch (err) {
        // Surface unexpected errors as a 500 rather than silently hanging
        console.error('[OidcServiceWorker] handleFetch error:', err);
        return new Response('Service Worker Error', { status: 500 });
      }
    })(),
  );
};

const handleMessage = async (event: ExtendableMessageEvent) => {
  const port = event.ports[0];
  const data = event.data as MessageEventData;

  if (event.data?.type === 'SKIP_WAITING') {
    await _self.skipWaiting();
    port?.postMessage?.({});
    return;
  } else if (event.data.type === 'claim') {
    _self.clients.claim().then(() => port.postMessage({}));
    return;
  }

  const configurationName = data.configurationName.split('#')[0];

  if (trustedDomains == null) {
    trustedDomains = {};
  }

  const trustedDomain = trustedDomains[configurationName];
  const allowMultiTabLogin = Array.isArray(trustedDomain)
    ? false
    : trustedDomain.allowMultiTabLogin;

  const tabId = allowMultiTabLogin ? data.tabId : 'default';
  const configurationNameWithTabId = `${configurationName}#tabId=${tabId}`;

  let currentDatabase = database[configurationNameWithTabId];
  if (!currentDatabase) {
    const showAccessToken = Array.isArray(trustedDomain) ? false : trustedDomain.showAccessToken;
    const doNotSetAccessTokenToNavigateRequests = Array.isArray(trustedDomain)
      ? true
      : trustedDomain.setAccessTokenToNavigateRequests;
    const convertAllRequestsToCorsExceptNavigate = Array.isArray(trustedDomain)
      ? false
      : trustedDomain.convertAllRequestsToCorsExceptNavigate;

    database[configurationNameWithTabId] = {
      tokens: null,
      state: null,
      codeVerifier: null,
      oidcServerConfiguration: null,
      oidcConfiguration: undefined,
      nonce: null,
      status: null,
      configurationName: configurationNameWithTabId,
      hideAccessToken: !showAccessToken,
      setAccessTokenToNavigateRequests: doNotSetAccessTokenToNavigateRequests ?? true,
      convertAllRequestsToCorsExceptNavigate: convertAllRequestsToCorsExceptNavigate ?? false,
      demonstratingProofOfPossessionNonce: null,
      demonstratingProofOfPossessionJwkJson: null,
      demonstratingProofOfPossessionConfiguration: null,
      demonstratingProofOfPossessionOnlyWhenDpopHeaderPresent: false,
      allowMultiTabLogin: allowMultiTabLogin ?? false,
    };
    currentDatabase = database[configurationNameWithTabId];

    if (!trustedDomains[configurationName]) {
      trustedDomains[configurationName] = [];
    }
  }

  switch (data.type) {
    case 'clear':
      currentDatabase.tokens = null;
      currentDatabase.state = null;
      currentDatabase.codeVerifier = null;
      currentDatabase.nonce = null;
      currentDatabase.demonstratingProofOfPossessionNonce = null;
      currentDatabase.demonstratingProofOfPossessionJwkJson = null;
      currentDatabase.demonstratingProofOfPossessionConfiguration = null;
      currentDatabase.demonstratingProofOfPossessionOnlyWhenDpopHeaderPresent = false;
      currentDatabase.status = data.data.status;
      port.postMessage({ configurationName });
      return;

    case 'init': {
      const oidcServerConfiguration = data.data.oidcServerConfiguration;
      const domains = getDomains(trustedDomain, 'oidc');

      if (!domains.some(domain => domain === acceptAnyDomainToken)) {
        [
          oidcServerConfiguration.tokenEndpoint,
          oidcServerConfiguration.revocationEndpoint,
          oidcServerConfiguration.userInfoEndpoint,
          oidcServerConfiguration.issuer,
        ].forEach(u => {
          checkDomain(domains, u);
        });
      }

      currentDatabase.oidcServerConfiguration = oidcServerConfiguration;
      currentDatabase.oidcConfiguration = data.data.oidcConfiguration;

      if (currentDatabase.demonstratingProofOfPossessionConfiguration == null) {
        const demonstratingProofOfPossessionConfiguration = getDpopConfiguration(trustedDomain);
        if (demonstratingProofOfPossessionConfiguration != null) {
          if (currentDatabase.oidcConfiguration.demonstrating_proof_of_possession) {
            console.warn(
              'In service worker, demonstrating_proof_of_possession must be configured from trustedDomains file',
            );
          }
          currentDatabase.demonstratingProofOfPossessionConfiguration =
            demonstratingProofOfPossessionConfiguration;
          currentDatabase.demonstratingProofOfPossessionJwkJson = await generateJwkAsync(self)(
            demonstratingProofOfPossessionConfiguration.generateKeyAlgorithm,
          );
          currentDatabase.demonstratingProofOfPossessionOnlyWhenDpopHeaderPresent =
            getDpopOnlyWhenDpopHeaderPresent(trustedDomain) ?? false;
        }
      }

      if (!currentDatabase.tokens) {
        port.postMessage({
          tokens: null,
          status: currentDatabase.status,
          configurationName,
          version,
        });
      } else {
        const tokens = { ...currentDatabase.tokens };
        if (currentDatabase.hideAccessToken) {
          tokens.access_token = `${TOKEN.ACCESS_TOKEN}_${configurationName}#tabId=${tabId}`;
        }
        if (tokens.refresh_token) {
          tokens.refresh_token = `${TOKEN.REFRESH_TOKEN}_${configurationName}#tabId=${tabId}`;
        }
        if (tokens?.idTokenPayload?.nonce && currentDatabase.nonce != null) {
          tokens.idTokenPayload.nonce = `${TOKEN.NONCE_TOKEN}_${configurationName}#tabId=${tabId}`;
        }
        port.postMessage({
          tokens,
          status: currentDatabase.status,
          configurationName,
          version,
        });
      }
      return;
    }

    case 'setDemonstratingProofOfPossessionNonce': {
      currentDatabase.demonstratingProofOfPossessionNonce =
        data.data.demonstratingProofOfPossessionNonce;
      port.postMessage({ configurationName });
      return;
    }

    case 'getDemonstratingProofOfPossessionNonce': {
      const demonstratingProofOfPossessionNonce =
        currentDatabase.demonstratingProofOfPossessionNonce;
      port.postMessage({
        configurationName,
        demonstratingProofOfPossessionNonce,
      });
      return;
    }

    case 'setState': {
      currentDatabase.state = data.data.state;
      port.postMessage({ configurationName });
      return;
    }

    case 'getState': {
      const state = currentDatabase.state;
      port.postMessage({ configurationName, state });
      return;
    }

    case 'setCodeVerifier': {
      currentDatabase.codeVerifier = data.data.codeVerifier;
      port.postMessage({ configurationName });
      return;
    }

    case 'getCodeVerifier': {
      const codeVerifier =
        currentDatabase.codeVerifier != null
          ? `${TOKEN.CODE_VERIFIER}_${configurationName}#tabId=${tabId}`
          : null;
      port.postMessage({
        configurationName,
        codeVerifier,
      });
      return;
    }

    case 'setSessionState': {
      currentDatabase.sessionState = data.data.sessionState;
      port.postMessage({ configurationName });
      return;
    }

    case 'getSessionState': {
      const sessionState = currentDatabase.sessionState;
      port.postMessage({ configurationName, sessionState });
      return;
    }

    case 'setNonce': {
      const nonce = data.data.nonce;
      if (nonce) {
        currentDatabase.nonce = nonce;
      }
      port.postMessage({ configurationName });
      return;
    }

    case 'getNonce': {
      const keyNonce = `${TOKEN.NONCE_TOKEN}_${configurationName}#tabId=${tabId}`;
      const nonce = currentDatabase.nonce ? keyNonce : null;
      port.postMessage({ configurationName, nonce });
      return;
    }

    default:
      return;
  }
};

// Event listeners
_self.addEventListener('fetch', handleFetch);
_self.addEventListener('message', handleMessage);

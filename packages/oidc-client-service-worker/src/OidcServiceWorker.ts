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
  isTokensValid,
  normalizeUrl,
  serializeHeaders,
  sleep,
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

// Déclare `trustedDomains` qui vient de l'extérieur :
declare let trustedDomains: TrustedDomains;

_self.importScripts(scriptFilename);

const id = Math.round(new Date().getTime() / 1000).toString();
console.log("service worker id", id);
const keepAliveJsonFilename = 'OidcKeepAliveServiceWorker.json';
const database: Database = {};
/*
const handleInstall = (event: ExtendableEvent) => {
  console.log('[OidcServiceWorker] service worker installed ' + id);
  event.waitUntil(_self.skipWaiting());
};

const handleActivate = (event: ExtendableEvent) => {
  console.log('[OidcServiceWorker] service worker activated ' + id);
  event.waitUntil(_self.clients.claim());
};*/

/**
 * Routine keepAlive : renvoie une réponse après un "sleep" éventuel.
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
 * Génération d'en-têtes DPoP s'il y a configuration dpop.
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
 * Nouveau handleFetch : on n’est plus async "directement".
 * On encapsule toute la logique dans un `respondWith((async () => { ... })())`.
 */
const handleFetch = (event: FetchEvent): void => {
  event.respondWith(
    (async (): Promise<Response> => {
      try {
        const originalRequest = event.request;
        const url = normalizeUrl(originalRequest.url);

        // 1) Si on est sur la ressource KeepAlive
        if (url.includes(keepAliveJsonFilename)) {
          return keepAliveAsync(event);
        }

        // 2) Cas normal : on regarde si on a un token
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

        // 2a) Si on a déjà des tokens valides
        if (currentDatabaseForRequestAccessToken?.tokens?.access_token) {
          // On attend que le token soit valide (refresh possible en parallèle)
          while (
            currentDatabaseForRequestAccessToken.tokens &&
            !isTokensValid(currentDatabaseForRequestAccessToken.tokens)
          ) {
            await sleep(200);
          }

          // Ajustement du mode
          let requestMode = originalRequest.mode;
          if (
            originalRequest.mode !== 'navigate' &&
            currentDatabaseForRequestAccessToken.convertAllRequestsToCorsExceptNavigate
          ) {
            requestMode = 'cors';
          }

          // Construction des en-têtes
          let headers: { [p: string]: string };

          // Pas de token sur la requête "navigate" si setAccessTokenToNavigateRequests = false
          if (
            originalRequest.mode === 'navigate' &&
            !currentDatabaseForRequestAccessToken.setAccessTokenToNavigateRequests
          ) {
            headers = {
              ...serializeHeaders(originalRequest.headers),
            };
          } else {
            // On injecte le token
            if (
              authenticationMode.toLowerCase() === 'dpop' ||
              (!currentDatabaseForRequestAccessToken.demonstratingProofOfPossessionOnlyWhenDpopHeaderPresent &&
                currentDatabaseForRequestAccessToken.demonstratingProofOfPossessionConfiguration)
            ) {
              // Mode DPoP
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
              // Mode Bearer
              headers = {
                ...serializeHeaders(originalRequest.headers),
                authorization: `${authenticationMode} ${currentDatabaseForRequestAccessToken.tokens.access_token}`,
              };
            }
          }
          const newRequest = new Request(originalRequest.url, {
            method: originalRequest.method,
            headers: new Headers(headers),
            mode: requestMode,
            credentials: originalRequest.credentials,
            redirect: originalRequest.redirect,
            referrer: originalRequest.referrer,
            cache: originalRequest.cache,
            integrity: originalRequest.integrity,
            keepalive: originalRequest.keepalive,
          });
          return fetch(newRequest);
        }

        // 3) S’il ne s’agit pas d’un POST => on laisse passer
        if (event.request.method !== 'POST') {
          return fetch(originalRequest);
        }

        // 4) Cas POST vers un endpoint connu (token, revocation)
        const currentDatabases = getCurrentDatabasesTokenEndpoint(database, url);
        const numberDatabase = currentDatabases.length;

        if (numberDatabase > 0) {
          // On gère tout dans une promesse
          const responsePromise = new Promise<Response>((resolve, reject) => {
            const clonedRequest = originalRequest.clone();
            clonedRequest
              .text()
              .then(async actualBody => {
                let currentDatabase: OidcConfig | null = null;
                try {
                  // 4a) S’il y a un refresh_token masqué
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

                    // Cas “revocationEndpoint” ?
                    if (
                      currentDatabase?.oidcServerConfiguration?.revocationEndpoint &&
                      url.startsWith(
                        normalizeUrl(currentDatabase.oidcServerConfiguration.revocationEndpoint),
                      )
                    ) {
                      // On ne modifie pas le corps
                      const resp = await fetchPromise;
                      const txt = await resp.text();
                      resolve(new Response(txt, resp));
                      return;
                    }

                    // Sinon on “cache” les tokens dans la réponse
                    const hidden = await fetchPromise.then(
                      hideTokens(currentDatabase as OidcConfig),
                    );
                    resolve(hidden);
                    return;
                  }

                  // 4b) Sinon si c’est le code_verifier
                  const isCodeVerifier = actualBody.includes('code_verifier=')
                  if (isCodeVerifier) {
                    const currentLoginCallbackConfigurationName =
                      extractConfigurationNameFromCodeVerifier(actualBody);
                    if (!currentLoginCallbackConfigurationName || currentLoginCallbackConfigurationName === '') {
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

                  // 4c) Sinon on laisse passer tel quel
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

          // On renvoie simplement la promesse
          return responsePromise;
        }

        // 5) Par défaut, on laisse passer la requête
        return fetch(originalRequest);
      } catch (err) {
        // En cas d’erreur imprévue, on log et on retourne une 500
        console.error('[OidcServiceWorker] handleFetch error:', err);
        return new Response('Service Worker Error', { status: 500 });
      }
    })(),
  );
};

// ---- Gestion des messages depuis la page
const handleMessage = async (event: ExtendableMessageEvent) => {
  const port = event.ports[0];
  const data = event.data as MessageEventData;

  if (event.data?.type === 'SKIP_WAITING') {
    await _self.skipWaiting();
    return;
  }
  else if (event.data.type === 'claim') {
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
  console.log("event", event.data);
  console.log("currentDatabase", currentDatabase);

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

      // Cas DPoP
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
      console.log("ici1", currentDatabase.codeVerifier);
      console.log("ici2", data.data.codeVerifier);
      console.log("ici3", configurationName);
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

// Écouteurs
//_self.addEventListener('install', handleInstall);
//_self.addEventListener('activate', handleActivate);
_self.addEventListener('fetch', handleFetch);
_self.addEventListener('message', handleMessage);

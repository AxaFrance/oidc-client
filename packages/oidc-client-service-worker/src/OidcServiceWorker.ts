import { acceptAnyDomainToken, scriptFilename, TOKEN } from './constants';
import {
  Database,
  MessageEventData,
  OidcConfig,
  OidcConfiguration,
  TrustedDomains,
  // TrustedDomainsShowAccessToken,
} from './types';
import {
  checkDomain,
  getCurrentDatabaseDomain,
  getDomains,
  hideTokens,
  isTokensValid,
  serializeHeaders,
  sleep,
} from './utils';
import { replaceCodeVerifier } from './utils/codeVerifier';

const _self = self as ServiceWorkerGlobalScope & typeof globalThis;

declare let trustedDomains: TrustedDomains;

_self.importScripts(scriptFilename);

const id = Math.round(new Date().getTime() / 1000).toString();

const keepAliveJsonFilename = 'OidcKeepAliveServiceWorker.json';
const handleInstall = (event: ExtendableEvent) => {
  console.log('[OidcServiceWorker] service worker installed ' + id);
  event.waitUntil(_self.skipWaiting());
};

const handleActivate = (event: ExtendableEvent) => {
  console.log('[OidcServiceWorker] service worker activated ' + id);
  event.waitUntil(_self.clients.claim());
};

let currentLoginCallbackConfigurationName: string | null = null;
const database: Database = {
  default: {
    configurationName: 'default',
    tokens: null,
    status: null,
    state: null,
    codeVerifier: null,
    nonce: null,
    oidcServerConfiguration: null,
    hideAccessToken: true,
  },
};

const getCurrentDatabasesTokenEndpoint = (database: Database, url: string) => {
  const databases: OidcConfig[] = [];
  for (const [, value] of Object.entries<OidcConfig>(database)) {
    if (
      value.oidcServerConfiguration != null &&
      url.startsWith(value.oidcServerConfiguration.tokenEndpoint)
    ) {
      databases.push(value);
    } else if (
      value.oidcServerConfiguration != null &&
      value.oidcServerConfiguration.revocationEndpoint &&
      url.startsWith(value.oidcServerConfiguration.revocationEndpoint)
    ) {
      databases.push(value);
    }
  }
  return databases;
};

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

const handleFetch = async (event: FetchEvent) => {
  const originalRequest = event.request;
  const url = originalRequest.url;
  if (originalRequest.url.includes(keepAliveJsonFilename)) {
    event.respondWith(keepAliveAsync(event));
    return;
  }

  const currentDatabaseForRequestAccessToken = getCurrentDatabaseDomain(
    database,
    originalRequest.url,
    trustedDomains,
  );
  if (
    currentDatabaseForRequestAccessToken &&
    currentDatabaseForRequestAccessToken.tokens &&
    currentDatabaseForRequestAccessToken.tokens.access_token
  ) {
    while (
      currentDatabaseForRequestAccessToken.tokens &&
      !isTokensValid(currentDatabaseForRequestAccessToken.tokens)
    ) {
      await sleep(200);
    }
    const newRequest =
      originalRequest.mode === 'navigate'
        ? new Request(originalRequest, {
            headers: {
              ...serializeHeaders(originalRequest.headers),
              authorization:
                'Bearer ' +
                currentDatabaseForRequestAccessToken.tokens.access_token,
            },
          })
        : new Request(originalRequest, {
            headers: {
              ...serializeHeaders(originalRequest.headers),
              authorization:
                'Bearer ' +
                currentDatabaseForRequestAccessToken.tokens.access_token,
            },
            mode: (
              currentDatabaseForRequestAccessToken.oidcConfiguration as OidcConfiguration
            ).service_worker_convert_all_requests_to_cors
              ? 'cors'
              : originalRequest.mode,
          });

    // @ts-ignore -- TODO: review, waitUntil takes a promise, this returns a void
    event.waitUntil(event.respondWith(fetch(newRequest)));

    return;
  }

  if (event.request.method !== 'POST') {
    return;
  }

  let currentDatabase: OidcConfig | null = null;
  const currentDatabases = getCurrentDatabasesTokenEndpoint(
    database,
    originalRequest.url,
  );
  const numberDatabase = currentDatabases.length;
  if (numberDatabase > 0) {
    const maPromesse = new Promise<Response>((resolve, reject) => {
      const clonedRequest = originalRequest.clone();
      const response = clonedRequest.text().then((actualBody) => {
        if (
          actualBody.includes(TOKEN.REFRESH_TOKEN) ||
          actualBody.includes(TOKEN.ACCESS_TOKEN)
        ) {
          let newBody = actualBody;
          for (let i = 0; i < numberDatabase; i++) {
            const currentDb = currentDatabases[i];

            if (currentDb && currentDb.tokens != null) {
              const keyRefreshToken =
                TOKEN.REFRESH_TOKEN + '_' + currentDb.configurationName;
              if (actualBody.includes(keyRefreshToken)) {
                newBody = newBody.replace(
                  keyRefreshToken,
                  encodeURIComponent(currentDb.tokens.refresh_token as string),
                );
                currentDatabase = currentDb;
                break;
              }
              const keyAccessToken =
                TOKEN.ACCESS_TOKEN + '_' + currentDb.configurationName;
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

          if (
            currentDatabase &&
            currentDatabase.oidcServerConfiguration != null &&
            currentDatabase.oidcServerConfiguration.revocationEndpoint &&
            url.startsWith(
              currentDatabase.oidcServerConfiguration.revocationEndpoint,
            )
          ) {
            return fetchPromise.then(async (response) => {
              const text = await response.text();
              return new Response(text, response);
            });
          }
          return fetchPromise.then(hideTokens(currentDatabase as OidcConfig)); // todo type assertion to OidcConfig but could be null, NEEDS REVIEW
        } else if (
          actualBody.includes('code_verifier=') &&
          currentLoginCallbackConfigurationName
        ) {
          currentDatabase = database[currentLoginCallbackConfigurationName];
          currentLoginCallbackConfigurationName = null;
          let newBody = actualBody;
          if (currentDatabase && currentDatabase.codeVerifier != null) {
            newBody = replaceCodeVerifier(newBody, currentDatabase.codeVerifier);
          }

          return fetch(originalRequest, {
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
          }).then(hideTokens(currentDatabase));
        }
        return undefined;
      });
      response
        .then((r) => {
          if (r !== undefined) {
            resolve(r);
          } else {
            console.log('success undefined');
            reject(new Error('Response is undefined inside a success'));
          }
        })
        .catch((err) => {
          if (err !== undefined) {
            reject(err);
          } else {
            console.log('error undefined');
            reject(new Error('Response is undefined inside a error'));
          }
        });
    });

    // @ts-ignore -- TODO: review, waitUntil takes a promise, this returns a void
    event.waitUntil(event.respondWith(maPromesse));
  }
};

type TrustedDomainsShowAccessToken = {
  [key: string]: boolean;
}

const trustedDomainsShowAccessToken: TrustedDomainsShowAccessToken = {};

const handleMessage = (event: ExtendableMessageEvent) => {
  const port = event.ports[0];
  const data = event.data as MessageEventData;
  const configurationName = data.configurationName;
  let currentDatabase = database[configurationName];
  if (trustedDomains == null) {
    trustedDomains = {};
  }
  if (!currentDatabase) {
    if (trustedDomainsShowAccessToken[configurationName] === undefined) {
      const trustedDomain = trustedDomains[configurationName];
      trustedDomainsShowAccessToken[configurationName] = Array.isArray(trustedDomain) ? false : trustedDomain.showAccessToken;
    }
    database[configurationName] = {
      tokens: null,
      state: null,
      codeVerifier: null,
      oidcServerConfiguration: null,
      oidcConfiguration: undefined,
      nonce: null,
      status: null,
      configurationName,
      hideAccessToken: !trustedDomainsShowAccessToken[configurationName],
    };
    currentDatabase = database[configurationName];

    if (!trustedDomains[configurationName]) {
      trustedDomains[configurationName] = [];
    }
  }

  switch (data.type) {
    case 'clear':
      currentDatabase.tokens = null;
      currentDatabase.state = null;
      currentDatabase.codeVerifier = null;
      currentDatabase.status = data.data.status;
      port.postMessage({ configurationName });
      return;
    case 'init': {
      const oidcServerConfiguration = data.data.oidcServerConfiguration;
      const trustedDomain = trustedDomains[configurationName];
      const domains = getDomains(trustedDomain, 'oidc');
      if (!domains.find((f) => f === acceptAnyDomainToken)) {
        [
          oidcServerConfiguration.tokenEndpoint,
          oidcServerConfiguration.revocationEndpoint,
          oidcServerConfiguration.userInfoEndpoint,
          oidcServerConfiguration.issuer,
        ].forEach((url) => {
          checkDomain(domains, url);
        });
      }
    currentDatabase.oidcServerConfiguration = oidcServerConfiguration;
      currentDatabase.oidcConfiguration = data.data.oidcConfiguration;
      const where = data.data.where;
      if (
        where === 'loginCallbackAsync' ||
        where === 'tryKeepExistingSessionAsync'
      ) {
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
        };
        if (currentDatabase.hideAccessToken) {
          tokens.access_token = TOKEN.ACCESS_TOKEN + '_' + configurationName;
        }
        if (tokens.refresh_token) {
          tokens.refresh_token = TOKEN.REFRESH_TOKEN + '_' + configurationName;
        }
        if (
          tokens.idTokenPayload &&
          tokens.idTokenPayload.nonce &&
          currentDatabase.nonce != null
        ) {
          tokens.idTokenPayload.nonce =
            TOKEN.NONCE_TOKEN + '_' + configurationName;
        }
        port.postMessage({
          tokens,
          status: currentDatabase.status,
          configurationName,
        });
      }
      return;
    }
    case 'setState':
      currentDatabase.state = data.data.state;
      port.postMessage({ configurationName });
      return;
    case 'getState': {
      const state = currentDatabase.state;
      port.postMessage({ configurationName, state });
      return;
    }
    case 'setCodeVerifier':
      currentDatabase.codeVerifier = data.data.codeVerifier;
      port.postMessage({ configurationName });
      return;
    case 'getCodeVerifier': {
      port.postMessage({
        configurationName,
        codeVerifier: currentDatabase.codeVerifier != null ? TOKEN.CODE_VERIFIER + '_' + configurationName : null,
      });
      return;
    }
    case 'setSessionState':
      currentDatabase.sessionState = data.data.sessionState;
      port.postMessage({ configurationName });
      return;
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
      const keyNonce = TOKEN.NONCE_TOKEN + '_' + configurationName;
      const nonce = currentDatabase.nonce ? keyNonce : null;
      port.postMessage({ configurationName, nonce });
      return;
    }
    default:
      currentDatabase.items = { ...data.data };
      port.postMessage({ configurationName });
  }
};

_self.addEventListener('install', handleInstall);
_self.addEventListener('activate', handleActivate);
_self.addEventListener('fetch', handleFetch);
_self.addEventListener('message', handleMessage);

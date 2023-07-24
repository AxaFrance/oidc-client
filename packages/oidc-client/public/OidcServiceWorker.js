const scriptFilename = "OidcTrustedDomains.js";
const acceptAnyDomainToken = "*";
const TOKEN = {
  REFRESH_TOKEN: "REFRESH_TOKEN_SECURED_BY_OIDC_SERVICE_WORKER",
  ACCESS_TOKEN: "ACCESS_TOKEN_SECURED_BY_OIDC_SERVICE_WORKER",
  NONCE_TOKEN: "NONCE_SECURED_BY_OIDC_SERVICE_WORKER",
  CODE_VERIFIER: "CODE_VERIFIER_SECURED_BY_OIDC_SERVICE_WORKER"
};
const TokenRenewMode = {
  access_token_or_id_token_invalid: "access_token_or_id_token_invalid",
  access_token_invalid: "access_token_invalid",
  id_token_invalid: "id_token_invalid"
};
const openidWellknownUrlEndWith = "/.well-known/openid-configuration";
function checkDomain(domains, endpoint) {
  if (!endpoint) {
    return;
  }
  const domain = domains.find((domain2) => {
    var _a;
    let testable;
    if (typeof domain2 === "string") {
      testable = new RegExp(`^${domain2}`);
    } else {
      testable = domain2;
    }
    return (_a = testable.test) == null ? void 0 : _a.call(testable, endpoint);
  });
  if (!domain) {
    throw new Error(
      "Domain " + endpoint + " is not trusted, please add domain in " + scriptFilename
    );
  }
}
const getDomains = (trustedDomain, type) => {
  if (Array.isArray(trustedDomain)) {
    return trustedDomain;
  }
  return trustedDomain[`${type}Domains`] ?? trustedDomain.domains ?? [];
};
const getCurrentDatabaseDomain = (database2, url, trustedDomains2) => {
  var _a;
  if (url.endsWith(openidWellknownUrlEndWith)) {
    return null;
  }
  for (const [key, currentDatabase] of Object.entries(database2)) {
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
    const trustedDomain = trustedDomains2 == null ? [] : trustedDomains2[key];
    const domains = getDomains(trustedDomain, "accessToken");
    const domainsToSendTokens = oidcServerConfiguration.userInfoEndpoint ? [oidcServerConfiguration.userInfoEndpoint, ...domains] : [...domains];
    let hasToSendToken = false;
    if (domainsToSendTokens.find((f) => f === acceptAnyDomainToken)) {
      hasToSendToken = true;
    } else {
      for (let i = 0; i < domainsToSendTokens.length; i++) {
        let domain = domainsToSendTokens[i];
        if (typeof domain === "string") {
          domain = new RegExp(`^${domain}`);
        }
        if ((_a = domain.test) == null ? void 0 : _a.call(domain, url)) {
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
function serializeHeaders(headers) {
  const headersObj = {};
  for (const key of headers.keys()) {
    if (headers.has(key)) {
      headersObj[key] = headers.get(key);
    }
  }
  return headersObj;
}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function countLetter(str, find) {
  return str.split(find).length - 1;
}
function parseJwt(token) {
  return JSON.parse(
    b64DecodeUnicode(token.split(".")[1].replace("-", "+").replace("_", "/"))
  );
}
function b64DecodeUnicode(str) {
  return decodeURIComponent(
    Array.prototype.map.call(
      atob(str),
      (c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)
    ).join("")
  );
}
function computeTimeLeft(refreshTimeBeforeTokensExpirationInSecond, expiresAt) {
  const currentTimeUnixSecond = (/* @__PURE__ */ new Date()).getTime() / 1e3;
  return Math.round(
    expiresAt - refreshTimeBeforeTokensExpirationInSecond - currentTimeUnixSecond
  );
}
function isTokensValid(tokens) {
  if (!tokens) {
    return false;
  }
  return computeTimeLeft(0, tokens.expiresAt) > 0;
}
const extractTokenPayload = (token) => {
  try {
    if (!token) {
      return null;
    }
    if (countLetter(token, ".") === 2) {
      return parseJwt(token);
    } else {
      return null;
    }
  } catch (e) {
    console.warn(e);
  }
  return null;
};
const isTokensOidcValid = (tokens, nonce, oidcServerConfiguration) => {
  if (tokens.idTokenPayload) {
    const idTokenPayload = tokens.idTokenPayload;
    if (oidcServerConfiguration.issuer !== idTokenPayload.iss) {
      return { isValid: false, reason: "Issuer does not match" };
    }
    const currentTimeUnixSecond = (/* @__PURE__ */ new Date()).getTime() / 1e3;
    if (idTokenPayload.exp && idTokenPayload.exp < currentTimeUnixSecond) {
      return { isValid: false, reason: "Token expired" };
    }
    const timeInSevenDays = 60 * 60 * 24 * 7;
    if (idTokenPayload.iat && idTokenPayload.iat + timeInSevenDays < currentTimeUnixSecond) {
      return { isValid: false, reason: "Token is used from too long time" };
    }
    if (nonce && idTokenPayload.nonce && idTokenPayload.nonce !== nonce) {
      return { isValid: false, reason: "Nonce does not match" };
    }
  }
  return { isValid: true, reason: "" };
};
function _hideTokens(tokens, currentDatabaseElement, configurationName) {
  if (!tokens.issued_at) {
    const currentTimeUnixSecond = (/* @__PURE__ */ new Date()).getTime() / 1e3;
    tokens.issued_at = currentTimeUnixSecond;
  }
  const accessTokenPayload = extractTokenPayload(tokens.access_token);
  const secureTokens = {
    ...tokens,
    accessTokenPayload
  };
  if (currentDatabaseElement.hideAccessToken) {
    secureTokens.access_token = TOKEN.ACCESS_TOKEN + "_" + configurationName;
  }
  tokens.accessTokenPayload = accessTokenPayload;
  let _idTokenPayload = null;
  if (tokens.id_token) {
    _idTokenPayload = extractTokenPayload(tokens.id_token);
    tokens.idTokenPayload = { ..._idTokenPayload };
    if (_idTokenPayload.nonce && currentDatabaseElement.nonce != null) {
      const keyNonce = TOKEN.NONCE_TOKEN + "_" + currentDatabaseElement.configurationName;
      _idTokenPayload.nonce = keyNonce;
    }
    secureTokens.idTokenPayload = _idTokenPayload;
  }
  if (tokens.refresh_token) {
    secureTokens.refresh_token = TOKEN.REFRESH_TOKEN + "_" + configurationName;
  }
  const idTokenExpiresAt = _idTokenPayload && _idTokenPayload.exp ? _idTokenPayload.exp : Number.MAX_VALUE;
  const accessTokenExpiresAt = accessTokenPayload && accessTokenPayload.exp ? accessTokenPayload.exp : tokens.issued_at + tokens.expires_in;
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
  const { isValid, reason } = isTokensOidcValid(
    tokens,
    nonce,
    currentDatabaseElement.oidcServerConfiguration
  );
  if (!isValid) {
    throw Error(`Tokens are not OpenID valid, reason: ${reason}`);
  }
  if (currentDatabaseElement.tokens != null && "refresh_token" in currentDatabaseElement.tokens && !("refresh_token" in tokens)) {
    const refreshToken = currentDatabaseElement.tokens.refresh_token;
    currentDatabaseElement.tokens = {
      ...tokens,
      refresh_token: refreshToken
    };
  } else {
    currentDatabaseElement.tokens = tokens;
  }
  currentDatabaseElement.status = "LOGGED_IN";
  return secureTokens;
}
function hideTokens(currentDatabaseElement) {
  const configurationName = currentDatabaseElement.configurationName;
  return (response) => {
    if (response.status !== 200) {
      return response;
    }
    return response.json().then((tokens) => {
      const secureTokens = _hideTokens(tokens, currentDatabaseElement, configurationName);
      const body = JSON.stringify(secureTokens);
      return new Response(body, response);
    });
  };
}
function replaceCodeVerifier(codeVerifier, newCodeVerifier) {
  const regex = /code_verifier=[A-Za-z0-9_-]+/i;
  return codeVerifier.replace(regex, `code_verifier=${newCodeVerifier}`);
}
const _self = self;
_self.importScripts(scriptFilename);
const id = Math.round((/* @__PURE__ */ new Date()).getTime() / 1e3).toString();
const keepAliveJsonFilename = "OidcKeepAliveServiceWorker.json";
const handleInstall = (event) => {
  console.log("[OidcServiceWorker] service worker installed " + id);
  event.waitUntil(_self.skipWaiting());
};
const handleActivate = (event) => {
  console.log("[OidcServiceWorker] service worker activated " + id);
  event.waitUntil(_self.clients.claim());
};
let currentLoginCallbackConfigurationName = null;
const database = {
  default: {
    configurationName: "default",
    tokens: null,
    status: null,
    state: null,
    codeVerifier: null,
    nonce: null,
    oidcServerConfiguration: null,
    hideAccessToken: true
  }
};
const getCurrentDatabasesTokenEndpoint = (database2, url) => {
  const databases = [];
  for (const [, value] of Object.entries(database2)) {
    if (value.oidcServerConfiguration != null && url.startsWith(value.oidcServerConfiguration.tokenEndpoint)) {
      databases.push(value);
    } else if (value.oidcServerConfiguration != null && value.oidcServerConfiguration.revocationEndpoint && url.startsWith(value.oidcServerConfiguration.revocationEndpoint)) {
      databases.push(value);
    }
  }
  return databases;
};
const keepAliveAsync = async (event) => {
  const originalRequest = event.request;
  const isFromVanilla = originalRequest.headers.has("oidc-vanilla");
  const init = { status: 200, statusText: "oidc-service-worker" };
  const response = new Response("{}", init);
  if (!isFromVanilla) {
    const originalRequestUrl = new URL(originalRequest.url);
    const minSleepSeconds = Number(originalRequestUrl.searchParams.get("minSleepSeconds")) || 240;
    for (let i = 0; i < minSleepSeconds; i++) {
      await sleep(1e3 + Math.floor(Math.random() * 1e3));
      const cache = await caches.open("oidc_dummy_cache");
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
  const currentDatabaseForRequestAccessToken = getCurrentDatabaseDomain(
    database,
    originalRequest.url,
    trustedDomains
  );
  if (currentDatabaseForRequestAccessToken && currentDatabaseForRequestAccessToken.tokens && currentDatabaseForRequestAccessToken.tokens.access_token) {
    while (currentDatabaseForRequestAccessToken.tokens && !isTokensValid(currentDatabaseForRequestAccessToken.tokens)) {
      await sleep(200);
    }
    const newRequest = originalRequest.mode === "navigate" ? new Request(originalRequest, {
      headers: {
        ...serializeHeaders(originalRequest.headers),
        authorization: "Bearer " + currentDatabaseForRequestAccessToken.tokens.access_token
      }
    }) : new Request(originalRequest, {
      headers: {
        ...serializeHeaders(originalRequest.headers),
        authorization: "Bearer " + currentDatabaseForRequestAccessToken.tokens.access_token
      },
      mode: currentDatabaseForRequestAccessToken.oidcConfiguration.service_worker_convert_all_requests_to_cors ? "cors" : originalRequest.mode
    });
    event.waitUntil(event.respondWith(fetch(newRequest)));
    return;
  }
  if (event.request.method !== "POST") {
    return;
  }
  let currentDatabase = null;
  const currentDatabases = getCurrentDatabasesTokenEndpoint(
    database,
    originalRequest.url
  );
  const numberDatabase = currentDatabases.length;
  if (numberDatabase > 0) {
    const maPromesse = new Promise((resolve, reject) => {
      const clonedRequest = originalRequest.clone();
      const response = clonedRequest.text().then((actualBody) => {
        if (actualBody.includes(TOKEN.REFRESH_TOKEN) || actualBody.includes(TOKEN.ACCESS_TOKEN)) {
          let newBody = actualBody;
          for (let i = 0; i < numberDatabase; i++) {
            const currentDb = currentDatabases[i];
            if (currentDb && currentDb.tokens != null) {
              const keyRefreshToken = TOKEN.REFRESH_TOKEN + "_" + currentDb.configurationName;
              if (actualBody.includes(keyRefreshToken)) {
                newBody = newBody.replace(
                  keyRefreshToken,
                  encodeURIComponent(currentDb.tokens.refresh_token)
                );
                currentDatabase = currentDb;
                break;
              }
              const keyAccessToken = TOKEN.ACCESS_TOKEN + "_" + currentDb.configurationName;
              if (actualBody.includes(keyAccessToken)) {
                newBody = newBody.replace(
                  keyAccessToken,
                  encodeURIComponent(currentDb.tokens.access_token)
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
              ...serializeHeaders(originalRequest.headers)
            },
            mode: clonedRequest.mode,
            cache: clonedRequest.cache,
            redirect: clonedRequest.redirect,
            referrer: clonedRequest.referrer,
            credentials: clonedRequest.credentials,
            integrity: clonedRequest.integrity
          });
          if (currentDatabase && currentDatabase.oidcServerConfiguration != null && currentDatabase.oidcServerConfiguration.revocationEndpoint && url.startsWith(
            currentDatabase.oidcServerConfiguration.revocationEndpoint
          )) {
            return fetchPromise.then(async (response2) => {
              const text = await response2.text();
              return new Response(text, response2);
            });
          }
          return fetchPromise.then(hideTokens(currentDatabase));
        } else if (actualBody.includes("code_verifier=") && currentLoginCallbackConfigurationName) {
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
              ...serializeHeaders(originalRequest.headers)
            },
            mode: clonedRequest.mode,
            cache: clonedRequest.cache,
            redirect: clonedRequest.redirect,
            referrer: clonedRequest.referrer,
            credentials: clonedRequest.credentials,
            integrity: clonedRequest.integrity
          }).then(hideTokens(currentDatabase));
        }
        return fetch(originalRequest, {
          body: actualBody,
          method: clonedRequest.method,
          headers: {
            ...serializeHeaders(originalRequest.headers)
          },
          mode: clonedRequest.mode,
          cache: clonedRequest.cache,
          redirect: clonedRequest.redirect,
          referrer: clonedRequest.referrer,
          credentials: clonedRequest.credentials,
          integrity: clonedRequest.integrity
        });
      });
      response.then((r) => {
        resolve(r);
      }).catch((err) => {
        reject(err);
      });
    });
    event.waitUntil(event.respondWith(maPromesse));
  }
};
const trustedDomainsShowAccessToken = {};
const handleMessage = (event) => {
  const port = event.ports[0];
  const data = event.data;
  const configurationName = data.configurationName;
  let currentDatabase = database[configurationName];
  if (trustedDomains == null) {
    trustedDomains = {};
  }
  if (!currentDatabase) {
    if (trustedDomainsShowAccessToken[configurationName] === void 0) {
      const trustedDomain = trustedDomains[configurationName];
      trustedDomainsShowAccessToken[configurationName] = Array.isArray(trustedDomain) ? false : trustedDomain.showAccessToken;
    }
    database[configurationName] = {
      tokens: null,
      state: null,
      codeVerifier: null,
      oidcServerConfiguration: null,
      oidcConfiguration: void 0,
      nonce: null,
      status: null,
      configurationName,
      hideAccessToken: !trustedDomainsShowAccessToken[configurationName]
    };
    currentDatabase = database[configurationName];
    if (!trustedDomains[configurationName]) {
      trustedDomains[configurationName] = [];
    }
  }
  switch (data.type) {
    case "clear":
      currentDatabase.tokens = null;
      currentDatabase.state = null;
      currentDatabase.codeVerifier = null;
      currentDatabase.status = data.data.status;
      port.postMessage({ configurationName });
      return;
    case "init": {
      const oidcServerConfiguration = data.data.oidcServerConfiguration;
      const trustedDomain = trustedDomains[configurationName];
      const domains = getDomains(trustedDomain, "oidc");
      if (!domains.find((f) => f === acceptAnyDomainToken)) {
        [
          oidcServerConfiguration.tokenEndpoint,
          oidcServerConfiguration.revocationEndpoint,
          oidcServerConfiguration.userInfoEndpoint,
          oidcServerConfiguration.issuer
        ].forEach((url) => {
          checkDomain(domains, url);
        });
      }
      currentDatabase.oidcServerConfiguration = oidcServerConfiguration;
      currentDatabase.oidcConfiguration = data.data.oidcConfiguration;
      const where = data.data.where;
      if (where === "loginCallbackAsync" || where === "tryKeepExistingSessionAsync") {
        currentLoginCallbackConfigurationName = configurationName;
      } else {
        currentLoginCallbackConfigurationName = null;
      }
      if (!currentDatabase.tokens) {
        port.postMessage({
          tokens: null,
          status: currentDatabase.status,
          configurationName
        });
      } else {
        const tokens = {
          ...currentDatabase.tokens
        };
        if (currentDatabase.hideAccessToken) {
          tokens.access_token = TOKEN.ACCESS_TOKEN + "_" + configurationName;
        }
        if (tokens.refresh_token) {
          tokens.refresh_token = TOKEN.REFRESH_TOKEN + "_" + configurationName;
        }
        if (tokens.idTokenPayload && tokens.idTokenPayload.nonce && currentDatabase.nonce != null) {
          tokens.idTokenPayload.nonce = TOKEN.NONCE_TOKEN + "_" + configurationName;
        }
        port.postMessage({
          tokens,
          status: currentDatabase.status,
          configurationName
        });
      }
      return;
    }
    case "setState":
      currentDatabase.state = data.data.state;
      port.postMessage({ configurationName });
      return;
    case "getState": {
      const state = currentDatabase.state;
      port.postMessage({ configurationName, state });
      return;
    }
    case "setCodeVerifier":
      currentDatabase.codeVerifier = data.data.codeVerifier;
      port.postMessage({ configurationName });
      return;
    case "getCodeVerifier": {
      port.postMessage({
        configurationName,
        codeVerifier: currentDatabase.codeVerifier != null ? TOKEN.CODE_VERIFIER + "_" + configurationName : null
      });
      return;
    }
    case "setSessionState":
      currentDatabase.sessionState = data.data.sessionState;
      port.postMessage({ configurationName });
      return;
    case "getSessionState": {
      const sessionState = currentDatabase.sessionState;
      port.postMessage({ configurationName, sessionState });
      return;
    }
    case "setNonce": {
      const nonce = data.data.nonce;
      if (nonce) {
        currentDatabase.nonce = nonce;
      }
      port.postMessage({ configurationName });
      return;
    }
    case "getNonce": {
      const keyNonce = TOKEN.NONCE_TOKEN + "_" + configurationName;
      const nonce = currentDatabase.nonce ? keyNonce : null;
      port.postMessage({ configurationName, nonce });
      return;
    }
    default:
      currentDatabase.items = { ...data.data };
      port.postMessage({ configurationName });
  }
};
_self.addEventListener("install", handleInstall);
_self.addEventListener("activate", handleActivate);
_self.addEventListener("fetch", handleFetch);
_self.addEventListener("message", handleMessage);
//# sourceMappingURL=OidcServiceWorker.js.map

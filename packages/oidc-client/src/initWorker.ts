import { ILOidcLocation } from './location';
import { OidcAuthorizationServiceConfiguration } from './oidc';
import { parseOriginalTokens } from './parseTokens.js';
import timer from './timer.js';
import { OidcConfiguration } from './types.js';
import codeVersion from './version.js';

let keepAliveServiceWorkerTimeoutId = null;
let keepAliveController;
export const sleepAsync = ({ milliseconds }: { milliseconds: any }) => {
  return new Promise(resolve => timer.setTimeout(resolve, milliseconds));
};

const keepAlive = (service_worker_keep_alive_path = '/') => {
  try {
    const minSleepSeconds = 150;
    keepAliveController = new AbortController();
    const promise = fetch(
      `${service_worker_keep_alive_path}OidcKeepAliveServiceWorker.json?minSleepSeconds=${minSleepSeconds}`,
      { signal: keepAliveController.signal },
    );
    promise.catch(error => {
      console.log(error);
    });
    sleepAsync({ milliseconds: minSleepSeconds * 1000 }).then(keepAlive);
  } catch (error) {
    console.log(error);
  }
};

const stopKeepAlive = () => {
  if (keepAliveController) {
    keepAliveController.abort();
  }
};

const isServiceWorkerProxyActiveAsync = (service_worker_keep_alive_path = '/') => {
  return fetch(`${service_worker_keep_alive_path}OidcKeepAliveServiceWorker.json`, {
    headers: {
      'oidc-vanilla': 'true',
    },
  })
    .then(response => {
      return response.statusText === 'oidc-service-worker';
    })
    .catch(error => {
      console.log(error);
    });
};

export const defaultServiceWorkerUpdateRequireCallback =
  (location: ILOidcLocation) => async (registration: any, stopKeepAlive: () => void) => {
    stopKeepAlive();
    await registration.update();
    const isSuccess = await registration.unregister();
    console.log(`Service worker unregistration ${isSuccess ? 'successful' : 'failed'}`);
    await sleepAsync({ milliseconds: 2000 });
    location.reload();
  };

const sendMessageAsync =
  registration =>
  (data): Promise<any> => {
    return new Promise(function (resolve, reject) {
      const messageChannel = new MessageChannel();
      messageChannel.port1.onmessage = function (event) {
        if (event?.data.error) {
          reject(event.data.error);
        } else {
          resolve(event.data);
        }

        messageChannel.port1.close();
        messageChannel.port2.close();
      };
      registration.active.postMessage(data, [messageChannel.port2]);
    });
  };

export const initWorkerAsync = async (configuration, configurationName) => {
  const getTabId = () => {
    const tabId = sessionStorage.getItem(`oidc.tabId.${configurationName}`);

    if (tabId) {
      return tabId;
    }

    const newTabId = globalThis.crypto.randomUUID();
    sessionStorage.setItem(`oidc.tabId.${configurationName}`, newTabId);
    return newTabId;
  };

  const serviceWorkerRelativeUrl = configuration.service_worker_relative_url;
  if (
    typeof window === 'undefined' ||
    typeof navigator === 'undefined' ||
    !navigator.serviceWorker ||
    !serviceWorkerRelativeUrl
  ) {
    return null;
  }

  if (configuration.service_worker_activate() === false) {
    return null;
  }

  let registration = null;
  if (configuration.register) {
    registration = await configuration.service_worker_register(serviceWorkerRelativeUrl);
  } else {
    registration = await navigator.serviceWorker.register(serviceWorkerRelativeUrl);
  }

  try {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await sendMessageAsync(registration)({ type: 'claim' });
  } catch (err) {
    return null;
  }

  const clearAsync = async status => {
    return sendMessageAsync(registration)({ type: 'clear', data: { status }, configurationName });
  };
  const initAsync = async (
    oidcServerConfiguration: OidcAuthorizationServiceConfiguration,
    where,
    oidcConfiguration: OidcConfiguration,
  ) => {
    const result = await sendMessageAsync(registration)({
      type: 'init',
      data: {
        oidcServerConfiguration,
        where,
        oidcConfiguration: {
          token_renew_mode: oidcConfiguration.token_renew_mode,
          service_worker_convert_all_requests_to_cors:
            oidcConfiguration.service_worker_convert_all_requests_to_cors,
        },
      },
      configurationName,
      tabId: getTabId(),
    });

    // @ts-ignore
    const serviceWorkerVersion = result.version;
    if (serviceWorkerVersion !== codeVersion) {
      console.warn(
        `Service worker ${serviceWorkerVersion} version mismatch with js client version ${codeVersion}, unregistering and reloading`,
      );
      await oidcConfiguration.service_worker_update_require_callback(registration, stopKeepAlive);
    }

    // @ts-ignore
    return {
      tokens: parseOriginalTokens(result.tokens, null, oidcConfiguration.token_renew_mode),
      status: result.status,
    };
  };

  const startKeepAliveServiceWorker = (service_worker_keep_alive_path = '/') => {
    if (keepAliveServiceWorkerTimeoutId == null) {
      keepAliveServiceWorkerTimeoutId = 'not_null';
      keepAlive(service_worker_keep_alive_path);
    }
  };

  const setSessionStateAsync = (sessionState: string) => {
    return sendMessageAsync(registration)({
      type: 'setSessionState',
      data: { sessionState },
      configurationName,
    });
  };

  const getSessionStateAsync = async () => {
    const result = await sendMessageAsync(registration)({
      type: 'getSessionState',
      data: null,
      configurationName,
    });
    // @ts-ignore
    return result.sessionState;
  };

  const setNonceAsync = nonce => {
    const tabId = getTabId();
    sessionStorage[`oidc.nonce.${configurationName}`] = nonce.nonce;
    return sendMessageAsync(registration)({
      type: 'setNonce',
      data: { nonce },
      configurationName,
      tabId,
    });
  };
  const getNonceAsync = async () => {
    const tabId = getTabId();
    // @ts-ignore
    const result = await sendMessageAsync(registration)({
      type: 'getNonce',
      data: null,
      configurationName,
      tabId,
    });
    // @ts-ignore
    let nonce = result.nonce;
    if (!nonce) {
      nonce = sessionStorage[`oidc.nonce.${configurationName}`];
      console.warn('nonce not found in service worker, using sessionStorage');
    }
    return { nonce };
  };

  const getLoginParamsCache = {};
  const setLoginParams = data => {
    getLoginParamsCache[configurationName] = data;
    localStorage[`oidc.login.${configurationName}`] = JSON.stringify(data);
  };

  const getLoginParams = () => {
    const dataString = localStorage[`oidc.login.${configurationName}`];
    if (!getLoginParamsCache[configurationName]) {
      getLoginParamsCache[configurationName] = JSON.parse(dataString);
    }
    return getLoginParamsCache[configurationName];
  };

  const setDemonstratingProofOfPossessionNonce = async (
    demonstratingProofOfPossessionNonce: string,
  ) => {
    await sendMessageAsync(registration)({
      type: 'setDemonstratingProofOfPossessionNonce',
      data: { demonstratingProofOfPossessionNonce },
      configurationName,
    });
  };

  const getDemonstratingProofOfPossessionNonce = async () => {
    const result = await sendMessageAsync(registration)({
      type: 'getDemonstratingProofOfPossessionNonce',
      data: null,
      configurationName,
    });
    return result.demonstratingProofOfPossessionNonce;
  };

  const setDemonstratingProofOfPossessionJwkAsync = async (
    demonstratingProofOfPossessionJwk: JsonWebKey,
  ) => {
    const demonstratingProofOfPossessionJwkJson = JSON.stringify(demonstratingProofOfPossessionJwk);
    await sendMessageAsync(registration)({
      type: 'setDemonstratingProofOfPossessionJwk',
      data: { demonstratingProofOfPossessionJwkJson },
      configurationName,
    });
  };

  const getDemonstratingProofOfPossessionJwkAsync = async () => {
    const result = await sendMessageAsync(registration)({
      type: 'getDemonstratingProofOfPossessionJwk',
      data: null,
      configurationName,
    });
    if (!result.demonstratingProofOfPossessionJwkJson) {
      return null;
    }
    return JSON.parse(result.demonstratingProofOfPossessionJwkJson);
  };

  const getStateAsync = async () => {
    const tabId = getTabId();
    const result = await sendMessageAsync(registration)({
      type: 'getState',
      data: null,
      configurationName,
      tabId,
    });
    // @ts-ignore
    let state = result.state;
    if (!state) {
      state = sessionStorage[`oidc.state.${configurationName}`];
      console.warn('state not found in service worker, using sessionStorage');
    }
    return state;
  };

  const setStateAsync = async (state: string) => {
    const tabId = getTabId();
    sessionStorage[`oidc.state.${configurationName}`] = state;
    return sendMessageAsync(registration)({
      type: 'setState',
      data: { state },
      configurationName,
      tabId,
    });
  };

  const getCodeVerifierAsync = async () => {
    const tabId = getTabId();
    const result = await sendMessageAsync(registration)({
      type: 'getCodeVerifier',
      data: null,
      configurationName,
      tabId,
    });
    // @ts-ignore
    let codeVerifier = result.codeVerifier;
    if (!codeVerifier) {
      codeVerifier = sessionStorage[`oidc.code_verifier.${configurationName}`];
      console.warn('codeVerifier not found in service worker, using sessionStorage');
    }
    return codeVerifier;
  };

  const setCodeVerifierAsync = async (codeVerifier: string) => {
    const tabId = getTabId();
    sessionStorage[`oidc.code_verifier.${configurationName}`] = codeVerifier;
    return sendMessageAsync(registration)({
      type: 'setCodeVerifier',
      data: { codeVerifier },
      configurationName,
      tabId,
    });
  };

  return {
    clearAsync,
    initAsync,
    startKeepAliveServiceWorker: () =>
      startKeepAliveServiceWorker(configuration.service_worker_keep_alive_path),
    isServiceWorkerProxyActiveAsync: () =>
      isServiceWorkerProxyActiveAsync(configuration.service_worker_keep_alive_path),
    setSessionStateAsync,
    getSessionStateAsync,
    setNonceAsync,
    getNonceAsync,
    setLoginParams,
    getLoginParams,
    getStateAsync,
    setStateAsync,
    getCodeVerifierAsync,
    setCodeVerifierAsync,
    setDemonstratingProofOfPossessionNonce,
    getDemonstratingProofOfPossessionNonce,
    setDemonstratingProofOfPossessionJwkAsync,
    getDemonstratingProofOfPossessionJwkAsync,
  };
};

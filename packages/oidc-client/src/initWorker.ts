import { ILOidcLocation } from './location';
import { parseOriginalTokens } from './parseTokens.js';
import timer from './timer.js';
import { OidcConfiguration } from './types.js';
import codeVersion from './version.js';

let keepAliveServiceWorkerTimeoutId = null;
let keepAliveController: AbortController | undefined;

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

    sleepAsync({ milliseconds: minSleepSeconds * 1000 }).then(() =>
      keepAlive(service_worker_keep_alive_path),
    );
  } catch (error) {
    console.log(error);
  }
};

const stopKeepAlive = () => {
  if (keepAliveController) {
    keepAliveController.abort();
  }
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

export const getTabId = (configurationName: string) => {
  const key = `oidc.tabId.${configurationName}`;
  const tabId = sessionStorage.getItem(key);
  if (tabId) return tabId;

  const newTabId = globalThis.crypto.randomUUID();
  sessionStorage.setItem(key, newTabId);
  return newTabId;
};

const DEFAULT_SW_MESSAGE_TIMEOUT_MS = 5000;

const getServiceWorkerTarget = (registration: ServiceWorkerRegistration): ServiceWorker | null => {
  return (
    navigator.serviceWorker.controller ??
    registration.active ??
    registration.waiting ??
    registration.installing ??
    null
  );
};

const sendMessageAsync =
  (registration: ServiceWorkerRegistration, opts?: { timeoutMs?: number }) =>
  (data: any): Promise<any> => {
    const timeoutMs = opts?.timeoutMs ?? DEFAULT_SW_MESSAGE_TIMEOUT_MS;

    return new Promise((resolve, reject) => {
      const target = getServiceWorkerTarget(registration);

      if (!target) {
        reject(
          new Error(
            'Service worker target not available (controller/active/waiting/installing missing)',
          ),
        );
        return;
      }

      const messageChannel = new MessageChannel();
      let timeoutId: any = null;

      const cleanup = () => {
        try {
          if (timeoutId != null) {
            timer.clearTimeout(timeoutId);
            timeoutId = null;
          }
          messageChannel.port1.onmessage = null;
          messageChannel.port1.close();
          messageChannel.port2.close();
        } catch (ex) {
          console.error(ex);
        }
      };

      timeoutId = timer.setTimeout(() => {
        cleanup();
        reject(
          new Error(`Service worker did not respond within ${timeoutMs}ms (type=${data?.type})`),
        );
      }, timeoutMs);

      messageChannel.port1.onmessage = event => {
        cleanup();
        if (event?.data?.error) reject(event.data.error);
        else resolve(event.data);
      };

      try {
        const configurationName = data?.configurationName;
        target.postMessage({ ...data, tabId: getTabId(configurationName ?? 'default') }, [
          messageChannel.port2,
        ]);
      } catch (err) {
        cleanup();
        reject(err);
      }
    });
  };

const waitForControllerAsync = async (timeoutMs: number) => {
  if (navigator.serviceWorker.controller) return navigator.serviceWorker.controller;

  return new Promise<ServiceWorker | null>(resolve => {
    let settled = false;
    const onChange = () => {
      if (settled) return;
      settled = true;
      navigator.serviceWorker.removeEventListener('controllerchange', onChange);
      resolve(navigator.serviceWorker.controller ?? null);
    };

    navigator.serviceWorker.addEventListener('controllerchange', onChange);

    timer.setTimeout(() => {
      if (settled) return;
      settled = true;
      navigator.serviceWorker.removeEventListener('controllerchange', onChange);
      resolve(navigator.serviceWorker.controller ?? null);
    }, timeoutMs);
  });
};

// Module-level guards to prevent:
// - registering multiple controllerchange listeners (one per initWorkerAsync call)
// - reloading more than once per page lifetime
let controllerChangeListenerRegistered = false;
let controllerChangeReloading = false;

// Session-level guard to prevent infinite reload loops caused by SW update cycles.
// The controllerchange listener triggers a page reload, but after reload the module-level
// guards above are reset. If the SW still hasn't been updated correctly (e.g. stale cache,
// Firefox issues), the cycle would repeat forever. This key tracks reloads across page loads
// via sessionStorage so we can break the loop.
const SW_RELOAD_SESSION_KEY = 'oidc.sw.controllerchange_reload_count';
const SW_RELOAD_MAX = 3;

const getControllerChangeReloadCount = (): number => {
  try {
    return parseInt(sessionStorage.getItem(SW_RELOAD_SESSION_KEY) ?? '0', 10);
  } catch {
    return 0;
  }
};

const incrementControllerChangeReloadCount = (): number => {
  const count = getControllerChangeReloadCount() + 1;
  try {
    sessionStorage.setItem(SW_RELOAD_SESSION_KEY, String(count));
  } catch {
    // ignore
  }
  return count;
};

const clearControllerChangeReloadCount = () => {
  try {
    sessionStorage.removeItem(SW_RELOAD_SESSION_KEY);
  } catch {
    // ignore
  }
};

export const initWorkerAsync = async (
  configuration: OidcConfiguration,
  configurationName: string,
) => {
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

  const swUrl = `${serviceWorkerRelativeUrl}?v=${codeVersion}`;

  let registration: ServiceWorkerRegistration = null as any;
  if (configuration.service_worker_register) {
    registration = await configuration.service_worker_register(serviceWorkerRelativeUrl);
  } else {
    registration = await navigator.serviceWorker.register(swUrl, {
      updateViaCache: 'none',
    });
  }

  const versionMismatchKey = `oidc.sw.version_mismatch_reload.${configurationName}`;

  const sendSkipWaitingToWorker = async (targetSw: ServiceWorker) => {
    stopKeepAlive();
    console.log('New SW waiting – SKIP_WAITING');
    try {
      await new Promise<void>((resolve, reject) => {
        const messageChannel = new MessageChannel();
        let timeoutId: any = null;

        const cleanup = () => {
          try {
            if (timeoutId != null) {
              timer.clearTimeout(timeoutId);
              timeoutId = null;
            }
            messageChannel.port1.onmessage = null;
            messageChannel.port1.close();
            messageChannel.port2.close();
          } catch (ex) {
            console.error(ex);
          }
        };

        timeoutId = timer.setTimeout(() => {
          cleanup();
          reject(new Error('SKIP_WAITING did not respond within 8000ms'));
        }, 8000);

        messageChannel.port1.onmessage = event => {
          cleanup();
          if (event?.data?.error) reject(event.data.error);
          else resolve();
        };

        try {
          targetSw.postMessage(
            {
              type: 'SKIP_WAITING',
              configurationName,
              data: null,
              tabId: getTabId(configurationName ?? 'default'),
            },
            [messageChannel.port2],
          );
        } catch (err) {
          cleanup();
          reject(err);
        }
      });
    } catch (e) {
      console.warn('SKIP_WAITING failed', e);
    }
  };

  const sendSkipWaiting = async () => {
    const waitingSw = registration.waiting;
    if (waitingSw) {
      await sendSkipWaitingToWorker(waitingSw);
    } else {
      console.warn('sendSkipWaiting called but no waiting service worker found');
    }
  };

  const trackInstallingWorker = (newSW: ServiceWorker) => {
    stopKeepAlive();
    newSW.addEventListener('statechange', async () => {
      if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
        // Guard against infinite SKIP_WAITING → controllerchange → reload loops.
        // If we've already exhausted the reload budget, don't force activation – let the
        // browser handle it naturally on the next navigation instead.
        if (getControllerChangeReloadCount() >= SW_RELOAD_MAX) {
          console.warn(
            'SW trackInstallingWorker: skipping SKIP_WAITING because the reload budget is exhausted',
          );
          return;
        }
        await sendSkipWaitingToWorker(newSW);
      }
    });
  };

  // 1) Détection updatefound – registered BEFORE update() to avoid missing the event
  registration.addEventListener('updatefound', () => {
    const newSW = registration.installing;
    if (newSW) {
      trackInstallingWorker(newSW);
    }
  });

  // Handle a SW that is already installing or waiting (e.g. when the listener above was
  // registered after the updatefound event already fired in a previous call)
  if (registration.installing) {
    trackInstallingWorker(registration.installing);
  } else if (registration.waiting && navigator.serviceWorker.controller) {
    // A new SW is already waiting – activate it straight away (unless reload budget exhausted)
    if (getControllerChangeReloadCount() < SW_RELOAD_MAX) {
      sendSkipWaiting();
    } else {
      console.warn(
        'SW: a waiting worker exists but reload budget is exhausted – skipping activation',
      );
    }
  }

  // (Optional but useful on Safari) ask for update early – non-blocking to avoid slowing init
  registration.update().catch(ex => {
    console.error(ex);
  });

  // 2) Claim + init classique (Safari-safe)
  // IMPORTANT: claim() is done BEFORE registering the controllerchange listener,
  // because claim() can trigger a controllerchange event on first visit and we don't
  // want that initial claim to cause a reload loop.
  try {
    await navigator.serviceWorker.ready;

    // If the callback page is not yet controlled, ask claim then wait a bit.
    if (!navigator.serviceWorker.controller) {
      await sendMessageAsync(registration, { timeoutMs: 8000 })({
        type: 'claim',
        configurationName,
        data: null,
      });

      await waitForControllerAsync(2000);
    }
  } catch (err: any) {
    console.warn(`Failed init ServiceWorker ${err?.toString?.() ?? String(err)}`);
    return null;
  }

  // 3) Register the controllerchange listener AFTER claim, and only once per page lifetime.
  // This prevents:
  // - claim() from triggering a reload on first visit
  // - multiple listeners being stacked (initWorkerAsync is called many times)
  // - more than one reload per page lifetime (guard via controllerChangeReloading)
  // - infinite loops across page reloads (guard via sessionStorage counter)
  if (!controllerChangeListenerRegistered) {
    controllerChangeListenerRegistered = true;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (controllerChangeReloading) {
        return;
      }

      // Session-level guard: prevent infinite reload loops when the SW never converges
      // to the expected version (e.g. stale cache, Firefox issues, Electron quirks).
      const reloadCount = incrementControllerChangeReloadCount();
      if (reloadCount > SW_RELOAD_MAX) {
        console.warn(
          `SW controllerchange: reload budget exhausted (${reloadCount - 1} reloads). ` +
            'Skipping reload to avoid infinite loop.',
        );
        return;
      }

      controllerChangeReloading = true;
      console.log('SW controller changed – reloading page');
      stopKeepAlive();
      window.location.reload();
    });
  }

  const clearAsync = async status => {
    return sendMessageAsync(registration)({ type: 'clear', data: { status }, configurationName });
  };

  const initAsync = async (
    oidcServerConfiguration,
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
    });

    // @ts-ignore
    const serviceWorkerVersion = result.version;
    if (serviceWorkerVersion !== codeVersion) {
      console.warn(
        `Service worker ${serviceWorkerVersion} version mismatch with js client version ${codeVersion}, unregistering and reloading`,
      );

      const reloadCount = parseInt(sessionStorage.getItem(versionMismatchKey) ?? '0', 10);
      if (reloadCount < 3) {
        sessionStorage.setItem(versionMismatchKey, String(reloadCount + 1));

        if (registration.waiting) {
          // A new SW is already waiting – activate it; controllerchange will trigger reload
          await sendSkipWaiting();
          // If controllerchange did not reload yet, wait a moment then force reload
          await sleepAsync({ milliseconds: 500 });
          if (!controllerChangeReloading) {
            controllerChangeReloading = true;
            window.location.reload();
          }
          // Return a never-resolving promise to avoid returning stale tokens
          return new Promise<never>(() => {});
        } else {
          // No waiting SW – force a fresh update and reload
          stopKeepAlive();
          try {
            await registration.update();
          } catch (ex) {
            console.error(ex);
          }
          const isSuccess = await registration.unregister();
          console.log(`Service worker unregistering ${isSuccess}`);
          await sleepAsync({ milliseconds: 500 });
          if (!controllerChangeReloading) {
            controllerChangeReloading = true;
            window.location.reload();
          }
          return new Promise<never>(() => {});
        }
      } else {
        // Max retries reached – do NOT clear the key so future initAsync calls
        // won't restart the cycle of 3 reloads
        console.error(
          `Service worker version mismatch persists after ${reloadCount} attempt(s). Continuing with mismatched version.`,
        );
      }
    } else {
      // Version matches – clear any leftover mismatch counter and reload counter
      sessionStorage.removeItem(versionMismatchKey);
      clearControllerChangeReloadCount();
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
    sessionStorage[`oidc.nonce.${configurationName}`] = nonce.nonce;
    return sendMessageAsync(registration)({
      type: 'setNonce',
      data: { nonce },
      configurationName,
    });
  };

  const getNonceAsync = async (fallback: boolean = true) => {
    const result = await sendMessageAsync(registration)({
      type: 'getNonce',
      data: null,
      configurationName,
    });

    // @ts-ignore
    let nonce = result.nonce;
    if (!nonce) {
      nonce = sessionStorage[`oidc.nonce.${configurationName}`];
      console.warn('nonce not found in service worker, using sessionStorage');
      if (fallback) {
        await setNonceAsync(nonce);
        const data = await getNonceAsync(false);
        // @ts-ignore
        nonce = data.nonce;
      }
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

  const getStateAsync = async (fallback: boolean = true) => {
    const result = await sendMessageAsync(registration)({
      type: 'getState',
      data: null,
      configurationName,
    });

    // @ts-ignore
    let state = result.state;
    if (!state) {
      state = sessionStorage[`oidc.state.${configurationName}`];
      console.warn('state not found in service worker, using sessionStorage');
      if (fallback) {
        await setStateAsync(state);
        state = await getStateAsync(false);
      }
    }
    return state;
  };

  const setStateAsync = async (state: string) => {
    sessionStorage[`oidc.state.${configurationName}`] = state;
    return sendMessageAsync(registration)({
      type: 'setState',
      data: { state },
      configurationName,
    });
  };

  const getCodeVerifierAsync = async (fallback: boolean = true) => {
    const result = await sendMessageAsync(registration)({
      type: 'getCodeVerifier',
      data: null,
      configurationName,
    });

    // @ts-ignore
    let codeVerifier = result.codeVerifier;
    if (!codeVerifier) {
      codeVerifier = sessionStorage[`oidc.code_verifier.${configurationName}`];
      console.warn('codeVerifier not found in service worker, using sessionStorage');
      if (fallback) {
        await setCodeVerifierAsync(codeVerifier);
        codeVerifier = await getCodeVerifierAsync(false);
      }
    }
    return codeVerifier;
  };

  const setCodeVerifierAsync = async (codeVerifier: string) => {
    sessionStorage[`oidc.code_verifier.${configurationName}`] = codeVerifier;
    return sendMessageAsync(registration)({
      type: 'setCodeVerifier',
      data: { codeVerifier },
      configurationName,
    });
  };

  return {
    clearAsync,
    initAsync,
    startKeepAliveServiceWorker: () =>
      startKeepAliveServiceWorker(configuration.service_worker_keep_alive_path),
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

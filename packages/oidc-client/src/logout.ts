import { eventNames } from './events';
import { initSession } from './initSession.js';
import { initWorkerAsync } from './initWorker.js';
import { ILOidcLocation } from './location';
import { performRevocationRequestAsync, TOKEN_TYPE } from './requests.js';
import timer from './timer.js';
import { StringMap } from './types.js';

export const oidcLogoutTokens = {
  access_token: 'access_token',
  refresh_token: 'refresh_token',
};

const extractExtras = (extras: StringMap, postKey: string): StringMap => {
  const postExtras: StringMap = {};
  if (extras) {
    for (const [key, value] of Object.entries(extras)) {
      if (key.endsWith(postKey)) {
        const newKey = key.replace(postKey, '');
        postExtras[newKey] = value;
      }
    }
    return postExtras;
  }
  return postExtras;
};

const keepExtras = (extras: StringMap): StringMap => {
  const postExtras: StringMap = {};
  if (extras) {
    for (const [key, value] of Object.entries(extras)) {
      if (!key.includes(':')) {
        postExtras[key] = value;
      }
    }
    return postExtras;
  }
  return postExtras;
};

export const destroyAsync = oidc => async status => {
  timer.clearTimeout(oidc.timeoutId);
  oidc.timeoutId = null;
  if (oidc.checkSessionIFrame) {
    oidc.checkSessionIFrame.stop();
  }
  const serviceWorker = await initWorkerAsync(oidc.configuration, oidc.configurationName);
  if (!serviceWorker) {
    const session = initSession(
      oidc.configurationName,
      oidc.configuration.storage,
      oidc.configuration.login_state_storage ?? oidc.configuration.storage,
    );
    await session.clearAsync(status);
  } else {
    await serviceWorker.clearAsync(status);
  }
  oidc.tokens = null;
  oidc.userInfo = null;
};

/**
 * Clears the local OIDC session (tokens, user info, service-worker storage)
 * and broadcasts `logout_from_same_tab` to any other OIDC clients registered
 * in the same tab.
 *
 * It is intentionally decoupled from `logoutAsync`: callers that want to drop
 * the local session without contacting the identity provider — for example a
 * service-worker-only flow, a SPA-only logout, or an error-recovery path —
 * can use this helper directly. `logoutAsync` itself calls it as the very
 * last step, after the browser navigation to `end_session_endpoint` has been
 * scheduled, so that the React tree never observes a transient "no tokens"
 * state before the page is unloaded.
 */
export const clearSessionAsync = (oidc, oidcDatabase) => async () => {
  const sub = oidc.tokens?.idTokenPayload?.sub ?? null;
  await oidc.destroyAsync('LOGGED_OUT');
  for (const [, itemOidc] of Object.entries(oidcDatabase)) {
    if (itemOidc !== oidc) {
      // @ts-ignore
      await oidc.logoutSameTabAsync(oidc.configuration.client_id, sub);
    } else {
      oidc.publishEvent(eventNames.logout_from_same_tab, {});
    }
  }
};

const buildEndSessionUrl = (
  endSessionEndpoint: string,
  endPointExtras: StringMap,
  idToken: string,
  postLogoutRedirectUri: string | null,
): string => {
  if (!('id_token_hint' in endPointExtras)) {
    endPointExtras['id_token_hint'] = idToken;
  }
  if (!('post_logout_redirect_uri' in endPointExtras) && postLogoutRedirectUri !== null) {
    endPointExtras['post_logout_redirect_uri'] = postLogoutRedirectUri;
  }
  let queryString = '';
  for (const [key, value] of Object.entries(endPointExtras)) {
    if (value !== null && value !== undefined) {
      if (queryString === '') {
        queryString += '?';
      } else {
        queryString += '&';
      }
      queryString += `${key}=${encodeURIComponent(value)}`;
    }
  }
  return `${endSessionEndpoint}${queryString}`;
};

export const logoutAsync =
  (oidc, oidcDatabase, fetch, console, oicLocation: ILOidcLocation) =>
  async (callbackPathOrUrl: string | null | undefined = undefined, extras: StringMap = null) => {
    const configuration = oidc.configuration;
    const oidcServerConfiguration = await oidc.initAsync(
      configuration.authority,
      configuration.authority_configuration,
    );
    if (callbackPathOrUrl && typeof callbackPathOrUrl !== 'string') {
      callbackPathOrUrl = undefined;
      console.warn('callbackPathOrUrl path is not a string');
    }
    const path =
      callbackPathOrUrl === null || callbackPathOrUrl === undefined
        ? oicLocation.getPath()
        : callbackPathOrUrl;
    let isUri = false;
    if (callbackPathOrUrl) {
      isUri = callbackPathOrUrl.includes('https://') || callbackPathOrUrl.includes('http://');
    }
    const postLogoutRedirectUri =
      callbackPathOrUrl === null
        ? null
        : isUri
          ? callbackPathOrUrl
          : oicLocation.getOrigin() + path;
    // Capture identifiers from the live session *before* any clear happens, so the
    // values stay valid no matter when we drop local state.
    // @ts-ignore
    const idToken = oidc.tokens ? oidc.tokens.idToken : '';

    // Mark the instance as "logout in progress" so consumers (OidcSecure, route
    // guards, silent renew, 401 retry interceptors, …) can back off from
    // triggering a new auth flow during the window between us clearing the
    // local session and the browser actually navigating away.
    oidc.isLoggingOut = true;

    try {
      try {
        const revocationEndpoint = oidcServerConfiguration.revocationEndpoint;
        if (revocationEndpoint) {
          const promises = [];
          const accessToken = oidc.tokens ? oidc.tokens.accessToken : null;
          if (
            accessToken &&
            configuration.logout_tokens_to_invalidate.includes(oidcLogoutTokens.access_token)
          ) {
            const revokeAccessTokenExtras = extractExtras(extras, ':revoke_access_token');
            const revokeAccessTokenPromise = performRevocationRequestAsync(fetch)(
              revocationEndpoint,
              accessToken,
              TOKEN_TYPE.access_token,
              configuration.client_id,
              revokeAccessTokenExtras,
            );
            promises.push(revokeAccessTokenPromise);
          }
          const refreshToken = oidc.tokens ? oidc.tokens.refreshToken : null;
          if (
            refreshToken &&
            configuration.logout_tokens_to_invalidate.includes(oidcLogoutTokens.refresh_token)
          ) {
            const revokeAccessTokenExtras = extractExtras(extras, ':revoke_refresh_token');
            const revokeRefreshTokenPromise = performRevocationRequestAsync(fetch)(
              revocationEndpoint,
              refreshToken,
              TOKEN_TYPE.refresh_token,
              configuration.client_id,
              revokeAccessTokenExtras,
            );
            promises.push(revokeRefreshTokenPromise);
          }
          if (promises.length > 0) {
            // Revocation must be awaited *before* navigation, so a cancelled
            // navigation can never leave valid tokens behind both in storage
            // and on the authorization server.
            await Promise.all(promises);
          }
        }
      } catch (exception) {
        console.warn(
          'logoutAsync: error when revoking tokens, if the error persist, you ay configure property logout_tokens_to_invalidate from configuration to avoid this error',
        );
        console.warn(exception);
      }

      const oidcExtras = extractExtras(extras, ':oidc');
      const noReload = oidcExtras && oidcExtras['no_reload'] === 'true';

      if (noReload) {
        // No navigation happens here: this branch is essentially a "clear local
        // session" call dressed as a logout. We can drop state immediately and
        // reset the flag since the call returns normally to the caller.
        await clearSessionAsync(oidc, oidcDatabase)();
        oidc.isLoggingOut = false;
        return;
      }

      // Navigate to the end-session endpoint (or reload) *before* clearing the
      // local session. This closes the race where `OidcProvider` /
      // `OidcSecure` / silent-renew timers observe a null `tokens` and kick
      // off a new auth flow in the window between local clear and navigation.
      const endPointExtras = keepExtras(extras);
      if (oidcServerConfiguration.endSessionEndpoint) {
        const endSessionUrl = buildEndSessionUrl(
          oidcServerConfiguration.endSessionEndpoint,
          endPointExtras,
          idToken,
          postLogoutRedirectUri,
        );
        oicLocation.open(endSessionUrl);
      } else {
        oicLocation.reload();
      }

      // Now that navigation has been scheduled, drop the local session. By the
      // time React re-renders against the null tokens the page is already
      // unloading; if for any reason it is not (e.g. navigation cancelled by a
      // `beforeunload` handler) the `isLoggingOut` flag stays set so guards
      // still know not to start a fresh auth flow.
      await clearSessionAsync(oidc, oidcDatabase)();
    } catch (exception) {
      // If anything went wrong, reset the flag so the app is not stuck in a
      // "logging out forever" state.
      oidc.isLoggingOut = false;
      throw exception;
    }
  };

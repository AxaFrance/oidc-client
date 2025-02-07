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
  await oidc.ensureUniqueTabId();
  const serviceWorker = await initWorkerAsync(oidc.configuration, oidc.configurationName);
  if (!serviceWorker) {
    const session = initSession(oidc.configurationName, oidc.configuration.storage);
    await session.clearAsync(status);
  } else {
    await serviceWorker.clearAsync(status);
  }
  oidc.tokens = null;
  oidc.userInfo = null;
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
    const url = isUri ? callbackPathOrUrl : oicLocation.getOrigin() + path;
    // @ts-ignore
    const idToken = oidc.tokens ? oidc.tokens.idToken : '';
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
          await Promise.all(promises);
        }
      }
    } catch (exception) {
      console.warn(
        'logoutAsync: error when revoking tokens, if the error persist, you ay configure property logout_tokens_to_invalidate from configuration to avoid this error',
      );
      console.warn(exception);
    }
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

    const oidcExtras = extractExtras(extras, ':oidc');
    const noReload = oidcExtras && oidcExtras['no_reload'] === 'true';

    if (noReload) {
      return;
    }

    const endPointExtras = keepExtras(extras);

    if (oidcServerConfiguration.endSessionEndpoint) {
      if (!('id_token_hint' in endPointExtras)) {
        endPointExtras['id_token_hint'] = idToken;
      }
      if (!('post_logout_redirect_uri' in endPointExtras) && callbackPathOrUrl !== null) {
        endPointExtras['post_logout_redirect_uri'] = url;
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
      oicLocation.open(`${oidcServerConfiguration.endSessionEndpoint}${queryString}`);
    } else {
      oicLocation.reload();
    }
  };

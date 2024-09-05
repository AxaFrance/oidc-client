﻿import { eventNames } from './events';
import { initSession } from './initSession';
import { initWorkerAsync } from './initWorker';
import Oidc from './oidc';
import { setTokens } from './parseTokens';
import { autoRenewTokens } from './renewTokens';

export const tryKeepSessionAsync = async (oidc: Oidc) => {
  let serviceWorker;
  if (oidc.tokens != null) {
    return false;
  }
  oidc.publishEvent(eventNames.tryKeepExistingSessionAsync_begin, {});
  try {
    const configuration = oidc.configuration;
    const oidcServerConfiguration = await oidc.initAsync(
      configuration.authority,
      configuration.authority_configuration,
    );
    await oidc.ensureUniqueTabId();
    serviceWorker = await initWorkerAsync(configuration, oidc.configurationName);
    if (serviceWorker) {
      const { tokens } = await serviceWorker.initAsync(
        oidcServerConfiguration,
        'tryKeepExistingSessionAsync',
        configuration,
      );
      if (tokens) {
        serviceWorker.startKeepAliveServiceWorker();
        // @ts-ignore
        oidc.tokens = tokens;
        const getLoginParams = serviceWorker.getLoginParams(oidc.configurationName);
        // @ts-ignore
        oidc.timeoutId = autoRenewTokens(oidc, oidc.tokens.expiresAt, getLoginParams.extras);
        const sessionState = await serviceWorker.getSessionStateAsync();
        // @ts-ignore
        await oidc.startCheckSessionAsync(
          oidcServerConfiguration.check_session_iframe,
          configuration.client_id,
          sessionState,
        );
        if (configuration.preload_user_info) {
          await oidc.userInfoAsync();
        }
        oidc.publishEvent(eventNames.tryKeepExistingSessionAsync_end, {
          success: true,
          message: 'tokens inside ServiceWorker are valid',
        });
        return true;
      }
      oidc.publishEvent(eventNames.tryKeepExistingSessionAsync_end, {
        success: false,
        message: 'no exiting session found',
      });
    } else {
      if (configuration.service_worker_relative_url) {
        oidc.publishEvent(eventNames.service_worker_not_supported_by_browser, {
          message: 'service worker is not supported by this browser',
        });
      }
      const session = initSession(oidc.configurationName, configuration.storage ?? sessionStorage);
      const { tokens } = await session.initAsync();
      if (tokens) {
        // @ts-ignore
        oidc.tokens = setTokens(tokens, null, configuration.token_renew_mode);
        const getLoginParams = session.getLoginParams();
        // @ts-ignore
        oidc.timeoutId = autoRenewTokens(oidc, oidc.tokens.expiresAt, getLoginParams.extras);
        const sessionState = await session.getSessionStateAsync();
        // @ts-ignore
        await oidc.startCheckSessionAsync(
          oidcServerConfiguration.check_session_iframe,
          configuration.client_id,
          sessionState,
        );
        if (configuration.preload_user_info) {
          await oidc.userInfoAsync();
        }
        oidc.publishEvent(eventNames.tryKeepExistingSessionAsync_end, {
          success: true,
          message: 'tokens inside storage are valid',
        });
        return true;
      }
    }
    oidc.publishEvent(eventNames.tryKeepExistingSessionAsync_end, {
      success: false,
      message: serviceWorker
        ? 'service worker sessions not retrieved'
        : 'session storage sessions not retrieved',
    });
    return false;
  } catch (exception) {
    console.error(exception);
    if (serviceWorker) {
      await serviceWorker.clearAsync();
    }
    oidc.publishEvent(
      eventNames.tryKeepExistingSessionAsync_error,
      'tokens inside ServiceWorker are invalid',
    );
    return false;
  }
};

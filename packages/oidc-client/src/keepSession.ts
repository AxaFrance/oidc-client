import { eventNames } from './events';
import { initSession } from './initSession';
import { initWorkerAsync } from './initWorker';
import Oidc from './oidc';
import { isTokensValid, setTokens } from './parseTokens';
import { autoRenewTokens, renewTokensAndStartTimerAsync } from './renewTokens';
import timer from './timer';

const renewExpiredSessionAsync = async (oidc: Oidc, loginParams) => {
  if (isTokensValid(oidc.tokens)) return true;

  const tokens = await renewTokensAndStartTimerAsync(
    oidc,
    true,
    loginParams?.extras,
    loginParams?.scope,
  );
  if (isTokensValid(tokens)) return true;

  oidc.tokens = null;
  oidc.userInfo = null;
  oidc.publishEvent(eventNames.tryKeepExistingSessionAsync_end, {
    success: false,
    message: 'stored tokens could not be renewed',
  });
  return false;
};

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
        if (!(await renewExpiredSessionAsync(oidc, getLoginParams))) return false;
        // @ts-ignore
        oidc.timeoutId = autoRenewTokens(
          oidc,
          oidc.tokens.expiresAt,
          getLoginParams?.extras,
          getLoginParams?.scope,
        );
        const sessionState = await serviceWorker.getSessionStateAsync();
        // @ts-ignore
        await oidc.startCheckSessionAsync(
          oidcServerConfiguration.checkSessionIframe,
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
      const session = initSession(
        oidc.configurationName,
        configuration.storage ?? sessionStorage,
        configuration.login_state_storage ?? configuration.storage ?? sessionStorage,
      );
      const { tokens } = await session.initAsync();
      if (tokens) {
        // @ts-ignore
        oidc.tokens = setTokens(tokens, null, configuration.token_renew_mode);
        const getLoginParams = session.getLoginParams();
        if (!(await renewExpiredSessionAsync(oidc, getLoginParams))) return false;
        // @ts-ignore
        oidc.timeoutId = autoRenewTokens(
          oidc,
          oidc.tokens.expiresAt,
          getLoginParams?.extras,
          getLoginParams?.scope,
        );
        const sessionState = await session.getSessionStateAsync();
        // @ts-ignore
        await oidc.startCheckSessionAsync(
          oidcServerConfiguration.checkSessionIframe,
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
    oidc.tokens = null;
    oidc.userInfo = null;
    timer.clearTimeout(oidc.timeoutId);
    oidc.timeoutId = null;
    oidc.checkSessionIFrame?.stop();
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

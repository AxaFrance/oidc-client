import { eventNames } from './events';
import { fetchWithTokens } from './fetch';
import Oidc from './oidc';
import {
  createNetworkError,
  isNetworkErrorCause,
  isOidcError,
  isRetryableHttpStatus,
  OidcError,
  OidcErrorCode,
} from './oidcError';

export const userInfoAsync =
  (oidc: Oidc) =>
  async (noCache = false, demonstrating_proof_of_possession = false) => {
    try {
      if (oidc.userInfo != null && !noCache) {
        return oidc.userInfo;
      }
      // Check storage cache
      const stored =
        !noCache && oidc.configuration.storage?.getItem(`oidc.${oidc.configurationName}.userInfo`);
      if (stored) {
        oidc.userInfo = JSON.parse(stored);
        return oidc.userInfo;
      }
      const configuration = oidc.configuration;
      const oidcServerConfiguration = await oidc.initAsync(
        configuration.authority,
        configuration.authority_configuration,
      );
      const url = oidcServerConfiguration.userInfoEndpoint;
      const fetchUserInfo = async () => {
        const oidcFetch = fetchWithTokens(
          fetch,
          oidc,
          demonstrating_proof_of_possession,
          'userinfo',
        );
        const response = await oidcFetch(url);
        if (response.status !== 200) {
          const isDpopNonceRequired =
            response.headers?.has('DPoP-Nonce') &&
            (response.status === 400 ||
              response.status === 401 ||
              response.headers.get('WWW-Authenticate')?.includes('use_dpop_nonce'));
          const error = new OidcError(
            isDpopNonceRequired ? OidcErrorCode.DPOP_NONCE_REQUIRED : OidcErrorCode.REQUEST_FAILED,
            'UserInfo request failed',
            {
              phase: 'userinfo',
              retryable: isDpopNonceRequired || isRetryableHttpStatus(response.status),
              status: response.status,
              oauthError: isDpopNonceRequired ? 'use_dpop_nonce' : undefined,
            },
          );
          oidc.publishEvent(eventNames.userInfoAsync_error, error);
          return null;
        }
        return response.json();
      };
      const userInfo = await fetchUserInfo();
      oidc.userInfo = userInfo;
      // Store in cache
      if (userInfo) {
        oidc.configuration.storage?.setItem(
          `oidc.${oidc.configurationName}.userInfo`,
          JSON.stringify(userInfo),
        );
      }
      return userInfo;
    } catch (cause) {
      const error = isOidcError(cause)
        ? cause
        : isNetworkErrorCause(cause)
          ? createNetworkError(cause, 'userinfo')
          : cause;
      oidc.publishEvent(eventNames.userInfoAsync_error, error);
      throw error;
    }
  };

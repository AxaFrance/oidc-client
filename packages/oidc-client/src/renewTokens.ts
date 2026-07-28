import { eventNames } from './events';
import { initSession } from './initSession.js';
import { initWorkerAsync, sleepAsync } from './initWorker.js';
import Oidc from './oidc.js';
import {
  createNetworkError,
  isNetworkErrorCause,
  isOidcError,
  isRetryableHttpStatus,
  OidcError,
  OidcErrorCode,
} from './oidcError.js';
import { computeTimeLeft, isTokensOidcValid, setTokens, Tokens } from './parseTokens.js';
import { performTokenRequestAsync } from './requests';
import { _silentLoginAsync } from './silentLogin';
import timer from './timer.js';
import { OidcConfiguration, StringMap, TokenAutomaticRenewMode } from './types.js';

export type RenewTokensResult = {
  tokens: Tokens | null;
  status: string | null;
  error?: OidcError;
};

const createRefreshTokenError = (
  message: string,
  response?: {
    status?: number;
    oauthError?: string;
    oauthErrorDescription?: string;
  },
): OidcError => {
  const code =
    response?.oauthError === 'use_dpop_nonce'
      ? OidcErrorCode.DPOP_NONCE_REQUIRED
      : OidcErrorCode.TOKEN_REQUEST_FAILED;
  return new OidcError(code, message, {
    phase: 'refresh',
    retryable:
      code === OidcErrorCode.DPOP_NONCE_REQUIRED || isRetryableHttpStatus(response?.status),
    status: response?.status,
    oauthError: response?.oauthError,
    oauthErrorDescription: response?.oauthErrorDescription,
  });
};

async function syncTokens(
  oidc: Oidc,
  forceRefresh: boolean,
  extras: StringMap,
  scope: string = null,
) {
  const updateTokens = tokens => {
    oidc.tokens = tokens;
  };
  const result = await synchroniseTokensAsync(oidc)(
    updateTokens,
    0,
    0,
    forceRefresh,
    extras,
    scope,
  );
  const { tokens, status } = result;

  const serviceWorker = await initWorkerAsync(oidc.configuration, oidc.configurationName);
  if (!serviceWorker) {
    const session = initSession(
      oidc.configurationName,
      oidc.configuration.storage,
      oidc.configuration.login_state_storage ?? oidc.configuration.storage,
    );
    session.setTokens(oidc.tokens);
  }

  if (!oidc.tokens) {
    await oidc.destroyAsync(status);
    return { ...result, tokens: null } as RenewTokensResult;
  }
  return { ...result, tokens } as RenewTokensResult;
}

export async function renewTokensAndStartTimerResultAsync(
  oidc,
  forceRefresh = false,
  extras: StringMap = null,
  scope: string = null,
) {
  const configuration = oidc.configuration;
  const lockResourcesName = `${configuration.client_id}_${oidc.configurationName}_${configuration.authority}`;

  let result: RenewTokensResult;
  const serviceWorker = await initWorkerAsync(oidc.configuration, oidc.configurationName);
  if ((configuration?.storage === window?.sessionStorage && !serviceWorker) || !navigator.locks) {
    result = await syncTokens(oidc, forceRefresh, extras, scope);
  } else {
    let lockResult: any = 'retry';
    while (lockResult === 'retry') {
      lockResult = await navigator.locks.request(
        lockResourcesName,
        { ifAvailable: true },
        async lock => {
          if (!lock) {
            oidc.publishEvent(Oidc.eventNames.syncTokensAsync_lock_not_available, {
              lock: 'lock not available',
            });
            return 'retry';
          }
          return await syncTokens(oidc, forceRefresh, extras, scope);
        },
      );
    }
    result = lockResult;
  }

  if (!result.tokens) {
    return result;
  }

  if (oidc.timeoutId) {
    // @ts-ignore
    oidc.timeoutId = autoRenewTokens(oidc, oidc.tokens.expiresAt, extras, scope);
  }

  return { ...result, tokens: oidc.tokens };
}

export async function renewTokensAndStartTimerAsync(
  oidc,
  forceRefresh = false,
  extras: StringMap = null,
  scope: string = null,
) {
  const result = await renewTokensAndStartTimerResultAsync(oidc, forceRefresh, extras, scope);
  return result.tokens;
}

export const autoRenewTokens = (
  oidc: Oidc,
  expiresAt,
  extras: StringMap = null,
  scope: string = null,
) => {
  const refreshTimeBeforeTokensExpirationInSecond =
    oidc.configuration.refresh_time_before_tokens_expiration_in_second;
  if (oidc.timeoutId) {
    timer.clearTimeout(oidc.timeoutId);
  }
  return timer.setTimeout(async () => {
    const timeLeft = computeTimeLeft(refreshTimeBeforeTokensExpirationInSecond, expiresAt);
    const timeInfo = { timeLeft };
    oidc.publishEvent(Oidc.eventNames.token_timer, timeInfo);
    await renewTokensAndStartTimerAsync(oidc, false, extras, scope);
  }, 1000);
};

export const synchroniseTokensStatus = {
  FORCE_REFRESH: 'FORCE_REFRESH',
  SESSION_LOST: 'SESSION_LOST',
  NOT_CONNECTED: 'NOT_CONNECTED',
  TOKENS_VALID: 'TOKENS_VALID',
  TOKEN_UPDATED_BY_ANOTHER_TAB_TOKENS_VALID: 'TOKEN_UPDATED_BY_ANOTHER_TAB_TOKENS_VALID',
  TOKEN_UPDATED_BY_ANOTHER_TAB_TOKENS_INVALID: 'TOKEN_UPDATED_BY_ANOTHER_TAB_TOKENS_INVALID',
  LOGOUT_FROM_ANOTHER_TAB: 'LOGOUT_FROM_ANOTHER_TAB',
  REQUIRE_SYNC_TOKENS: 'REQUIRE_SYNC_TOKENS',
  TOKENS_INVALID: 'TOKENS_INVALID',
};

export const syncTokensInfoAsync =
  (oidc: Oidc) =>
  async (
    configuration: OidcConfiguration,
    configurationName: string,
    currentTokens: Tokens,
    forceRefresh = false,
  ) => {
    // Service Worker can be killed by the browser (when it wants,for example after 10 seconds of inactivity, so we retreieve the session if it happen)
    // const configuration = this.configuration;
    const nullNonce = { nonce: null };
    if (!currentTokens) {
      return { tokens: null, status: synchroniseTokensStatus.NOT_CONNECTED, nonce: nullNonce };
    }
    let nonce;
    const oidcServerConfiguration = await oidc.initAsync(
      configuration.authority,
      configuration.authority_configuration,
    );
    const serviceWorker = await initWorkerAsync(configuration, configurationName);
    if (serviceWorker) {
      const { status, tokens } = await serviceWorker.initAsync(
        oidcServerConfiguration,
        'syncTokensAsync',
        configuration,
      );
      if (status === 'LOGGED_OUT') {
        return {
          tokens: null,
          status: synchroniseTokensStatus.LOGOUT_FROM_ANOTHER_TAB,
          nonce: nullNonce,
        };
      } else if (status === 'SESSIONS_LOST') {
        return { tokens: null, status: synchroniseTokensStatus.SESSION_LOST, nonce: nullNonce };
      } else if (!status || !tokens) {
        return {
          tokens: null,
          status: synchroniseTokensStatus.REQUIRE_SYNC_TOKENS,
          nonce: nullNonce,
        };
      } else if (tokens.issuedAt !== currentTokens.issuedAt) {
        const timeLeft = computeTimeLeft(
          configuration.refresh_time_before_tokens_expiration_in_second,
          tokens.expiresAt,
        );
        const status =
          timeLeft > 0
            ? synchroniseTokensStatus.TOKEN_UPDATED_BY_ANOTHER_TAB_TOKENS_VALID
            : synchroniseTokensStatus.TOKEN_UPDATED_BY_ANOTHER_TAB_TOKENS_INVALID;
        const nonce = await serviceWorker.getNonceAsync();
        return { tokens, status, nonce };
      }
      nonce = await serviceWorker.getNonceAsync();
    } else {
      const session = initSession(
        configurationName,
        configuration.storage ?? sessionStorage,
        configuration.login_state_storage ?? configuration.storage ?? sessionStorage,
      );
      const initAsyncResponse = await session.initAsync();
      let { tokens } = initAsyncResponse;
      const { status } = initAsyncResponse;
      if (tokens) {
        tokens = setTokens(tokens, oidc.tokens, configuration.token_renew_mode);
      }
      if (!tokens) {
        return {
          tokens: null,
          status: synchroniseTokensStatus.LOGOUT_FROM_ANOTHER_TAB,
          nonce: nullNonce,
        };
      } else if (status === 'SESSIONS_LOST') {
        return { tokens: null, status: synchroniseTokensStatus.SESSION_LOST, nonce: nullNonce };
      } else if (tokens.issuedAt !== currentTokens.issuedAt) {
        const timeLeft = computeTimeLeft(
          configuration.refresh_time_before_tokens_expiration_in_second,
          tokens.expiresAt,
        );
        const status =
          timeLeft > 0
            ? synchroniseTokensStatus.TOKEN_UPDATED_BY_ANOTHER_TAB_TOKENS_VALID
            : synchroniseTokensStatus.TOKEN_UPDATED_BY_ANOTHER_TAB_TOKENS_INVALID;
        const nonce = await session.getNonceAsync();
        return { tokens, status, nonce };
      }
      nonce = await session.getNonceAsync();
    }

    const timeLeft = computeTimeLeft(
      configuration.refresh_time_before_tokens_expiration_in_second,
      currentTokens.expiresAt,
    );
    const status = timeLeft > 0 ? 'TOKENS_VALID' : 'TOKENS_INVALID';
    if (forceRefresh) {
      return { tokens: currentTokens, status: 'FORCE_REFRESH', nonce };
    }
    return { tokens: currentTokens, status, nonce };
  };

const synchroniseTokensAsync =
  (oidc: Oidc) =>
  async (
    updateTokens,
    tryNumber = 0,
    backgroundTry = 0,
    forceRefresh = false,
    extras: StringMap = null,
    scope: string = null,
    lastError: OidcError = null,
  ) => {
    if (!navigator.onLine && document.hidden) {
      return { tokens: oidc.tokens, status: 'GIVE_UP' };
    }
    let numberTryOnline = 6;
    const maxTries = forceRefresh ? 2 : 5;
    const maxBackgroundTries = 5;

    while (!navigator.onLine && numberTryOnline > 0) {
      await sleepAsync({ milliseconds: 1000 });
      numberTryOnline--;
      oidc.publishEvent(eventNames.refreshTokensAsync, {
        message: `wait because navigator is offline try ${numberTryOnline}`,
      });
    }
    const isDocumentHidden = document.hidden;
    const nextTry = isDocumentHidden ? tryNumber : tryNumber + 1;
    const nextBackgroundTry = isDocumentHidden ? backgroundTry + 1 : backgroundTry;

    if (tryNumber >= maxTries || backgroundTry >= maxBackgroundTries) {
      updateTokens(null);
      const error = lastError ?? createRefreshTokenError('refresh token');
      oidc.publishEvent(eventNames.refreshTokensAsync_error, {
        message: 'refresh token',
        error,
      });
      return { tokens: null, status: 'SESSION_LOST', error };
    }

    if (!extras) {
      extras = {};
    }
    const configuration = oidc.configuration;

    const silentLoginAsync = (extras: StringMap, state: string = null, scope: string = null) => {
      return _silentLoginAsync(
        oidc.configurationName,
        oidc.configuration,
        oidc.publishEvent.bind(oidc),
        'refresh',
      )(extras, state, scope);
    };
    const localSilentLoginAsync = async () => {
      try {
        let loginParams;
        const serviceWorker = await initWorkerAsync(configuration, oidc.configurationName);
        if (serviceWorker) {
          loginParams = serviceWorker.getLoginParams();
        } else {
          const session = initSession(
            oidc.configurationName,
            configuration.storage,
            configuration.login_state_storage ?? configuration.storage,
          );
          loginParams = session.getLoginParams();
        }
        const silentLoginInput = {};

        if (loginParams && loginParams.extras) {
          for (const [key, value] of Object.entries(loginParams.extras)) {
            if (value != null) {
              silentLoginInput[key] = value;
            }
          }
        }
        if (extras) {
          for (const [key, value] of Object.entries(extras)) {
            if (value != null) {
              silentLoginInput[key] = value;
            }
          }
        }
        silentLoginInput['prompt'] = 'none';
        if (scope) {
          silentLoginInput['scope'] = scope;
        }

        const silent_token_response = await silentLoginAsync(silentLoginInput);
        if (!silent_token_response) {
          updateTokens(null);
          const error = createRefreshTokenError('refresh token silent not active');
          oidc.publishEvent(eventNames.refreshTokensAsync_error, {
            message: 'refresh token silent not active',
            error,
          });
          return { tokens: null, status: 'SESSION_LOST', error };
        }
        if (silent_token_response.error) {
          updateTokens(null);
          const error =
            silent_token_response.oidcError ??
            new OidcError(OidcErrorCode.OAUTH_ERROR, 'refresh token silent', {
              phase: 'refresh',
              retryable: false,
              oauthError: silent_token_response.error,
            });
          oidc.publishEvent(eventNames.refreshTokensAsync_error, {
            message: 'refresh token silent',
            error,
          });
          return { tokens: null, status: 'SESSION_LOST', error };
        }

        updateTokens(silent_token_response.tokens);
        oidc.publishEvent(Oidc.eventNames.token_renewed, {});
        return { tokens: silent_token_response.tokens, status: 'LOGGED' };
      } catch (exceptionSilent: any) {
        const error =
          isOidcError(exceptionSilent) || !isNetworkErrorCause(exceptionSilent)
            ? exceptionSilent
            : createNetworkError(exceptionSilent, 'refresh');
        console.error(error);
        oidc.publishEvent(eventNames.refreshTokensAsync_silent_error, {
          message: 'exceptionSilent',
          exception: error.message,
          error: isOidcError(error) ? error : undefined,
        });
        return await synchroniseTokensAsync(oidc)(
          updateTokens,
          nextTry,
          nextBackgroundTry,
          forceRefresh,
          extras,
          scope,
          isOidcError(error) ? error : lastError,
        );
      }
    };

    try {
      const { status, tokens, nonce } = await syncTokensInfoAsync(oidc)(
        configuration,
        oidc.configurationName,
        oidc.tokens,
        forceRefresh,
      );

      switch (status) {
        case synchroniseTokensStatus.SESSION_LOST:
          updateTokens(null);
          {
            const error = lastError ?? createRefreshTokenError('refresh token session lost');
            oidc.publishEvent(eventNames.refreshTokensAsync_error, {
              message: 'refresh token session lost',
              error,
            });
            return { tokens: null, status: 'SESSION_LOST', error };
          }
        case synchroniseTokensStatus.NOT_CONNECTED:
          updateTokens(null);
          return { tokens: null, status: null };
        case synchroniseTokensStatus.TOKENS_VALID:
          updateTokens(tokens);
          return { tokens, status: 'LOGGED_IN' };
        case synchroniseTokensStatus.TOKEN_UPDATED_BY_ANOTHER_TAB_TOKENS_VALID:
          updateTokens(tokens);
          oidc.publishEvent(Oidc.eventNames.token_renewed, {
            reason: 'TOKEN_UPDATED_BY_ANOTHER_TAB_TOKENS_VALID',
          });
          return { tokens, status: 'LOGGED_IN' };
        case synchroniseTokensStatus.LOGOUT_FROM_ANOTHER_TAB:
          updateTokens(null);
          oidc.publishEvent(eventNames.logout_from_another_tab, {
            status: 'session syncTokensAsync',
          });
          return { tokens: null, status: 'LOGGED_OUT' };
        case synchroniseTokensStatus.REQUIRE_SYNC_TOKENS:
          if (
            configuration.token_automatic_renew_mode ==
              TokenAutomaticRenewMode.AutomaticOnlyWhenFetchExecuted &&
            !forceRefresh
          ) {
            oidc.publishEvent(eventNames.tokensInvalidAndWaitingActionsToRefresh, {});
            return { tokens: oidc.tokens, status: 'GIVE_UP' };
          }

          oidc.publishEvent(eventNames.refreshTokensAsync_begin, { tryNumber: tryNumber });
          return await localSilentLoginAsync();
        default: {
          if (
            configuration.token_automatic_renew_mode ==
              TokenAutomaticRenewMode.AutomaticOnlyWhenFetchExecuted &&
            synchroniseTokensStatus.FORCE_REFRESH !== status
          ) {
            oidc.publishEvent(eventNames.tokensInvalidAndWaitingActionsToRefresh, {});
            return { tokens: oidc.tokens, status: 'GIVE_UP' };
          }

          oidc.publishEvent(eventNames.refreshTokensAsync_begin, {
            refreshToken: tokens.refreshToken,
            status,
            tryNumber: tryNumber,
            backgroundTry: backgroundTry,
          });

          if (!tokens.refreshToken) {
            return await localSilentLoginAsync();
          }

          const clientId = configuration.client_id;
          const redirectUri = configuration.redirect_uri;
          const authority = configuration.authority;
          const tokenExtras = configuration.token_request_extras
            ? configuration.token_request_extras
            : {};
          const finalExtras = { ...tokenExtras };

          for (const [key, value] of Object.entries(extras)) {
            if (key.endsWith(':token_request')) {
              finalExtras[key.replace(':token_request', '')] = value;
            }
          }
          const localFunctionAsync = async () => {
            const details = {
              client_id: clientId,
              redirect_uri: redirectUri,
              grant_type: 'refresh_token',
              refresh_token: tokens.refreshToken,
            };
            const oidcServerConfiguration = await oidc.initAsync(
              authority,
              configuration.authority_configuration,
            );
            const timeoutMs = document.hidden ? 10000 : 30000 * 10;
            const url = oidcServerConfiguration.tokenEndpoint;
            const headersExtras = {};
            if (configuration.demonstrating_proof_of_possession) {
              headersExtras['DPoP'] = await oidc.generateDemonstrationOfProofOfPossessionAsync(
                tokens.accessToken,
                url,
                'POST',
              );
            }
            let tokenResponse = await performTokenRequestAsync(oidc.getFetch())(
              url,
              details,
              finalExtras,
              tokens,
              headersExtras,
              configuration.token_renew_mode,
              timeoutMs,
            );

            if (
              !tokenResponse.success &&
              tokenResponse.oauthError === 'use_dpop_nonce' &&
              tokenResponse.demonstratingProofOfPossessionNonce &&
              configuration.demonstrating_proof_of_possession
            ) {
              const serviceWorker = await initWorkerAsync(configuration, oidc.configurationName);
              if (serviceWorker) {
                await serviceWorker.setDemonstratingProofOfPossessionNonce(
                  tokenResponse.demonstratingProofOfPossessionNonce,
                );
              } else {
                const session = initSession(
                  oidc.configurationName,
                  configuration.storage,
                  configuration.login_state_storage ?? configuration.storage,
                );
                await session.setDemonstratingProofOfPossessionNonce(
                  tokenResponse.demonstratingProofOfPossessionNonce,
                );
              }
              headersExtras['DPoP'] = await oidc.generateDemonstrationOfProofOfPossessionAsync(
                tokens.accessToken,
                url,
                'POST',
              );
              tokenResponse = await performTokenRequestAsync(oidc.getFetch())(
                url,
                details,
                finalExtras,
                tokens,
                headersExtras,
                configuration.token_renew_mode,
                timeoutMs,
              );
            }

            if (tokenResponse.success) {
              // Guard against a missing/corrupted nonce reaching id_token validation.
              // Without this guard, accessing `nonce.nonce` would throw a TypeError
              // when the underlying storage has been cleared (private mode, manual
              // clearing, browser eviction). We prefer a defined SESSION_LOST result
              // so silent renew stays non-throwing for consumers.
              // See https://github.com/AxaFrance/oidc-client/issues/1678
              if (!nonce || !nonce.nonce) {
                updateTokens(null);
                const error = new OidcError(
                  OidcErrorCode.NONCE_MISSING,
                  'refresh token: nonce missing from storage',
                  {
                    phase: 'refresh',
                    retryable: false,
                  },
                );
                oidc.publishEvent(eventNames.refreshTokensAsync_error, {
                  message: 'refresh token: nonce missing from storage',
                  error,
                });
                return { tokens: null, status: 'SESSION_LOST', error };
              }
              const { isValid, reason } = isTokensOidcValid(
                tokenResponse.data,
                nonce.nonce,
                oidcServerConfiguration,
              );
              if (!isValid) {
                updateTokens(null);
                const error = new OidcError(
                  reason.startsWith('Nonce does not match')
                    ? OidcErrorCode.INVALID_NONCE
                    : OidcErrorCode.TOKEN_REQUEST_FAILED,
                  `refresh token return not valid tokens, reason: ${reason}`,
                  {
                    phase: 'refresh',
                    retryable: false,
                  },
                );
                oidc.publishEvent(eventNames.refreshTokensAsync_error, {
                  message: `refresh token return not valid tokens, reason: ${reason}`,
                  error,
                });
                return { tokens: null, status: 'SESSION_LOST', error };
              }
              updateTokens(tokenResponse.data);
              if (tokenResponse.demonstratingProofOfPossessionNonce) {
                const serviceWorker = await initWorkerAsync(configuration, oidc.configurationName);
                if (serviceWorker) {
                  await serviceWorker.setDemonstratingProofOfPossessionNonce(
                    tokenResponse.demonstratingProofOfPossessionNonce,
                  );
                } else {
                  const session = initSession(
                    oidc.configurationName,
                    configuration.storage,
                    configuration.login_state_storage ?? configuration.storage,
                  );
                  await session.setDemonstratingProofOfPossessionNonce(
                    tokenResponse.demonstratingProofOfPossessionNonce,
                  );
                }
              }
              oidc.publishEvent(eventNames.refreshTokensAsync_end, {
                success: tokenResponse.success,
              });
              oidc.publishEvent(Oidc.eventNames.token_renewed, { reason: 'REFRESH_TOKEN' });
              return { tokens: tokenResponse.data, status: 'LOGGED_IN' };
            } else {
              const error = createRefreshTokenError('Token request failed', tokenResponse);
              oidc.publishEvent(eventNames.refreshTokensAsync_silent_error, {
                message: 'bad request',
                tokenResponse,
                error,
              });

              if (tokenResponse.status >= 400 && tokenResponse.status < 500) {
                updateTokens(null);
                oidc.publishEvent(eventNames.refreshTokensAsync_error, {
                  message: `session lost: ${tokenResponse.status}`,
                  error,
                });
                return { tokens: null, status: 'SESSION_LOST', error };
              }

              return await synchroniseTokensAsync(oidc)(
                updateTokens,
                nextTry,
                nextBackgroundTry,
                forceRefresh,
                extras,
                scope,
                error,
              );
            }
          };
          return await localFunctionAsync();
        }
      }
    } catch (exception: any) {
      const error =
        isOidcError(exception) || !isNetworkErrorCause(exception)
          ? exception
          : createNetworkError(exception, 'refresh');
      console.error(error);

      oidc.publishEvent(eventNames.refreshTokensAsync_silent_error, {
        message: 'exception',
        exception: error.message,
        error: isOidcError(error) ? error : undefined,
      });
      // we need to break the loop or errors, as direct call of synchroniseTokensAsync
      // inside of synchroniseTokensAsync will cause an infinite loop and kill the browser stack
      // so we need to brake calls chain and delay next call
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          synchroniseTokensAsync(oidc)(
            updateTokens,
            nextTry,
            nextBackgroundTry,
            forceRefresh,
            extras,
            scope,
            isOidcError(error) ? error : lastError,
          )
            .then(resolve)
            .catch(reject);
        }, 1000);
      });
    }
  };

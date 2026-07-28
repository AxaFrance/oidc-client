import { eventNames } from './events';
import Oidc from './oidc';
import { createNetworkError, OidcError, OidcErrorCode, OidcErrorPhase } from './oidcError';
import { getValidTokenAsync, OidcToken } from './parseTokens';
import { syncTokensInfoAsync } from './renewTokens';
import { Fetch } from './types';

// @ts-ignore
export const fetchWithTokens =
  (
    fetch: Fetch,
    oidc: Oidc | null,
    demonstrating_proof_of_possession: boolean = false,
    phase: OidcErrorPhase = 'api_request',
  ): Fetch =>
  async (...params: Parameters<Fetch>): Promise<Response> => {
    const [url, options, ...rest] = params;
    const optionTmp = options ? { ...options } : { method: 'GET' };
    let headers = new Headers();
    if (optionTmp.headers) {
      headers = !(optionTmp.headers instanceof Headers)
        ? new Headers(optionTmp.headers)
        : optionTmp.headers;
    }
    const oidcToken: OidcToken = {
      getTokens: () => oidc.tokens,
      configuration: {
        token_automatic_renew_mode: oidc.configuration.token_automatic_renew_mode,
        refresh_time_before_tokens_expiration_in_second:
          oidc.configuration.refresh_time_before_tokens_expiration_in_second,
      },

      syncTokensInfoAsync: async () => {
        const { status } = await syncTokensInfoAsync(oidc)(
          oidc.configuration,
          oidc.configurationName,
          oidc.tokens,
          false,
        );
        return status;
      },
      renewTokensAsync: oidc.renewTokensAsync.bind(oidc),
    };

    // @ts-ignore
    const getValidToken = await getValidTokenAsync(oidcToken);
    const accessToken = getValidToken?.tokens?.accessToken;
    if (!headers.has('Accept')) {
      headers.set('Accept', 'application/json');
    }
    if (accessToken) {
      if (
        oidc.configuration.demonstrating_proof_of_possession &&
        demonstrating_proof_of_possession
      ) {
        const demonstrationOdProofOfPossession =
          await oidc.generateDemonstrationOfProofOfPossessionAsync(
            accessToken,
            url.toString(),
            optionTmp.method,
          );
        headers.set('Authorization', `DPoP ${accessToken}`);
        headers.set('DPoP', demonstrationOdProofOfPossession);
      } else {
        headers.set('Authorization', `Bearer ${accessToken}`);
      }
      if (!optionTmp.credentials) {
        optionTmp.credentials = 'same-origin';
      }
    }
    const newOptions = { ...optionTmp, headers };
    let response: Response;
    try {
      response = await fetch(url, newOptions, ...rest);
    } catch (cause) {
      const error = createNetworkError(cause, phase);
      if (phase === 'api_request') {
        oidc.publishEvent(eventNames.apiRequest_error, error);
      }
      throw error;
    }

    if (
      !response.ok &&
      response.headers?.has('DPoP-Nonce') &&
      (response.status === 400 ||
        response.status === 401 ||
        response.headers.get('WWW-Authenticate')?.includes('use_dpop_nonce'))
    ) {
      const error = new OidcError(OidcErrorCode.DPOP_NONCE_REQUIRED, 'DPoP nonce required', {
        phase,
        retryable: true,
        status: response.status,
        oauthError: 'use_dpop_nonce',
      });
      if (phase === 'api_request') {
        oidc.publishEvent(eventNames.apiRequest_error, error);
      }
    }

    return response;
  };

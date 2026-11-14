import { eventNames } from './events';
import Oidc from './oidc';
import { createNetworkError, OidcError, OidcErrorCode, OidcErrorPhase } from './oidcError';
import { getValidTokenAsync, OidcToken } from './parseTokens';
import {
  getResourceConfiguration,
  isResourceOriginManaged,
  isResourceUrlAllowed,
} from './protocol';
import { syncTokensInfoAsync } from './renewTokens';
import { Fetch, ResourceFetchOptions } from './types';

// @ts-ignore
export const fetchWithTokens =
  (
    fetch: Fetch,
    oidc: Oidc,
    demonstrating_proof_of_possession: boolean = false,
    selection: OidcErrorPhase | ResourceFetchOptions = 'api_request',
  ): Fetch =>
  async (...params: Parameters<Fetch>): Promise<Response> => {
    const [url, options, ...rest] = params;
    const phase = typeof selection === 'string' ? selection : 'api_request';
    const resource = typeof selection === 'string' ? undefined : selection.resource;
    let destination: string | undefined;
    if (resource === undefined && phase === 'api_request' && oidc.configuration.resources?.length) {
      try {
        const candidate = new URL(
          url instanceof Request ? url.url : url.toString(),
          window.location.href,
        ).toString();
        if (isResourceOriginManaged(oidc.configuration.resources, candidate)) {
          throw new Error('Select a resource explicitly when fetching a resource-managed API.');
        }
      } catch (cause) {
        const error = new OidcError(
          OidcErrorCode.INVALID_RESOURCE,
          cause instanceof Error ? cause.message : 'Invalid resource destination.',
          { phase, retryable: false, cause },
        );
        oidc.publishEvent(eventNames.apiRequest_error, error);
        throw error;
      }
    }
    if (
      typeof selection !== 'string' &&
      Object.prototype.hasOwnProperty.call(selection, 'resource')
    ) {
      try {
        if (typeof resource !== 'string')
          throw new Error('An explicit resource identifier is required.');
        destination = new URL(
          url instanceof Request ? url.url : url.toString(),
          window.location.href,
        ).toString();
        if (
          !isResourceUrlAllowed(
            getResourceConfiguration(oidc.configuration.resources, resource),
            destination,
          )
        ) {
          throw new Error('The destination does not belong to the selected resource.');
        }
        if (options?.redirect === 'follow')
          throw new Error('Resource fetch cannot automatically follow redirects.');
      } catch (cause) {
        const error = new OidcError(
          OidcErrorCode.INVALID_RESOURCE,
          cause instanceof Error ? cause.message : 'Invalid resource destination.',
          { phase, retryable: false, cause },
        );
        oidc.publishEvent(eventNames.apiRequest_error, error);
        throw error;
      }
    }
    const optionTmp: RequestInit =
      resource !== undefined
        ? {
            ...(url instanceof Request
              ? { method: url.method, headers: url.headers, credentials: url.credentials }
              : { method: 'GET' }),
            ...options,
            redirect: options?.redirect ?? 'error',
          }
        : options
          ? { ...options }
          : { method: 'GET' };
    let headers = new Headers();
    if (optionTmp.headers) {
      headers =
        resource !== undefined
          ? new Headers(optionTmp.headers)
          : !(optionTmp.headers instanceof Headers)
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
    const resourceToken =
      resource === undefined ? undefined : await oidc.resourceTokens.getAccessTokenAsync(resource);
    const getValidToken = resource === undefined ? await getValidTokenAsync(oidcToken) : undefined;
    const accessToken = resourceToken?.accessToken ?? getValidToken?.tokens?.accessToken;
    if (!headers.has('Accept')) {
      headers.set('Accept', 'application/json');
    }
    if (accessToken) {
      if (
        (oidc.configuration.demonstrating_proof_of_possession &&
          demonstrating_proof_of_possession) ||
        resourceToken?.tokenType?.toLowerCase() === 'dpop'
      ) {
        const demonstrationOdProofOfPossession =
          resource === undefined
            ? await oidc.generateDemonstrationOfProofOfPossessionAsync(
                accessToken,
                url.toString(),
                optionTmp.method,
              )
            : await oidc.resourceTokens.generateProofAsync(resource, {
                accessToken,
                url: destination,
                method: optionTmp.method ?? 'GET',
              });
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
    const recordApiNonce =
      resourceToken && headers.has('DPoP')
        ? oidc.resourceTokens.createApiNonceRecorder(resource)
        : undefined;
    if (
      resourceToken &&
      oidc.resourceTokens.peek(resource)?.accessToken !== resourceToken.accessToken
    ) {
      const error = new OidcError(
        OidcErrorCode.RESOURCE_TOKEN_UNAVAILABLE,
        'The selected resource token was cleared or changed before dispatch.',
        { phase, retryable: false },
      );
      oidc.publishEvent(eventNames.apiRequest_error, error);
      throw error;
    }
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

    const apiNonce = response.headers?.get('DPoP-Nonce');
    if (recordApiNonce && apiNonce) await recordApiNonce(apiNonce);

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

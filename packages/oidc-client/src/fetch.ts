import Oidc from './oidc';
import {getValidTokenAsync, OidcToken, Tokens} from './parseTokens';
import {Fetch, StringMap, TokenAutomaticRenewMode} from './types';

// @ts-ignore
export const fetchWithTokens =
  (
    fetch: Fetch,
    oidc: Oidc | null,
    demonstrating_proof_of_possession: boolean = false,
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
    
    const oidcToken : OidcToken = {
      tokens: oidc.tokens,
      configuration: { token_automatic_renew_mode: oidc.configuration.token_automatic_renew_mode },
      renewTokensAsync: oidc.renewTokensAsync.bind(oidc),
    }

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
        headers.set('Authorization', `PoP ${accessToken}`);
        headers.set('DPoP', demonstrationOdProofOfPossession);
      } else {
        headers.set('Authorization', `Bearer ${accessToken}`);
      }
      if (!optionTmp.credentials) {
        optionTmp.credentials = 'same-origin';
      }
    }
    const newOptions = { ...optionTmp, headers };
    return await fetch(url, newOptions, ...rest);
  };

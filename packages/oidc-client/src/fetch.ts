import { Fetch } from './types';
import { OidcClient } from './oidcClient';
import { getValidTokenAsync } from './parseTokens';

// @ts-ignore
export const fetchWithTokens =
	(
		fetch: Fetch,
		oidcClient: Oidc | null,
		demonstrating_proof_of_possession: boolean = false
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
		const oidc = oidcClient;

		// @ts-ignore
		const getValidToken = await getValidTokenAsync(oidc);
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
						optionTmp.method
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

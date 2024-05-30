import { describe, expect, it } from 'vitest';

import { replaceCodeVerifier, extractConfigurationNameFromCodeVerifier } from '../codeVerifier';

describe('replaceCodeVerifier should', () => {
	it.each([
		{
			body: 'code=F5CDCDB9AADB9ADA59560DE80CAAA6688BC5C8BA1CC1C1F9839F7E7B32171B3D-1&grant_type=authorization_code&client_id=interactive.public.short&redirect_uri=http%3A%2F%2Flocalhost%3A4200%2Fauthentication%2Fcallback&code_verifier=ONskPfcbfAYPp5xqhpMstHSz017896R7sy3wqrRdqC8lYB8yQciCCNLooqLC9qHFTF2FFhDQP4m8PEFNSry8eoCbQ9baYcoWjF1bEH6vGWExdTIMqauicjeVxqz58FO8',
			bodyExpected:
				'code=F5CDCDB9AADB9ADA59560DE80CAAA6688BC5C8BA1CC1C1F9839F7E7B32171B3D-1&grant_type=authorization_code&client_id=interactive.public.short&redirect_uri=http%3A%2F%2Flocalhost%3A4200%2Fauthentication%2Fcallback&code_verifier=1234',
		},
		{
			body: 'code=F5CDCDB9AADB9ADA59560DE80CAAA6688BC5C8BA1CC1C1F9839F7E7B32171B3D-1&code_verifier=ONskPfcbfAYPp5xqhpMstHSz017896R7sy3wqrRdqC8lYB8yQciCCNLooqLC9qHFTF2FFhDQP4m8PEFNSry8eoCbQ9baYcoWjF1bEH6vGWExdTIMqauicjeVxqz58FO8&grant_type=authorization_code&client_id=interactive.public.short&redirect_uri=http%3A%2F%2Flocalhost%3A4200%2Fauthentication%2Fcallback',
			bodyExpected:
				'code=F5CDCDB9AADB9ADA59560DE80CAAA6688BC5C8BA1CC1C1F9839F7E7B32171B3D-1&code_verifier=1234&grant_type=authorization_code&client_id=interactive.public.short&redirect_uri=http%3A%2F%2Flocalhost%3A4200%2Fauthentication%2Fcallback',
		},
	])('inject new codeVerifier', async ({ body, bodyExpected }) => {
		const result = replaceCodeVerifier(body, '1234');
		expect(bodyExpected).toEqual(result);
	});
});

describe('extractConfigurationNameFromCodeVerifier should', () => {
	it.each([
		{
			body: 'code=56DB8E3592FBD48DCF6F65B38B12845FF0186ECF6D66ECB5425C0F7E658B7951-1&grant_type=authorization_code&client_id=interactive.public.short&redirect_uri=https%3A%2F%2Fblack-rock-0dc6b0d03.1.azurestaticapps.net%2Fauthentication%2Fcallback&code_verifier=CODE_VERIFIER_SECURED_BY_OIDC_SERVICE_WORKER_default',
			expected: 'default',
		},
		{
			body: 'code=56DB8E3592FBD48DCF6F65B38B12845FF0186ECF6D66ECB5425C0F7E658B7951-1&code_verifier=CODE_VERIFIER_SECURED_BY_OIDC_SERVICE_WORKER_youhou&grant_type=authorization_code&client_id=interactive.public.short&redirect_uri=https%3A%2F%2Fblack-rock-0dc6b0d03.1.azurestaticapps.net%2Fauthentication%2Fcallback',
			expected: 'youhou',
		},
	])('inject new codeVerifier', async ({ body, expected }) => {
		const configurationName = extractConfigurationNameFromCodeVerifier(body);
		console.log(configurationName);
		expect(configurationName).toEqual(expected);
	});
});

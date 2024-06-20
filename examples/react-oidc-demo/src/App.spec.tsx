import '@testing-library/jest-dom/vitest';

import { fireEvent, render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { describe, expect, it, beforeAll, afterEach, afterAll, vi } from 'vitest';

import App from './App';

const server = setupServer(
	http.get('https://demo.duendesoftware.com/.well-known/openid-configuration', () => {
		return HttpResponse.json({
			issuer: 'https://demo.identityserver.io',
			jwks_uri: 'https://demo.identityserver.io/.well-known/openid-configuration/jwks',
			authorization_endpoint: 'https://demo.identityserver.io/connect/authorize',
			token_endpoint: 'https://demo.identityserver.io/connect/token',
			userinfo_endpoint: 'https://demo.identityserver.io/connect/userinfo',
			end_session_endpoint: 'https://demo.identityserver.io/connect/endsession',
			check_session_iframe: 'https://demo.identityserver.io/connect/checksession',
			revocation_endpoint: 'https://demo.identityserver.io/connect/revocation',
			introspection_endpoint: 'https://demo.identityserver.io/connect/introspect',
			device_authorization_endpoint: 'https://demo.identityserver.io/connect/deviceauthorization',
			frontchannel_logout_supported: true,
			frontchannel_logout_session_supported: true,
			backchannel_logout_supported: true,
			backchannel_logout_session_supported: true,
			scopes_supported: [
				'openid',
				'profile',
				'email',
				'api',
				'api.scope1',
				'api.scope2',
				'scope2',
				'policyserver.runtime',
				'policyserver.management',
				'offline_access',
			],
			claims_supported: [
				'sub',
				'name',
				'family_name',
				'given_name',
				'middle_name',
				'nickname',
				'preferred_username',
				'profile',
				'picture',
				'website',
				'gender',
				'birthdate',
				'zoneinfo',
				'locale',
				'updated_at',
				'email',
				'email_verified',
			],
			grant_types_supported: [
				'authorization_code',
				'client_credentials',
				'refresh_token',
				'implicit',
				'password',
				'urn:ietf:params:oauth:grant-type:device_code',
			],
			response_types_supported: [
				'code',
				'token',
				'id_token',
				'id_token token',
				'code id_token',
				'code token',
				'code id_token token',
			],
			response_modes_supported: ['form_post', 'query', 'fragment'],
			token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post'],
			id_token_signing_alg_values_supported: ['RS256'],
			subject_types_supported: ['public'],
			code_challenge_methods_supported: ['plain', 'S256'],
			request_parameter_supported: true,
		});
	})
);

vi.spyOn(global.window.crypto, 'getRandomValues').mockReturnValue(new Uint8Array(32).fill(0));
vi.spyOn(global.window.crypto.subtle, 'digest').mockReturnValue(
	Promise.resolve(new ArrayBuffer(32))
);

beforeAll(() => {
	server.listen();
	return () => server.close();
});

afterEach(() => server.resetHandlers());

describe('Authenticating test suite', () => {
	it('Load home page then login should log', async () => {
		render(<App />);

		await screen.findByText('GitHub @axa-fr/react-oidc');
		fireEvent.click(screen.getByText('Login'));
		await screen.findByText('Authentication in progress');
		expect(global.window.location.href).toBe(
			'https://demo.identityserver.io/connect/authorize?client_id=interactive.public.short&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fauthentication%2Fcallback&scope=openid%20profile%20email%20api%20offline_access&response_type=code&youhou_demo=youhou&state=AAAAAAAAAAAAAAAA&nonce=AAAAAAAAAAAA&code_challenge=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA&code_challenge_method=S256'
		);
	});
});

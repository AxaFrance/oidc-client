import { describe, expect, it } from 'vitest';

import { openidWellknownUrlEndWith } from '../../constants';
import { checkDomain, getCurrentDatabaseDomain, normalizeUrl } from '..';
import { Database, Tokens, TrustedDomains } from './../../types';

describe('domains', () => {
	describe('can check domain matches', () => {
		it('can check string domains and return void', () => {
			const result = () =>
				checkDomain(['https://securesite.com:3000'], 'https://securesite.com:3000');
			expect(result()).toBeUndefined();
		});

		it('can check regExp domains and return void when valid', () => {
			const result = () =>
				checkDomain([/^https:\/\/securesite\.com/], 'https://securesite.com:3000');
			expect(result()).toBeUndefined();
		});

		it('will throw error when domain is not trusted', () => {
			const result = () =>
				checkDomain(['https://notsecuresite.com'], 'https://securesite.com:3000');
			expect(result).toThrowError();
		});

		it('will return void when endpoint is falsy', () => {
			const result = () => checkDomain(['https://securesite.com:3000'], '');
			expect(result()).toBeUndefined();
		});
	});
	describe('getCurrentDatabaseDomain', () => {
		const db: Database = {
			default: {
				configurationName: 'config',
				tokens: {} as Tokens,
				status: 'NOT_CONNECTED',
				state: null,
				codeVerifier: null,
				nonce: null,
				oidcServerConfiguration: {
					authorizationEndpoint: 'https://demo.duendesoftware.com/connect/authorize',
					issuer: 'https://demo.duendesoftware.com',
					revocationEndpoint: 'https://demo.duendesoftware.com/connect/revocation',
					tokenEndpoint: 'https://demo.duendesoftware.com/connect/token',
					userInfoEndpoint: 'https://demo.duendesoftware.com/connect/userinfo',
				},
				hideAccessToken: true,
				convertAllRequestsToCorsExceptNavigate: false,
				setAccessTokenToNavigateRequests: true,
				demonstratingProofOfPossessionNonce: null,
				demonstratingProofOfPossessionJwkJson: null,
			},
		};

		it('will return null when url ends with openidWellknownUrlEndWith', () => {
			const trustedDomains: TrustedDomains = {
				default: ['https://demo.duendesoftware.com', 'https://kdhttps.auth0.com'],
			};
			const url = 'http://url' + openidWellknownUrlEndWith;
			expect(getCurrentDatabaseDomain(db, url, trustedDomains)).toBeNull();
		});

		it('will return null when url is the token endpoint', () => {
			const trustedDomains: TrustedDomains = {
				default: ['https://demo.duendesoftware.com', 'https://kdhttps.auth0.com'],
			};
			const url = 'https://demo.duendesoftware.com/connect/token';
			expect(getCurrentDatabaseDomain(db, url, trustedDomains)).toBeNull();
		});

		it('will return null when url is the token endpoint only differs by default port', () => {
			const trustedDomains: TrustedDomains = {
				default: ['https://demo.duendesoftware.com', 'https://kdhttps.auth0.com'],
			};
			const url = 'https://demo.duendesoftware.com:443/connect/token';
			expect(getCurrentDatabaseDomain(db, url, trustedDomains)).toBeNull();
		});

		it('will return null when url is the token endpoint', () => {
			const trustedDomains: TrustedDomains = {
				default: ['https://demo.duendesoftware.com', 'https://kdhttps.auth0.com'],
			};
			const url = 'https://demo.duendesoftware.com/connect/revocation';
			expect(getCurrentDatabaseDomain(db, url, trustedDomains)).toBeNull();
		});

		it('will not return null when url is the userinfo endpoint', () => {
			const trustedDomains: TrustedDomains = {
				default: ['https://demo.duendesoftware.com', 'https://kdhttps.auth0.com'],
			};
			const url = 'https://demo.duendesoftware.com/connect/userinfo';
			expect(getCurrentDatabaseDomain(db, url, trustedDomains)).not.toBeNull();
		});

		it('will test urls against domains list if accessTokenDomains list is not present', () => {
			const trustedDomains: TrustedDomains = {
				default: {
					domains: ['https://domain'],
					showAccessToken: false,
				},
			};

			expect(getCurrentDatabaseDomain(db, 'https://domain/test', trustedDomains)).toBe(db.default);
		});

		it('will test urls against accessTokenDomains list if it is present and ignore domains list', () => {
			const trustedDomains: TrustedDomains = {
				default: {
					domains: ['https://domain'],
					accessTokenDomains: ['https://myapi'],
					showAccessToken: false,
				},
			};

			expect(getCurrentDatabaseDomain(db, 'https://myapi/test', trustedDomains)).toBe(db.default);
			expect(getCurrentDatabaseDomain(db, 'https://domain/test', trustedDomains)).toBeNull();
		});
	});
	it('normalizes urls', () => {
		expect(normalizeUrl('foo.com')).toBe('https://foo.com');
		expect(normalizeUrl('foo.com ')).toBe('https://foo.com');
		expect(normalizeUrl('foo.com.')).toBe('https://foo.com');
		expect(normalizeUrl('foo.com')).toBe('https://foo.com');
		expect(normalizeUrl('HTTP://foo.com')).toBe('http://foo.com');
		expect(normalizeUrl('//foo.com')).toBe('https://foo.com');
		expect(normalizeUrl('http://foo.com')).toBe('http://foo.com');
		expect(normalizeUrl('http://foo.com:80')).toBe('http://foo.com');
		expect(normalizeUrl('https://foo.com:443')).toBe('https://foo.com');
		expect(normalizeUrl('http://foo.com/foo/')).toBe('http://foo.com/foo');
		expect(normalizeUrl('foo.com/?foo=bar baz')).toBe('https://foo.com/?foo=bar+baz');
		expect(normalizeUrl('https://foo.com/https://bar.com')).toBe('https://foo.com/https://bar.com');
		expect(normalizeUrl('https://foo.com/https://bar.com/foo//bar')).toBe(
			'https://foo.com/https://bar.com/foo/bar',
		);
		expect(normalizeUrl('https://foo.com/http://bar.com')).toBe('https://foo.com/http://bar.com');
		expect(normalizeUrl('https://foo.com/http://bar.com/foo//bar')).toBe(
			'https://foo.com/http://bar.com/foo/bar',
		);
		expect(normalizeUrl('http://foo.com/%7Efoo/')).toBe('http://foo.com/~foo');
		expect(normalizeUrl('https://foo.com/%FAIL%/07/94/ca/55.jpg')).toBe(
			'https://foo.com/%FAIL%/07/94/ca/55.jpg',
		);
		expect(normalizeUrl('http://foo.com/?')).toBe('http://foo.com');
		expect(normalizeUrl('êxample.com')).toBe('https://xn--xample-hva.com');
		expect(normalizeUrl('http://foo.com/?b=bar&a=foo')).toBe('http://foo.com/?a=foo&b=bar');
		expect(normalizeUrl('http://foo.com/?foo=bar*|<>:"')).toBe(
			'http://foo.com/?foo=bar*|%3C%3E:%22',
		);
		expect(normalizeUrl('http://foo.com:5000')).toBe('http://foo.com:5000');
		expect(normalizeUrl('http://foo.com/foo#bar')).toBe('http://foo.com/foo#bar');
		expect(normalizeUrl('http://foo.com/foo/bar/../baz')).toBe('http://foo.com/foo/baz');
		expect(normalizeUrl('http://foo.com/foo/bar/./baz')).toBe('http://foo.com/foo/bar/baz');
	});
});

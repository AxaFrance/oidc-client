import { acceptAnyDomainToken, scriptFilename, TOKEN } from './constants';
import { Database, MessageEventData, OidcConfig, TrustedDomains } from './types';
import {
	checkDomain,
	getCurrentDatabaseDomain,
	getDomains,
	hideTokens,
	isTokensValid,
	serializeHeaders,
	sleep,
} from './utils';
import {
	extractConfigurationNameFromCodeVerifier,
	replaceCodeVerifier,
} from './utils/codeVerifier';
import { normalizeUrl } from './utils/normalizeUrl';
import version from './version';
import { generateJwkAsync, generateJwtDemonstratingProofOfPossessionAsync } from './jwt';
import { getDpopConfiguration, getDpopOnlyWhenDpopHeaderPresent } from './dpop';
import { base64urlOfHashOfASCIIEncodingAsync } from './crypto';

// @ts-ignore
if (typeof trustedTypes !== 'undefined' && typeof trustedTypes.createPolicy == 'function') {
	// @ts-ignore
	trustedTypes.createPolicy('default', {
		createScriptURL: function (url: string) {
			if (url == scriptFilename) {
				return url;
			} else {
				throw new Error('Untrusted script URL blocked: ' + url);
			}
		},
	});
}

const _self = self as ServiceWorkerGlobalScope & typeof globalThis;

declare let trustedDomains: TrustedDomains;

_self.importScripts(scriptFilename);

const id = Math.round(new Date().getTime() / 1000).toString();

const keepAliveJsonFilename = 'OidcKeepAliveServiceWorker.json';
const handleInstall = (event: ExtendableEvent) => {
	console.log('[OidcServiceWorker] service worker installed ' + id);
	event.waitUntil(_self.skipWaiting());
};

const handleActivate = (event: ExtendableEvent) => {
	console.log('[OidcServiceWorker] service worker activated ' + id);
	event.waitUntil(_self.clients.claim());
};

const database: Database = {};

const getCurrentDatabasesTokenEndpoint = (database: Database, url: string) => {
	const databases: OidcConfig[] = [];
	for (const [, value] of Object.entries<OidcConfig>(database)) {
		if (
			value.oidcServerConfiguration != null &&
			url.startsWith(normalizeUrl(value.oidcServerConfiguration.tokenEndpoint))
		) {
			databases.push(value);
		} else if (
			value.oidcServerConfiguration != null &&
			value.oidcServerConfiguration.revocationEndpoint &&
			url.startsWith(normalizeUrl(value.oidcServerConfiguration.revocationEndpoint))
		) {
			databases.push(value);
		}
	}
	return databases;
};

const keepAliveAsync = async (event: FetchEvent) => {
	const originalRequest = event.request;
	const isFromVanilla = originalRequest.headers.has('oidc-vanilla');
	const init = { status: 200, statusText: 'oidc-service-worker' };
	const response = new Response('{}', init);
	if (!isFromVanilla) {
		const originalRequestUrl = new URL(originalRequest.url);
		const minSleepSeconds = Number(originalRequestUrl.searchParams.get('minSleepSeconds')) || 240;
		for (let i = 0; i < minSleepSeconds; i++) {
			await sleep(1000 + Math.floor(Math.random() * 1000));
			const cache = await caches.open('oidc_dummy_cache');
			await cache.put(event.request, response.clone());
		}
	}
	return response;
};

async function generateDpopAsync(
	originalRequest: Request,
	currentDatabase: OidcConfig | null,
	url: string,
	extrasClaims = {}
) {
	const headersExtras = serializeHeaders(originalRequest.headers);
	if (
		currentDatabase &&
		currentDatabase.demonstratingProofOfPossessionConfiguration &&
		currentDatabase.demonstratingProofOfPossessionJwkJson &&
		(!currentDatabase.demonstratingProofOfPossessionOnlyWhenDpopHeaderPresent ||
			(currentDatabase.demonstratingProofOfPossessionOnlyWhenDpopHeaderPresent &&
				headersExtras['dpop']))
	) {
		const dpopConfiguration = currentDatabase.demonstratingProofOfPossessionConfiguration;
		const jwk = currentDatabase.demonstratingProofOfPossessionJwkJson;
		headersExtras['dpop'] = await generateJwtDemonstratingProofOfPossessionAsync(self)(
			dpopConfiguration
		)(jwk, 'POST', url, extrasClaims);
		if (currentDatabase.demonstratingProofOfPossessionNonce != null) {
			headersExtras['nonce'] = currentDatabase.demonstratingProofOfPossessionNonce;
		}
	}
	return headersExtras;
}

const handleFetch = async (event: FetchEvent) => {
	const originalRequest = event.request;
	const url = normalizeUrl(originalRequest.url);
	if (url.includes(keepAliveJsonFilename)) {
		event.respondWith(keepAliveAsync(event));
		return;
	}

	const currentDatabaseForRequestAccessToken = getCurrentDatabaseDomain(
		database,
		url,
		trustedDomains
	);
	if (
		currentDatabaseForRequestAccessToken &&
		currentDatabaseForRequestAccessToken.tokens &&
		currentDatabaseForRequestAccessToken.tokens.access_token
	) {
		while (
			currentDatabaseForRequestAccessToken.tokens &&
			!isTokensValid(currentDatabaseForRequestAccessToken.tokens)
		) {
			await sleep(200);
		}

		let requestMode = originalRequest.mode;

		if (
			originalRequest.mode !== 'navigate' &&
			currentDatabaseForRequestAccessToken.convertAllRequestsToCorsExceptNavigate
		) {
			requestMode = 'cors';
		}

		let headers: { [p: string]: string };
		if (
			originalRequest.mode == 'navigate' &&
			!currentDatabaseForRequestAccessToken.setAccessTokenToNavigateRequests
		) {
			headers = {
				...serializeHeaders(originalRequest.headers),
			};
		} else {
			const authorization = originalRequest.headers.get('authorization');
			let authenticationMode = 'Bearer';
			if (authorization) {
				authenticationMode = authorization.split(' ')[0];
			}
			headers = {
				...serializeHeaders(originalRequest.headers),
				authorization:
					authenticationMode + ' ' + currentDatabaseForRequestAccessToken.tokens.access_token,
			};
		}
		let init: RequestInit;
		if (originalRequest.mode === 'navigate') {
			init = {
				headers: headers,
			};
		} else {
			init = {
				headers: headers,
				mode: requestMode,
			};
		}

		const newRequest = new Request(originalRequest, init);

		event.respondWith(fetch(newRequest));

		return;
	}

	if (event.request.method !== 'POST') {
		return;
	}

	let currentDatabase: OidcConfig | null = null;
	const currentDatabases = getCurrentDatabasesTokenEndpoint(database, url);
	const numberDatabase = currentDatabases.length;
	if (numberDatabase > 0) {
		const maPromesse = new Promise<Response>((resolve, reject) => {
			const clonedRequest = originalRequest.clone();
			const response = clonedRequest.text().then(async (actualBody) => {
				if (actualBody.includes(TOKEN.REFRESH_TOKEN) || actualBody.includes(TOKEN.ACCESS_TOKEN)) {
					let headers = serializeHeaders(originalRequest.headers);
					let newBody = actualBody;
					for (let i = 0; i < numberDatabase; i++) {
						const currentDb = currentDatabases[i];
						if (currentDb && currentDb.tokens != null) {
							const claimsExtras = {
								ath: await base64urlOfHashOfASCIIEncodingAsync(currentDb.tokens.access_token),
							};
							headers = await generateDpopAsync(originalRequest, currentDb, url, claimsExtras);
							const keyRefreshToken = TOKEN.REFRESH_TOKEN + '_' + currentDb.configurationName;
							if (actualBody.includes(keyRefreshToken)) {
								newBody = newBody.replace(
									keyRefreshToken,
									encodeURIComponent(currentDb.tokens.refresh_token as string)
								);
								currentDatabase = currentDb;

								break;
							}
							const keyAccessToken = TOKEN.ACCESS_TOKEN + '_' + currentDb.configurationName;
							if (actualBody.includes(keyAccessToken)) {
								newBody = newBody.replace(
									keyAccessToken,
									encodeURIComponent(currentDb.tokens.access_token)
								);
								currentDatabase = currentDb;
								break;
							}
						}
					}

					const fetchPromise = fetch(originalRequest, {
						body: newBody,
						method: clonedRequest.method,
						headers: {
							...headers,
						},
						mode: clonedRequest.mode,
						cache: clonedRequest.cache,
						redirect: clonedRequest.redirect,
						referrer: clonedRequest.referrer,
						credentials: clonedRequest.credentials,
						integrity: clonedRequest.integrity,
					});

					if (
						currentDatabase &&
						currentDatabase.oidcServerConfiguration != null &&
						currentDatabase.oidcServerConfiguration.revocationEndpoint &&
						url.startsWith(normalizeUrl(currentDatabase.oidcServerConfiguration.revocationEndpoint))
					) {
						return fetchPromise.then(async (response) => {
							const text = await response.text();
							return new Response(text, response);
						});
					}
					return fetchPromise.then(hideTokens(currentDatabase as OidcConfig));
				} else if (
					actualBody.includes('code_verifier=') &&
					extractConfigurationNameFromCodeVerifier(actualBody) != null
				) {
					const currentLoginCallbackConfigurationName =
						extractConfigurationNameFromCodeVerifier(actualBody);
					// @ts-ignore
					currentDatabase = database[currentLoginCallbackConfigurationName];
					let newBody = actualBody;
					if (currentDatabase && currentDatabase.codeVerifier != null) {
						newBody = replaceCodeVerifier(newBody, currentDatabase.codeVerifier);
					}

					const headersExtras = await generateDpopAsync(originalRequest, currentDatabase, url);

					return fetch(originalRequest, {
						body: newBody,
						method: clonedRequest.method,
						headers: {
							...headersExtras,
						},
						mode: clonedRequest.mode,
						cache: clonedRequest.cache,
						redirect: clonedRequest.redirect,
						referrer: clonedRequest.referrer,
						credentials: clonedRequest.credentials,
						integrity: clonedRequest.integrity,
						// @ts-ignore
					}).then(hideTokens(currentDatabase));
				}

				// if showAccessToken=true, the token is already in the body
				// of the request, and it does not need to be injected
				// and we can simply clone the request
				return fetch(originalRequest, {
					body: actualBody,
					method: clonedRequest.method,
					headers: {
						...serializeHeaders(originalRequest.headers),
					},
					mode: clonedRequest.mode,
					cache: clonedRequest.cache,
					redirect: clonedRequest.redirect,
					referrer: clonedRequest.referrer,
					credentials: clonedRequest.credentials,
					integrity: clonedRequest.integrity,
				});
			});
			response
				.then((r) => {
					resolve(r);
				})
				.catch((err) => {
					reject(err);
				});
		});

		event.respondWith(maPromesse);
	}
};

const handleMessage = async (event: ExtendableMessageEvent) => {
	const port = event.ports[0];
	const data = event.data as MessageEventData;
	if (event.data.type === 'claim') {
		_self.clients.claim().then(() => port.postMessage({}));
		return;
	}
	const configurationName = data.configurationName;
	let currentDatabase = database[configurationName];
	if (trustedDomains == null) {
		trustedDomains = {};
	}
	if (!currentDatabase) {
		const trustedDomain = trustedDomains[configurationName];
		const showAccessToken = Array.isArray(trustedDomain) ? false : trustedDomain.showAccessToken;
		const doNotSetAccessTokenToNavigateRequests = Array.isArray(trustedDomain)
			? true
			: trustedDomain.setAccessTokenToNavigateRequests;
		const convertAllRequestsToCorsExceptNavigate = Array.isArray(trustedDomain)
			? false
			: trustedDomain.convertAllRequestsToCorsExceptNavigate;
		database[configurationName] = {
			tokens: null,
			state: null,
			codeVerifier: null,
			oidcServerConfiguration: null,
			oidcConfiguration: undefined,
			nonce: null,
			status: null,
			configurationName,
			hideAccessToken: !showAccessToken,
			setAccessTokenToNavigateRequests: doNotSetAccessTokenToNavigateRequests ?? true,
			convertAllRequestsToCorsExceptNavigate: convertAllRequestsToCorsExceptNavigate ?? false,
			demonstratingProofOfPossessionNonce: null,
			demonstratingProofOfPossessionJwkJson: null,
			demonstratingProofOfPossessionConfiguration: null,
			demonstratingProofOfPossessionOnlyWhenDpopHeaderPresent: false,
		};
		currentDatabase = database[configurationName];

		if (!trustedDomains[configurationName]) {
			trustedDomains[configurationName] = [];
		}
	}

	switch (data.type) {
		case 'clear':
			currentDatabase.tokens = null;
			currentDatabase.state = null;
			currentDatabase.codeVerifier = null;
			currentDatabase.demonstratingProofOfPossessionNonce = null;
			currentDatabase.demonstratingProofOfPossessionJwkJson = null;
			currentDatabase.demonstratingProofOfPossessionConfiguration = null;
			currentDatabase.demonstratingProofOfPossessionOnlyWhenDpopHeaderPresent = false;
			currentDatabase.status = data.data.status;
			port.postMessage({ configurationName });
			return;
		case 'init': {
			const oidcServerConfiguration = data.data.oidcServerConfiguration;
			const trustedDomain = trustedDomains[configurationName];
			const domains = getDomains(trustedDomain, 'oidc');
			if (!domains.some((domain) => domain === acceptAnyDomainToken)) {
				[
					oidcServerConfiguration.tokenEndpoint,
					oidcServerConfiguration.revocationEndpoint,
					oidcServerConfiguration.userInfoEndpoint,
					oidcServerConfiguration.issuer,
				].forEach((url) => {
					checkDomain(domains, url);
				});
			}
			currentDatabase.oidcServerConfiguration = oidcServerConfiguration;
			currentDatabase.oidcConfiguration = data.data.oidcConfiguration;

			if (currentDatabase.demonstratingProofOfPossessionConfiguration == null) {
				const demonstratingProofOfPossessionConfiguration = getDpopConfiguration(
					trustedDomains[configurationName]
				);
				if (demonstratingProofOfPossessionConfiguration != null) {
					if (currentDatabase.oidcConfiguration.demonstrating_proof_of_possession) {
						console.warn(
							'In service worker, demonstrating_proof_of_possession must be configured from trustedDomains file'
						);
					}
					currentDatabase.demonstratingProofOfPossessionConfiguration =
						demonstratingProofOfPossessionConfiguration;
					currentDatabase.demonstratingProofOfPossessionJwkJson = await generateJwkAsync(self)(
						demonstratingProofOfPossessionConfiguration.generateKeyAlgorithm
					);
					currentDatabase.demonstratingProofOfPossessionOnlyWhenDpopHeaderPresent =
						getDpopOnlyWhenDpopHeaderPresent(trustedDomains[configurationName]) ?? false;
				}
			}

			if (!currentDatabase.tokens) {
				port.postMessage({
					tokens: null,
					status: currentDatabase.status,
					configurationName,
					version,
				});
			} else {
				const tokens = {
					...currentDatabase.tokens,
				};
				if (currentDatabase.hideAccessToken) {
					tokens.access_token = TOKEN.ACCESS_TOKEN + '_' + configurationName;
				}
				if (tokens.refresh_token) {
					tokens.refresh_token = TOKEN.REFRESH_TOKEN + '_' + configurationName;
				}
				if (tokens.idTokenPayload && tokens.idTokenPayload.nonce && currentDatabase.nonce != null) {
					tokens.idTokenPayload.nonce = TOKEN.NONCE_TOKEN + '_' + configurationName;
				}
				port.postMessage({
					tokens,
					status: currentDatabase.status,
					configurationName,
					version,
				});
			}
			return;
		}
		case 'setDemonstratingProofOfPossessionNonce': {
			currentDatabase.demonstratingProofOfPossessionNonce =
				data.data.demonstratingProofOfPossessionNonce;
			port.postMessage({ configurationName });
			return;
		}
		case 'getDemonstratingProofOfPossessionNonce': {
			const demonstratingProofOfPossessionNonce =
				currentDatabase.demonstratingProofOfPossessionNonce;
			port.postMessage({
				configurationName,
				demonstratingProofOfPossessionNonce,
			});
			return;
		}
		case 'setState': {
			currentDatabase.state = data.data.state;
			port.postMessage({ configurationName });
			return;
		}
		case 'getState': {
			const state = currentDatabase.state;
			port.postMessage({ configurationName, state });
			return;
		}
		case 'setCodeVerifier': {
			currentDatabase.codeVerifier = data.data.codeVerifier;
			port.postMessage({ configurationName });
			return;
		}
		case 'getCodeVerifier': {
			port.postMessage({
				configurationName,
				codeVerifier:
					currentDatabase.codeVerifier != null
						? TOKEN.CODE_VERIFIER + '_' + configurationName
						: null,
			});
			return;
		}
		case 'setSessionState': {
			currentDatabase.sessionState = data.data.sessionState;
			port.postMessage({ configurationName });
			return;
		}
		case 'getSessionState': {
			const sessionState = currentDatabase.sessionState;
			port.postMessage({ configurationName, sessionState });
			return;
		}
		case 'setNonce': {
			const nonce = data.data.nonce;
			if (nonce) {
				currentDatabase.nonce = nonce;
			}
			port.postMessage({ configurationName });
			return;
		}
		case 'getNonce': {
			const keyNonce = TOKEN.NONCE_TOKEN + '_' + configurationName;
			const nonce = currentDatabase.nonce ? keyNonce : null;
			port.postMessage({ configurationName, nonce });
			return;
		}
		default: {
			return;
		}
	}
};

_self.addEventListener('install', handleInstall);
_self.addEventListener('activate', handleActivate);
_self.addEventListener('fetch', handleFetch);
_self.addEventListener('message', handleMessage);

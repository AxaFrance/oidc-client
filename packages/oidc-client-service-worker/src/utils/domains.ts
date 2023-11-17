import { acceptAnyDomainToken, openidWellknownUrlEndWith, scriptFilename } from '../constants';
import { Database, Domain, DomainDetails, OidcConfig, TrustedDomains } from '../types';

export function checkDomain(domains: Domain[], endpoint: string) {
	if (!endpoint) {
		return;
	}

	const domain = domains.find((domain) => {
		let testable: RegExp;

		if (typeof domain === 'string') {
			testable = new RegExp(`^${domain}`);
		} else {
			testable = domain;
		}

		return testable.test?.(endpoint);
	});
	if (!domain) {
		throw new Error(
			'Domain ' + endpoint + ' is not trusted, please add domain in ' + scriptFilename,
		);
	}
}

export const getDomains = (
	trustedDomain: Domain[] | DomainDetails,
	type: 'oidc' | 'accessToken',
) => {
	if (Array.isArray(trustedDomain)) {
		return trustedDomain;
	}

	return trustedDomain[`${type}Domains`] ?? trustedDomain.domains ?? [];
};

export const getCurrentDatabaseDomain = (
	database: Database,
	url: string,
	trustedDomains: TrustedDomains,
) => {
	if (url.endsWith(openidWellknownUrlEndWith)) {
		return null;
	}
	for (const [key, currentDatabase] of Object.entries<OidcConfig>(database)) {
		const oidcServerConfiguration = currentDatabase.oidcServerConfiguration;

		if (!oidcServerConfiguration) {
			continue;
		}

		if (
			oidcServerConfiguration.tokenEndpoint &&
			normalizeUrl(url) === normalizeUrl(oidcServerConfiguration.tokenEndpoint)
		) {
			continue;
		}
		if (
			oidcServerConfiguration.revocationEndpoint &&
			normalizeUrl(url) === normalizeUrl(oidcServerConfiguration.revocationEndpoint)
		) {
			continue;
		}
		const trustedDomain = trustedDomains == null ? [] : trustedDomains[key];

		const domains = getDomains(trustedDomain, 'accessToken');
		const domainsToSendTokens = oidcServerConfiguration.userInfoEndpoint
			? [oidcServerConfiguration.userInfoEndpoint, ...domains]
			: [...domains];

		let hasToSendToken = false;
		if (domainsToSendTokens.find((f) => f === acceptAnyDomainToken)) {
			hasToSendToken = true;
		} else {
			for (let i = 0; i < domainsToSendTokens.length; i++) {
				let domain = domainsToSendTokens[i];

				if (typeof domain === 'string') {
					domain = new RegExp(`^${domain}`);
				}

				if (domain.test?.(url)) {
					hasToSendToken = true;
					break;
				}
			}
		}

		if (hasToSendToken) {
			if (!currentDatabase.tokens) {
				return null;
			}
			return currentDatabase;
		}
	}
	return null;
};

export function normalizeUrl(url: string) {
	url = url.trim();

	const hasRelativeProtocol = url.startsWith('//');
	const isRelativeUrl = !hasRelativeProtocol && /^\.*\//.test(url);

	// Prepend protocol
	if (!isRelativeUrl) {
		url = url.replace(/^(?!(?:\w+:)?\/\/)|^\/\//, 'https:');
	}

	const urlObject = new URL(url);

	// Remove duplicate slashes if not preceded by a protocol
	// NOTE: This could be implemented using a single negative lookbehind
	// regex, but we avoid that to maintain compatibility with older js engines
	// which do not have support for that feature.
	if (urlObject.pathname) {
		// Split the string by occurrences of this protocol regex, and perform
		// duplicate-slash replacement on the strings between those occurrences
		// (if any).
		const protocolRegex = /\b[a-z][a-z\d+\-.]{1,50}:\/\//g;

		let lastIndex = 0;
		let result = '';
		for (;;) {
			const match = protocolRegex.exec(urlObject.pathname);
			if (!match) {
				break;
			}

			const protocol = match[0];
			const protocolAtIndex = match.index;
			const intermediate = urlObject.pathname.slice(lastIndex, protocolAtIndex);

			result += intermediate.replace(/\/{2,}/g, '/');
			result += protocol;
			lastIndex = protocolAtIndex + protocol.length;
		}

		const remnant = urlObject.pathname.slice(lastIndex, urlObject.pathname.length);
		result += remnant.replace(/\/{2,}/g, '/');

		urlObject.pathname = result;
	}

	// Decode URI octets
	if (urlObject.pathname) {
		try {
			urlObject.pathname = decodeURI(urlObject.pathname);
		} catch {
			/* empty */
		}
	}

	if (urlObject.hostname) {
		// Remove trailing dot
		urlObject.hostname = urlObject.hostname.replace(/\.$/, '');
	}

	// Sort query parameters
	urlObject.searchParams.sort();

	// Calling `.sort()` encodes the search parameters, so we need to decode them again.
	try {
		urlObject.search = decodeURIComponent(urlObject.search);
	} catch {
		/* empty */
	}

	// Remove trailing slash
	urlObject.pathname = urlObject.pathname.replace(/\/$/, '');

	// Take advantage of many of the Node `url` normalizations
	url = urlObject.toString();

	// Remove ending `/` unless removeSingleSlash is false
	if (urlObject.hash === '') {
		url = url.replace(/\/$/, '');
	}

	return url;
}

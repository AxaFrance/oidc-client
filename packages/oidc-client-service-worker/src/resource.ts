/** An explicitly permitted OAuth resource and its API destinations. */
export interface OidcResourceConfiguration {
  resource: string;
  allowedUrlPrefixes: readonly string[];
  scope?: string;
  audiences?: readonly string[];
}

/** Worker-only resource refresh routing hint, removed before the provider request. */
export const RESOURCE_TOKEN_REQUEST_HEADER = 'x-oidc-resource';

/** Builds an isolated storage/worker context without creating another OIDC client. */
export const getResourceContextName = (configurationName: string, resource: string): string =>
  `${configurationName}#resource=${encodeURIComponent(resource)}`;

/** Reads the exact resource identifier from an isolated context name. */
export const getContextResource = (configurationName: string): string | undefined => {
  const marker = '#resource=';
  const index = configurationName.indexOf(marker);
  return index < 0 ? undefined : decodeURIComponent(configurationName.slice(index + marker.length));
};

/** Validates RFC 8707 identifiers without treating them as API URLs or scopes. */
export const validateResourceIdentifier = (resource: string): void => {
  if (
    typeof resource !== 'string' ||
    !/^[a-z][a-z\d+.-]*:/i.test(resource) ||
    resource.includes('#') ||
    /\s/.test(resource)
  ) {
    throw new Error('A resource must be an absolute URI without whitespace or a fragment.');
  }
  new URL(resource);
};

const getApiUrl = (value: string): URL => {
  const url = new URL(value);
  if (
    (url.protocol !== 'https:' && url.protocol !== 'http:') ||
    url.username ||
    url.password ||
    url.hash ||
    /%2f|%5c/i.test(url.pathname)
  ) {
    throw new Error(
      'API destinations must be HTTP(S) URLs without credentials, fragments, or encoded separators.',
    );
  }
  return url;
};

const getApiPrefixUrl = (value: string): URL => {
  const prefix = getApiUrl(value);
  if (prefix.search) throw new Error('An API URL prefix must not contain a query.');
  return prefix;
};

/** Prevents default-token fallback anywhere on an explicitly managed API origin. */
export const isResourceOriginManaged = (
  configurations: readonly OidcResourceConfiguration[] | undefined,
  destination: string,
): boolean => {
  const origin = getApiUrl(destination).origin;
  return (
    configurations?.some(configuration =>
      configuration.allowedUrlPrefixes.some(value => getApiPrefixUrl(value).origin === origin),
    ) ?? false
  );
};

/** Matches API mappings by parsed origin and path boundaries, never by host suffix. */
export const isResourceUrlAllowed = (
  configuration: OidcResourceConfiguration,
  destination: string,
): boolean => {
  const url = getApiUrl(destination);
  return configuration.allowedUrlPrefixes.some(value => {
    const prefix = getApiPrefixUrl(value);
    const path = prefix.pathname.replace(/\/+$/, '');
    return (
      url.origin === prefix.origin &&
      (path === '' || url.pathname === path || url.pathname.startsWith(`${path}/`))
    );
  });
};

/** Validates and retrieves an explicitly registered resource. */
export const getResourceConfiguration = (
  configurations: readonly OidcResourceConfiguration[] | undefined,
  resource: string,
): OidcResourceConfiguration => {
  validateResourceIdentifier(resource);
  const matches =
    configurations?.filter(configuration => configuration.resource === resource) ?? [];
  if (matches.length !== 1 || matches[0].allowedUrlPrefixes.length === 0) {
    throw new Error(
      'The resource must be registered exactly once with permitted API URL prefixes.',
    );
  }
  for (const prefix of matches[0].allowedUrlPrefixes) {
    isResourceUrlAllowed(matches[0], prefix);
  }
  return matches[0];
};

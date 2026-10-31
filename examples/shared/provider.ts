import type { OidcConfiguration } from '@axa-fr/oidc-client';

export const localAuthority = 'http://localhost:7001';
export const ordersResource = 'http://localhost:7002/';
export const inventoryResource = 'http://localhost:7003/';
export const unsupportedResource = 'urn:demo:unsupported';

export interface DemoEnvironment {
  provider: 'openiddict' | 'duende';
  isDpop: boolean;
  isWorker: boolean;
}

/** Resolves explicit demo settings and retains local modes across OAuth redirects. */
export function getDemoEnvironment(options: {
  isDevelopment: boolean;
  provider?: string;
  location: Pick<Location, 'hostname' | 'search'>;
  storage: Storage;
}): DemoEnvironment {
  const provider = options.provider ?? (options.isDevelopment ? 'openiddict' : 'duende');
  if (provider !== 'openiddict' && provider !== 'duende') {
    throw new Error('VITE_OIDC_PROVIDER must be openiddict or duende.');
  }
  if (provider === 'duende') return { provider, isDpop: false, isWorker: true };
  if (!['localhost', '127.0.0.1', '[::1]'].includes(options.location.hostname)) {
    throw new Error('The local OpenIddict demo requires a loopback browser origin.');
  }
  const saved = options.storage.getItem('oidc-demo-options');
  const previous: unknown = saved ? JSON.parse(saved) : {};
  if (
    previous === null ||
    typeof previous !== 'object' ||
    Array.isArray(previous) ||
    ('isDpop' in previous && typeof previous.isDpop !== 'boolean') ||
    ('isWorker' in previous && typeof previous.isWorker !== 'boolean')
  ) {
    throw new Error('The stored demo options are invalid; clear oidc-demo-options.');
  }
  const query = new URLSearchParams(options.location.search);
  if (query.has('dpop') && query.get('dpop') !== 'true' && query.get('dpop') !== 'false') {
    throw new Error('The dpop option must be true or false.');
  }
  if (query.has('worker') && query.get('worker') !== 'on' && query.get('worker') !== 'off') {
    throw new Error('The worker option must be on or off.');
  }
  const result: DemoEnvironment = {
    provider,
    isDpop: query.has('dpop')
      ? query.get('dpop') === 'true'
      : 'isDpop' in previous
        ? previous.isDpop === true
        : false,
    isWorker: query.has('worker')
      ? query.get('worker') === 'on'
      : 'isWorker' in previous
        ? previous.isWorker === true
        : true,
  };
  options.storage.setItem('oidc-demo-options', JSON.stringify(result));
  return result;
}

/** Keeps online configuration unchanged and uses the registered local demo endpoints in development. */
export function withDemoProvider(
  configuration: OidcConfiguration,
  environment: DemoEnvironment,
): OidcConfiguration {
  if (environment.provider === 'duende') return configuration;
  const scopes = new Set(configuration.scope.split(/\s+/));
  if (scopes.has('api')) {
    scopes.add('orders.read');
    scopes.add('inventory.read');
  }
  const origin = new URL(configuration.redirect_uri).origin;
  const scopedSilentLogin =
    configuration.redirect_uri.includes('/multi-auth/') &&
    configuration.silent_redirect_uri?.includes('/multi-auth/')
      ? origin +
        new URL(configuration.silent_redirect_uri).pathname.replace(
          'silent-callback',
          'silent-login',
        )
      : configuration.silent_login_uri;
  const isLegacyHash = configuration.redirect_uri.includes('#');
  const isNativeHash = configuration.redirect_uri.includes('/#/');
  const redirect = isNativeHash
    ? '/authentication/callback'
    : '/multi-auth/authentification/hash-callback';
  const silentRedirect = isNativeHash
    ? '/authentication/silent-callback'
    : '/multi-auth/authentification/hash-silent-callback';
  return {
    ...configuration,
    client_id: configuration.client_id.includes('googleusercontent')
      ? 'local.google'
      : configuration.client_id,
    authority: localAuthority,
    authority_configuration: configuration.authority_configuration
      ? {
          issuer: localAuthority + '/',
          authorization_endpoint: localAuthority + '/connect/authorize',
          pushed_authorization_request_endpoint: localAuthority + '/connect/par',
          token_endpoint: localAuthority + '/connect/token',
          userinfo_endpoint: localAuthority + '/connect/userinfo',
          end_session_endpoint: localAuthority + '/connect/endsession',
          revocation_endpoint: localAuthority + '/connect/revocation',
          check_session_iframe: localAuthority + '/connect/checksession',
        }
      : undefined,
    redirect_uri: isLegacyHash ? origin + redirect : configuration.redirect_uri,
    silent_redirect_uri: isLegacyHash ? origin + silentRedirect : configuration.silent_redirect_uri,
    silent_login_uri: isLegacyHash
      ? origin +
        (isNativeHash
          ? '/authentication/silent-login'
          : '/multi-auth/authentification/silent-login')
      : (scopedSilentLogin ?? origin + '/authentication/silent-login'),
    scope: [...scopes].join(' '),
    resource: scopes.has('api') ? [ordersResource, inventoryResource] : undefined,
    resources: [
      {
        resource: ordersResource,
        scope: 'orders.read',
        audiences: [ordersResource],
        allowedUrlPrefixes: [ordersResource + 'api/orders'],
      },
      {
        resource: inventoryResource,
        scope: 'inventory.read',
        audiences: [inventoryResource],
        allowedUrlPrefixes: [inventoryResource + 'api/inventory'],
      },
      { resource: unsupportedResource, allowedUrlPrefixes: [inventoryResource + 'unsupported'] },
    ],
    token_request_extras: {},
    refresh_time_before_tokens_expiration_in_second: 4,
    demonstrating_proof_of_possession:
      configuration.demonstrating_proof_of_possession || environment.isDpop,
    service_worker_relative_url: environment.isWorker
      ? '/OidcServiceWorker.js?provider=openiddict'
      : undefined,
    service_worker_only: environment.isWorker,
  };
}

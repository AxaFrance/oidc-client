// Frozen consumer imports from main f44fd4a6, before RFC 8707 support.
import {
  type ServiceWorkerSignalMessage,
  type ServiceWorkerSignalOptions,
  signalServiceWorkerAsync,
  type ILOidcLocation,
  OidcLocation,
  getFetchDefault,
  type OidcUserInfo,
  OidcClient,
  type OidcErrorOptions,
  type OidcErrorPhase,
  isOidcError,
  OidcError,
  OidcErrorCode,
  isOidcStateError,
  OidcStateError,
  OidcStateErrorCode,
  type Tokens,
  TokenRenewMode,
  type ServiceWorkerMessage,
  type ServiceWorkerMessageTypeKey,
  type ServiceWorkerMessageTypeValue,
  type ServiceWorkerResponse,
  buildDpopSecuredPlaceholder,
  buildSecuredTokenPlaceholder,
  buildStorageKey,
  DPOP_TOKEN_PLACEHOLDER_PREFIX,
  isServiceWorkerMessageType,
  PROTOCOL_VERSION,
  ServiceWorkerMessageType,
  STORAGE_KEY_PREFIX,
  SW_CONTROLLER_CHANGE_RELOAD_COUNT_KEY,
  TOKEN_PLACEHOLDERS,
  isPushedAuthorizationRequestError,
  PushedAuthorizationRequestError,
  PushedAuthorizationRequestErrorCode,
  getParseQueryStringFromLocation,
  getPath,
  type AuthorityConfiguration,
  type Fetch,
  type OidcConfiguration,
  type PushedAuthorizationRequestMode,
  type StringMap,
  TokenAutomaticRenewMode,
} from '../../oidc-client/dist/index.js';

// Compiled only: exercise the pre-resource public client signatures.
export function useLegacyClient(configuration: OidcConfiguration, fetcher: Fetch): void {
  const client = OidcClient.getOrCreate(() => fetcher)(configuration, 'legacy');
  const login: Promise<unknown> = client.loginAsync('/', {}, false, 'openid', true);
  const callback: Promise<{ callbackPath: string }> = client.loginCallbackAsync();
  const silentCallback: Promise<void> = client.silentLoginCallbackAsync();
  const restored: Promise<boolean> = client.tryKeepExistingSessionAsync();
  const logout: Promise<void> = client.logoutAsync(null, {});
  const cleared: Promise<void> = client.clearSessionAsync();
  const renewed: Promise<Tokens | null | undefined> = client.renewTokensAsync({}, 'openid');
  const renewedOrThrow: Promise<Tokens> = client.renewTokensOrThrowAsync({}, 'openid');
  const wrapped: Fetch = client.fetchWithTokens(fetcher, false);
  const user: Promise<OidcUserInfo> = client.userInfoAsync(false, false);
  const tokens: Tokens = client.tokens;
  const configured: OidcConfiguration = client.configuration;
  const loggingOut: boolean = client.isLoggingOut;
  const subscription: string = client.subscribeEvents((_name: string, _data: unknown) => {});
  client.removeEventSubscription(subscription);
  client.publishEvent('legacy', {});
  void [
    login,
    callback,
    silentCallback,
    restored,
    logout,
    cleared,
    renewed,
    renewedOrThrow,
    wrapped,
    user,
    tokens,
    configured,
    loggingOut,
  ];
}

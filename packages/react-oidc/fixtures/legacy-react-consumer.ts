// Frozen consumer imports from main f44fd4a6, before RFC 8707 support.
import {
  useOidcFetch,
  withOidcFetch,
  type OidcProviderProps,
  OidcProvider,
  OidcSecure,
  withOidcSecure,
  useOidc,
  useOidcAccessToken,
  useOidcIdToken,
  OidcUserStatus,
  useOidcUser,
  type AuthorityConfiguration,
  type Fetch,
  type ILOidcLocation,
  type OidcConfiguration,
  type OidcErrorOptions,
  type OidcErrorPhase,
  type PushedAuthorizationRequestMode,
  type StringMap,
  type OidcUserInfo,
  isOidcError,
  isOidcStateError,
  isPushedAuthorizationRequestError,
  OidcClient,
  OidcError,
  OidcErrorCode,
  OidcLocation,
  OidcStateError,
  OidcStateErrorCode,
  PushedAuthorizationRequestError,
  PushedAuthorizationRequestErrorCode,
  TokenAutomaticRenewMode,
  TokenRenewMode,
} from '../dist/index.js';

// Compiled only: retain the named hooks and provider configuration contract.
export function useLegacyHooks(configuration: OidcConfiguration): void {
  const provider: OidcProviderProps = {
    configuration,
    configurationName: 'legacy',
    children: null,
  };
  const { isAuthenticated, login, logout, renewTokens } = useOidc('legacy');
  const authenticated: boolean = isAuthenticated;
  const signIn: Promise<unknown> = login('/', {}, true, 'openid');
  const signOut: Promise<void> = logout(null, {});
  const renewal: Promise<unknown> = renewTokens({});
  const wrapped: Fetch = useOidcFetch(fetch, 'legacy', false).fetch;
  const access = useOidcAccessToken('legacy');
  const identity = useOidcIdToken('legacy');
  const user = useOidcUser<OidcUserInfo>('legacy', false);
  void [provider, authenticated, signIn, signOut, renewal, wrapped, access, identity, user];
}

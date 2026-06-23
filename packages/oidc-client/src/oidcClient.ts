import { fetchWithTokens } from './fetch';
import {
  ServiceWorkerSignalMessage,
  ServiceWorkerSignalOptions,
  signalServiceWorkerAsync,
} from './initWorker.js';
import { ILOidcLocation, OidcLocation } from './location';
import { LoginCallback, Oidc } from './oidc.js';
import { getValidTokenAsync, OidcToken, Tokens, ValidToken } from './parseTokens.js';
import { syncTokensInfoAsync } from './renewTokens';
import { Fetch, OidcConfiguration, StringMap } from './types.js';

export interface EventSubscriber {
  (name: string, data: any);
}

export class OidcClient {
  private readonly _oidc: Oidc;
  constructor(oidc: Oidc) {
    this._oidc = oidc;
  }

  subscribeEvents(func: EventSubscriber): string {
    return this._oidc.subscribeEvents(func);
  }

  removeEventSubscription(id: string): void {
    this._oidc.removeEventSubscription(id);
  }

  publishEvent(eventName: string, data: any): void {
    this._oidc.publishEvent(eventName, data);
  }

  static getOrCreate =
    (getFetch: () => Fetch, location: ILOidcLocation = new OidcLocation()) =>
    (configuration: OidcConfiguration, name = 'default'): OidcClient => {
      return new OidcClient(Oidc.getOrCreate(getFetch, location)(configuration, name));
    };

  /**
   * Retrieve an existing {@link OidcClient} by configuration name.
   *
   * Since issue #1679, this method returns `null` when the requested
   * configuration has not been initialized, instead of throwing. This
   * allows React hooks to be used safely outside of `<OidcProvider>`.
   *
   * Use {@link OidcClient.getOrThrow} to preserve the previous fail-fast
   * behaviour.
   */
  static get(name = 'default'): OidcClient | null {
    const oidc = Oidc.get(name);
    return oidc ? new OidcClient(oidc) : null;
  }

  /**
   * Retrieve an existing {@link OidcClient}, throwing if it has not been
   * initialized. Equivalent to the pre-#1679 behaviour of
   * {@link OidcClient.get}.
   */
  static getOrThrow(name = 'default'): OidcClient {
    return new OidcClient(Oidc.getOrThrow(name));
  }

  static eventNames = Oidc.eventNames;
  tryKeepExistingSessionAsync(): Promise<boolean> {
    return this._oidc.tryKeepExistingSessionAsync();
  }

  loginAsync(
    callbackPath: string = undefined,
    extras: StringMap = null,
    isSilentSignin = false,
    scope: string = undefined,
    silentLoginOnly = false,
  ): Promise<unknown> {
    return this._oidc.loginAsync(callbackPath, extras, isSilentSignin, scope, silentLoginOnly);
  }

  logoutAsync(
    callbackPathOrUrl: string | null | undefined = undefined,
    extras: StringMap = null,
  ): Promise<void> {
    return this._oidc.logoutAsync(callbackPathOrUrl, extras);
  }

  silentLoginCallbackAsync(): Promise<void> {
    return this._oidc.silentLoginCallbackAsync();
  }

  renewTokensAsync(extras: StringMap = null, scope: string = null): Promise<void> {
    return this._oidc.renewTokensAsync(extras, scope);
  }

  loginCallbackAsync(): Promise<LoginCallback> {
    return this._oidc.loginCallbackWithAutoTokensRenewAsync();
  }

  get tokens(): Tokens {
    return this._oidc.tokens;
  }

  get configuration(): OidcConfiguration {
    return this._oidc.configuration;
  }

  async generateDemonstrationOfProofOfPossessionAsync(
    accessToken: string,
    url: string,
    method: string,
    extras: StringMap = {},
  ): Promise<string> {
    return this._oidc.generateDemonstrationOfProofOfPossessionAsync(
      accessToken,
      url,
      method,
      extras,
    );
  }

  async getValidTokenAsync(waitMs = 200, numberWait = 50): Promise<ValidToken> {
    const oidc = this._oidc;
    const oidcToken: OidcToken = {
      getTokens: () => oidc.tokens,
      configuration: {
        token_automatic_renew_mode: oidc.configuration.token_automatic_renew_mode,
        refresh_time_before_tokens_expiration_in_second:
          oidc.configuration.refresh_time_before_tokens_expiration_in_second,
      },
      syncTokensInfoAsync: async () => {
        const { status } = await syncTokensInfoAsync(oidc)(
          oidc.configuration,
          oidc.configurationName,
          oidc.tokens,
          false,
        );
        return status;
      },
      renewTokensAsync: oidc.renewTokensAsync.bind(oidc),
    };
    return getValidTokenAsync(oidcToken, waitMs, numberWait);
  }

  fetchWithTokens(fetch: Fetch, demonstratingProofOfPossession: boolean = false): Fetch {
    return fetchWithTokens(fetch, this._oidc, demonstratingProofOfPossession);
  }

  async userInfoAsync<T extends OidcUserInfo = OidcUserInfo>(
    noCache = false,
    demonstratingProofOfPossession: boolean = false,
  ): Promise<T> {
    return this._oidc.userInfoAsync(noCache, demonstratingProofOfPossession);
  }

  userInfo<T extends OidcUserInfo = OidcUserInfo>(): T {
    return this._oidc.userInfo;
  }

  /**
   * High-level helper to send a message to the OIDC service worker.
   *
   * Wraps the low-level `postMessage` + `MessageChannel` plumbing and
   * returns the response posted back by the worker. Use the typed message
   * symbols exported from `@axa-fr/oidc-client-service-worker/protocol`
   * (`ServiceWorkerMessageType`) to build messages.
   *
   * @throws if no service worker is registered for the current
   * configuration, or if the worker does not respond before the timeout
   * elapses.
   */
  async signalServiceWorker<TResponse = unknown>(
    message: ServiceWorkerSignalMessage,
    options?: ServiceWorkerSignalOptions,
  ): Promise<TResponse> {
    return signalServiceWorkerAsync(
      this._oidc.configuration,
      this._oidc.configurationName,
      message,
      options,
    ) as Promise<TResponse>;
  }
}

export interface OidcUserInfo {
  sub: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  middle_name?: string;
  nickname?: string;
  preferred_username?: string;
  profile?: string;
  picture?: string;
  website?: string;
  email?: string;
  email_verified?: boolean;
  gender?: string;
  birthdate?: string;
  zoneinfo?: string;
  locale?: string;
  phone_number?: string;
  phone_number_verified?: boolean;
  address?: OidcAddressClaim;
  updated_at?: number;
  groups?: string[];
}

export interface OidcAddressClaim {
  formatted?: string;
  street_address?: string;
  locality?: string;
  region?: string;
  postal_code?: string;
  country?: string;
}

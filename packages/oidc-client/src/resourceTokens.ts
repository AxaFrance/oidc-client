import { base64urlOfHashOfASCIIEncodingAsync } from './crypto';
import { eventNames } from './events';
import { initSession } from './initSession';
import { initWorkerAsync } from './initWorker';
import { generateJwtDemonstratingProofOfPossessionAsync } from './jwt';
import type { Oidc } from './oidc';
import {
  createNetworkError,
  createOAuthError,
  isNetworkErrorCause,
  isOidcError,
  OidcError,
  OidcErrorCode,
} from './oidcError';
import { isTokensOidcValid, isTokensValid, TokenRenewMode, Tokens } from './parseTokens';
import {
  getContextResource,
  getResourceConfiguration,
  RESOURCE_TOKEN_REQUEST_HEADER,
} from './protocol';
import { performTokenRequestAsync } from './requests';
import {
  cancelResourceTransactions,
  RESOURCE_LOGIN_PARAMETER,
  resourceContextName,
} from './resourceParameters';
import { _silentLoginAsync } from './silentLogin';
import timer from './timer';
import type { ResourceAccessToken, ResourceTokenOptions } from './types';

const unavailable = (message: string): OidcError =>
  new OidcError(OidcErrorCode.RESOURCE_TOKEN_UNAVAILABLE, message, {
    phase: 'refresh',
    retryable: false,
  });

interface ResourceTokenContext {
  storage:
    ReturnType<typeof initSession> | NonNullable<Awaited<ReturnType<typeof initWorkerAsync>>>;
  tokens: Tokens | null;
  server: Awaited<ReturnType<Oidc['initAsync']>>;
  isWorker: boolean;
  resourceContexts: string[];
}

export class ResourceTokens {
  private readonly pending = new Map<string, Promise<ResourceAccessToken>>();
  private readonly cached = new Map<string, Tokens>();
  private readonly generations = new Map<string, number>();
  private generation = 0;
  private refreshQueue: Promise<unknown> = Promise.resolve();
  private readonly renewalTimers = new Map<string, ReturnType<typeof timer.setTimeout>>();

  constructor(private readonly oidc: Oidc) {}

  private async contextAsync(resource?: string): Promise<ResourceTokenContext> {
    const { oidc } = this;
    const name = resourceContextName(oidc.configurationName, resource);
    const server = await oidc.initAsync(
      oidc.configuration.authority,
      oidc.configuration.authority_configuration,
    );
    const worker = await initWorkerAsync(oidc.configuration, name);
    const session = initSession(
      name,
      oidc.configuration.storage,
      oidc.configuration.login_state_storage ?? oidc.configuration.storage,
    );
    const result = worker
      ? await worker.initAsync(server, 'resource-token', oidc.configuration)
      : await session.initAsync();
    const resourceContexts: string[] = [];
    if ('resourceContexts' in result && result.resourceContexts !== undefined) {
      if (
        !Array.isArray(result.resourceContexts) ||
        result.resourceContexts.some((value: unknown) => typeof value !== 'string')
      ) {
        throw unavailable('The worker returned invalid resource context metadata.');
      }
      resourceContexts.push(...result.resourceContexts);
    }
    return {
      storage: worker ?? session,
      tokens: result.tokens as Tokens | null,
      server,
      isWorker: worker !== null,
      resourceContexts,
    };
  }

  private validate(
    resource: string,
    tokens: Tokens,
    issuer: string,
    subject: string | undefined = this.oidc.tokens?.idTokenPayload?.sub,
  ): void {
    const { oidc } = this;
    const configuration = getResourceConfiguration(oidc.configuration.resources, resource);
    const context = tokens.resourceContext;
    if (
      !context ||
      context.resource !== resource ||
      context.issuer !== issuer ||
      context.clientId !== oidc.configuration.client_id ||
      context.configurationName !== oidc.configurationName ||
      context.subject !== subject
    ) {
      throw new OidcError(
        OidcErrorCode.RESOURCE_CONTEXT_MISMATCH,
        'The token does not belong to this resource and OIDC session.',
        { phase: 'refresh', retryable: false },
      );
    }
    const payload = tokens.accessTokenPayload;
    if (
      (payload?.iss !== undefined && payload.iss !== issuer) ||
      (payload &&
        configuration.audiences &&
        !configuration.audiences.some(audience =>
          (typeof payload.aud === 'string'
            ? [payload.aud]
            : Array.isArray(payload.aud)
              ? payload.aud
              : []
          ).includes(audience),
        ))
    ) {
      throw new OidcError(
        OidcErrorCode.RESOURCE_CONTEXT_MISMATCH,
        'Resource token issuer or configured audience does not match.',
        { phase: 'refresh', retryable: false },
      );
    }
    if (
      typeof tokens.accessToken !== 'string' ||
      !tokens.accessToken ||
      !Number.isFinite(tokens.expiresAt) ||
      !Number.isFinite(tokens.issuedAt) ||
      (tokens.refreshToken != null &&
        (typeof tokens.refreshToken !== 'string' || !tokens.refreshToken))
    ) {
      throw unavailable('The provider did not return a usable resource token response.');
    }
    if (
      configuration.scope &&
      !configuration.scope
        .split(/\s+/)
        .filter(Boolean)
        .every(scope => (tokens.scope ?? '').split(/\s+/).includes(scope))
    ) {
      throw unavailable('The provider did not grant the required resource scopes.');
    }
  }

  private publicToken(resource: string, tokens: Tokens): ResourceAccessToken {
    return {
      resource,
      issuer: tokens.resourceContext!.issuer,
      clientId: this.oidc.configuration.client_id,
      configurationName: this.oidc.configurationName,
      accessToken: tokens.accessToken,
      expiresAt: tokens.expiresAt,
      scope: tokens.scope,
      tokenType: tokens.tokenType,
    };
  }

  private updateSharedRefreshToken(tokens: Tokens, isWorker: boolean): void {
    if (typeof tokens.refreshToken !== 'string' || !tokens.refreshToken || !this.oidc.tokens)
      return;
    this.oidc.tokens = { ...this.oidc.tokens, refreshToken: tokens.refreshToken };
    if (!isWorker)
      initSession(this.oidc.configurationName, this.oidc.configuration.storage).setTokens(
        this.oidc.tokens,
      );
  }

  private scheduleRenewal(resource: string, tokens: Tokens): void {
    const previous = this.renewalTimers.get(resource);
    if (previous) timer.clearTimeout(previous);
    if (this.oidc.configuration.token_automatic_renew_mode === 'AutomaticOnlyWhenFetchExecuted')
      return;
    const delay = Math.max(
      1000,
      Math.min(
        2147483647,
        (tokens.expiresAt - Date.now() / 1000 - this.renewalMargin(tokens)) * 1000,
      ),
    );
    const timeout = timer.setTimeout(async () => {
      this.renewalTimers.delete(resource);
      try {
        await this.getAccessTokenAsync(resource, { forceRenew: true });
      } catch (error) {
        console.error(
          'Resource renewal failed:',
          isOidcError(error) ? error.code : 'unexpected error',
        );
      }
    }, delay);
    this.renewalTimers.set(resource, timeout);
  }

  private renewalMargin(tokens: Tokens): number {
    return Math.min(
      this.oidc.configuration.refresh_time_before_tokens_expiration_in_second,
      Math.max(0, (tokens.expiresAt - tokens.issuedAt) / 2),
    );
  }

  async withRefreshLockAsync<T>(operation: () => Promise<T>): Promise<T> {
    const execute = async (): Promise<T> => {
      if (navigator.locks) {
        const configuration = this.oidc.configuration;
        return navigator.locks.request(
          `${configuration.client_id}_${this.oidc.configurationName}_${configuration.authority}`,
          operation,
        );
      }
      return operation();
    };
    const result = this.refreshQueue.then(execute, execute);
    this.refreshQueue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  async acceptAuthorizationAsync(resource: string, tokens: Tokens): Promise<void> {
    const generation = this.generation;
    const resourceGeneration = this.generations.get(resource) ?? 0;
    const context = await this.contextAsync(resource);
    const parent = await this.contextAsync();
    if (
      generation !== this.generation ||
      resourceGeneration !== (this.generations.get(resource) ?? 0)
    )
      throw unavailable('The resource authorization was cleared.');
    const subject = tokens.idTokenPayload?.sub;
    if (
      typeof subject !== 'string' ||
      (this.oidc.tokens?.idTokenPayload?.sub ?? parent.tokens?.idTokenPayload?.sub) !== subject
    ) {
      throw new OidcError(
        OidcErrorCode.RESOURCE_CONTEXT_MISMATCH,
        'Resource authorization must preserve the authenticated subject.',
        { phase: 'callback', retryable: false },
      );
    }
    if (tokens.refreshToken && tokens.refreshToken === parent.tokens?.refreshToken) {
      throw unavailable(
        'The provider reused a refresh token across separate authorization transactions; use a multi-resource authorization grant instead.',
      );
    }
    const entry: Tokens = {
      ...tokens,
      scope:
        tokens.scope ??
        getResourceConfiguration(this.oidc.configuration.resources, resource).scope ??
        this.oidc.configuration.scope,
      resourceContext: {
        resource,
        issuer: context.server.issuer,
        clientId: this.oidc.configuration.client_id,
        configurationName: this.oidc.configurationName,
        subject,
        grantResource: resource,
      },
    };
    this.validate(resource, entry, context.server.issuer, subject);
    if (!context.isWorker)
      initSession(
        resourceContextName(this.oidc.configurationName, resource),
        this.oidc.configuration.storage,
      ).setTokens(entry);
    this.cached.set(resource, entry);
  }

  getAccessTokenAsync(
    resource: string,
    options: ResourceTokenOptions = {},
  ): Promise<ResourceAccessToken> {
    const existing = this.pending.get(resource);
    if (existing) return existing;
    const generation = this.generation;
    const resourceGeneration = this.generations.get(resource) ?? 0;
    const subject = this.oidc.tokens?.idTokenPayload?.sub;
    const sessionNonce = this.oidc.tokens?.idTokenPayload?.nonce;
    const isCurrent = (): boolean =>
      this.generation === generation &&
      (this.generations.get(resource) ?? 0) === resourceGeneration &&
      !this.oidc.isLoggingOut &&
      this.oidc.tokens?.idTokenPayload?.sub === subject &&
      this.oidc.tokens?.idTokenPayload?.nonce === sessionNonce;
    const operation = this.withRefreshLockAsync(async () => {
      const { oidc } = this;
      const configuration = getResourceConfiguration(oidc.configuration.resources, resource);
      if (
        !Number.isFinite(oidc.configuration.refresh_time_before_tokens_expiration_in_second) ||
        oidc.configuration.refresh_time_before_tokens_expiration_in_second < 0
      ) {
        throw unavailable('Configure a finite, non-negative renewal margin.');
      }
      if (!oidc.tokens || typeof oidc.tokens.idTokenPayload?.sub !== 'string' || !isCurrent()) {
        throw unavailable('Sign in before requesting a resource token.');
      }
      if (
        oidc.configuration.token_request_extras?.resource !== undefined &&
        oidc.configuration.token_request_extras.resource !== resource
      ) {
        throw new OidcError(
          OidcErrorCode.INVALID_RESOURCE,
          'Token extras conflict with the selected resource.',
          { phase: 'refresh', retryable: false },
        );
      }
      let context = await this.contextAsync(resource);
      const parent = await this.contextAsync();
      if (!isCurrent()) throw unavailable('The resource transaction was cleared.');
      const parentNonce = parent.tokens?.idTokenPayload?.nonce;
      if (
        !parent.tokens ||
        parent.tokens.idTokenPayload?.sub !== subject ||
        (!parent.isWorker && parentNonce !== oidc.tokens.idTokenPayload?.nonce)
      ) {
        throw unavailable(
          'The original OIDC session changed or is unavailable; restore it before requesting resource tokens.',
        );
      }
      let tokens = context.tokens;
      if (tokens) {
        this.validate(resource, tokens, context.server.issuer);
        if (!options.forceRenew && isTokensValid(tokens, this.renewalMargin(tokens))) {
          const previous = this.cached.get(resource);
          this.cached.set(resource, tokens);
          this.scheduleRenewal(resource, tokens);
          if (
            previous?.accessToken !== tokens.accessToken ||
            previous?.expiresAt !== tokens.expiresAt ||
            previous?.scope !== tokens.scope ||
            previous?.tokenType !== tokens.tokenType
          ) {
            oidc.publishEvent(eventNames.resource_token_acquired, { resource });
          }
          return this.publicToken(resource, tokens);
        }
      }
      const configuredResources =
        typeof oidc.configuration.resource === 'string'
          ? [oidc.configuration.resource]
          : (oidc.configuration.resource ?? []);
      const grantedScopes = (parent.tokens.scope ?? oidc.configuration.scope).split(/\s+/);
      const scopeWithinGrant =
        !configuration.scope ||
        configuration.scope
          .split(/\s+/)
          .filter(Boolean)
          .every(scope => grantedScopes.includes(scope));
      const grantResource = tokens?.resourceContext
        ? tokens.resourceContext.grantResource
        : configuredResources.includes(resource) && scopeWithinGrant
          ? null
          : resource;
      const source = grantResource === null ? await this.contextAsync() : context;
      const refreshToken =
        grantResource === null && !scopeWithinGrant ? undefined : source.tokens?.refreshToken;
      const isDpop =
        oidc.configuration.demonstrating_proof_of_possession ||
        source.tokens?.tokenType?.toLowerCase() === 'dpop';
      if (!isCurrent()) throw unavailable('The resource transaction was cleared.');
      if (refreshToken) {
        const nonce = await source.storage.getNonceAsync();
        const headers: Record<string, string> = context.isWorker
          ? { [RESOURCE_TOKEN_REQUEST_HEADER]: encodeURIComponent(resource) }
          : {};
        if (isDpop) {
          headers.DPoP = await this.generateProofAsync(resource, {
            accessToken: source.tokens.accessToken,
            url: context.server.tokenEndpoint,
            method: 'POST',
            grantResource,
          });
        }
        const details = {
          client_id: oidc.configuration.client_id,
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          resource,
          ...(configuration.scope ? { scope: configuration.scope } : {}),
        };
        const request = () =>
          performTokenRequestAsync(oidc.getFetch())(
            context.server.tokenEndpoint,
            details,
            oidc.configuration.token_request_extras ?? {},
            tokens,
            headers,
            TokenRenewMode.access_token_invalid,
            oidc.configuration.token_request_timeout,
          );
        let response = await request();
        if (
          !response.success &&
          response.oauthError === 'use_dpop_nonce' &&
          response.demonstratingProofOfPossessionNonce &&
          isDpop
        ) {
          await source.storage.setDemonstratingProofOfPossessionNonce(
            response.demonstratingProofOfPossessionNonce,
          );
          headers.DPoP = await this.generateProofAsync(resource, {
            accessToken: source.tokens.accessToken,
            url: context.server.tokenEndpoint,
            method: 'POST',
            grantResource,
          });
          response = await request();
        }
        if (response.success) {
          const currentParent = await this.contextAsync();
          if (
            !currentParent.tokens ||
            currentParent.tokens.idTokenPayload?.sub !== subject ||
            (!currentParent.isWorker && currentParent.tokens.idTokenPayload?.nonce !== parentNonce)
          ) {
            throw unavailable('The original OIDC session changed during resource renewal.');
          }
          tokens = response.data;
          const isSameSession =
            this.generation === generation &&
            oidc.tokens?.idTokenPayload?.sub === subject &&
            oidc.tokens?.idTokenPayload?.nonce === sessionNonce;
          if (isSameSession && grantResource === null)
            this.updateSharedRefreshToken(tokens, context.isWorker);
          if (tokens.idTokenPayload?.sub !== undefined && tokens.idTokenPayload.sub !== subject) {
            throw new OidcError(
              OidcErrorCode.RESOURCE_CONTEXT_MISMATCH,
              'Resource renewal changed the authenticated subject.',
              { phase: 'refresh', retryable: false },
            );
          }
          const valid = isTokensOidcValid(tokens, nonce?.nonce, context.server);
          if (!valid.isValid) throw unavailable(valid.reason);
          tokens = {
            ...tokens,
            scope:
              tokens.scope ??
              configuration.scope ??
              source.tokens.scope ??
              oidc.configuration.scope,
            resourceContext: {
              resource,
              issuer: context.server.issuer,
              clientId: oidc.configuration.client_id,
              configurationName: oidc.configurationName,
              subject,
              grantResource,
            },
          };
          this.validate(resource, tokens, context.server.issuer, subject);
          if (!isCurrent()) {
            if (isSameSession) {
              if (
                oidc.isLoggingOut &&
                resourceGeneration === (this.generations.get(resource) ?? 0) &&
                !context.isWorker
              ) {
                initSession(
                  resourceContextName(oidc.configurationName, resource),
                  oidc.configuration.storage,
                ).setTokens(tokens);
              }
            }
            throw unavailable('The resource transaction was cleared.');
          }
          if (response.demonstratingProofOfPossessionNonce)
            await source.storage.setDemonstratingProofOfPossessionNonce(
              response.demonstratingProofOfPossessionNonce,
            );
          if (!context.isWorker) {
            initSession(
              resourceContextName(oidc.configurationName, resource),
              oidc.configuration.storage,
            ).setTokens(tokens);
          }
          if (grantResource === null) this.updateSharedRefreshToken(tokens, context.isWorker);
        } else if (response.oauthError !== 'invalid_grant') {
          throw createOAuthError(
            response.oauthError,
            response.oauthErrorDescription,
            'Resource token request failed.',
            'refresh',
            response.status,
          );
        } else {
          tokens = null;
        }
      } else {
        tokens = null;
      }
      if (!tokens) {
        if (!isCurrent()) throw unavailable('The resource transaction was cleared.');
        const scope = configuration.scope
          ? [...new Set(['openid', ...configuration.scope.split(' ')])].join(' ')
          : oidc.configuration.scope;
        const response = await _silentLoginAsync(
          oidc.configurationName,
          oidc.configuration,
          oidc.publishEvent.bind(oidc),
          'refresh',
        )(
          {
            ...oidc.configuration.extras,
            prompt: 'none',
            resource,
            [RESOURCE_LOGIN_PARAMETER]: resource,
          },
          null,
          scope,
        );
        if (!response)
          throw unavailable(
            'Configure silent_redirect_uri and silent_login_uri for resource authorization.',
          );
        if (response.error)
          throw (
            response.oidcError ??
            createOAuthError(
              response.error,
              undefined,
              'Resource silent authorization failed.',
              'refresh',
            )
          );
        if (!isCurrent() || response.resource !== resource)
          throw unavailable('The resource authorization transaction is no longer current.');
        await this.acceptAuthorizationAsync(resource, response.tokens);
        context = await this.contextAsync(resource);
        tokens = context.tokens ?? this.cached.get(resource);
      }
      if (!isCurrent()) throw unavailable('The resource transaction was cleared.');
      this.validate(resource, tokens, context.server.issuer);
      if (!isTokensValid(tokens)) throw unavailable('The resource access token is expired.');
      this.cached.set(resource, tokens);
      this.scheduleRenewal(resource, tokens);
      oidc.publishEvent(eventNames.resource_token_acquired, { resource });
      return this.publicToken(resource, tokens);
    });
    const result = operation
      .catch(cause => {
        const error = isOidcError(cause)
          ? cause
          : isNetworkErrorCause(cause)
            ? createNetworkError(cause, 'refresh')
            : new OidcError(
                OidcErrorCode.RESOURCE_TOKEN_UNAVAILABLE,
                cause instanceof Error ? cause.message : 'Resource token acquisition failed.',
                { phase: 'refresh', retryable: false, cause },
              );
        this.oidc.publishEvent(eventNames.resource_token_error, { resource, error });
        throw error;
      })
      .finally(() => {
        if (this.pending.get(resource) === result) this.pending.delete(resource);
      });
    this.pending.set(resource, result);
    return result;
  }

  async generateProofAsync(
    resource: string,
    input: { accessToken: string; url: string; method: string; grantResource?: string | null },
  ): Promise<string> {
    const cachedContext = this.cached.get(resource)?.resourceContext;
    const grantResource =
      input.grantResource === undefined
        ? cachedContext
          ? cachedContext.grantResource
          : resource
        : input.grantResource;
    const context = await this.contextAsync(grantResource ?? undefined);
    if (context.isWorker)
      return `DPOP_SECURED_BY_OIDC_SERVICE_WORKER_${resourceContextName(this.oidc.configurationName, resource)}`;
    const key = await context.storage.getDemonstratingProofOfPossessionJwkAsync();
    if (!key) throw unavailable('The resource DPoP grant key is unavailable.');
    const nonce =
      input.url === context.server.tokenEndpoint
        ? await context.storage.getDemonstratingProofOfPossessionNonce()
        : initSession(
            resourceContextName(this.oidc.configurationName, resource),
            this.oidc.configuration.storage,
          ).getDemonstratingProofOfPossessionApiNonce();
    return generateJwtDemonstratingProofOfPossessionAsync(window)(
      this.oidc.configuration.demonstrating_proof_of_possession_configuration,
    )(key, input.method, input.url, {
      ath: await base64urlOfHashOfASCIIEncodingAsync(input.accessToken),
      ...(nonce ? { nonce } : {}),
    });
  }

  peek(resource: string): ResourceAccessToken | null {
    if (this.oidc.isLoggingOut) return null;
    const tokens = this.cached.get(resource);
    return tokens &&
      tokens.resourceContext?.subject === this.oidc.tokens?.idTokenPayload?.sub &&
      isTokensValid(tokens)
      ? this.publicToken(resource, tokens)
      : null;
  }

  createApiNonceRecorder(resource: string): (nonce: string) => Promise<void> {
    const generation = this.generation;
    const resourceGeneration = this.generations.get(resource) ?? 0;
    return async (nonce: string): Promise<void> => {
      if (
        generation !== this.generation ||
        resourceGeneration !== (this.generations.get(resource) ?? 0) ||
        !this.peek(resource)
      ) {
        console.warn('Ignoring a resource API nonce response after its session was cleared.');
        return;
      }
      if (!this.oidc.configuration.service_worker_relative_url) {
        await initSession(
          resourceContextName(this.oidc.configurationName, resource),
          this.oidc.configuration.storage,
        ).setDemonstratingProofOfPossessionApiNonce(nonce);
      }
    };
  }

  async getTokensToRevokeAsync(): Promise<Tokens[]> {
    if (!this.oidc.configuration.resources?.length) return [];
    const base = await this.contextAsync();
    const resources = base.isWorker
      ? base.resourceContexts
          .map(getContextResource)
          .filter((resource): resource is string => resource !== undefined)
      : this.oidc.configuration.resources.map(configuration => configuration.resource);
    const entries: Tokens[] = [];
    for (const resource of resources) {
      const context = await this.contextAsync(resource);
      if (context.tokens) {
        this.validate(resource, context.tokens, context.server.issuer);
        entries.push(context.tokens);
      }
    }
    return entries;
  }

  async clearAsync(resource: string): Promise<void> {
    getResourceConfiguration(this.oidc.configuration.resources, resource);
    this.generations.set(resource, (this.generations.get(resource) ?? 0) + 1);
    cancelResourceTransactions(this.oidc.configurationName, resource);
    this.pending.delete(resource);
    this.cached.delete(resource);
    const timeout = this.renewalTimers.get(resource);
    if (timeout) timer.clearTimeout(timeout);
    this.renewalTimers.delete(resource);
    const context = await this.contextAsync(resource);
    await context.storage.clearAsync('LOGGED_OUT');
    context.storage.setLoginParams(null);
    if (!context.isWorker) {
      await initSession(
        resourceContextName(this.oidc.configurationName, resource),
        this.oidc.configuration.storage,
      ).setDemonstratingProofOfPossessionApiNonce(null);
      await Promise.all([
        context.storage.setStateAsync(null),
        context.storage.setCodeVerifierAsync(null),
        context.storage.setNonceAsync(null),
        context.storage.setDemonstratingProofOfPossessionJwkAsync(null),
        context.storage.setDemonstratingProofOfPossessionNonce(null),
      ]);
    }
    this.oidc.publishEvent(eventNames.resource_token_cleared, { resource });
  }

  async clearAllAsync(): Promise<void> {
    this.generation++;
    cancelResourceTransactions(this.oidc.configurationName);
    this.pending.clear();
    this.cached.clear();
    for (const timeout of this.renewalTimers.values()) timer.clearTimeout(timeout);
    this.renewalTimers.clear();
    if (!this.oidc.configuration.service_worker_relative_url) {
      for (const configuration of this.oidc.configuration.resources ?? []) {
        const session = initSession(
          resourceContextName(this.oidc.configurationName, configuration.resource),
          this.oidc.configuration.storage,
          this.oidc.configuration.login_state_storage ?? this.oidc.configuration.storage,
        );
        await session.clearAsync('LOGGED_OUT');
        session.setLoginParams(null);
        await Promise.all([
          session.setStateAsync(null),
          session.setCodeVerifierAsync(null),
          session.setNonceAsync(null),
          session.setDemonstratingProofOfPossessionJwkAsync(null),
          session.setDemonstratingProofOfPossessionNonce(null),
          session.setDemonstratingProofOfPossessionApiNonce(null),
        ]);
      }
    }
  }
}

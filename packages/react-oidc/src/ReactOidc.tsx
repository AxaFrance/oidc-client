import { OidcClient, StringMap, Tokens } from '@axa-fr/oidc-client';
import { useEffect, useState } from 'react';

import { OidcClientLike, tryGetOidcClient } from './oidcClientRegistry.js';

const defaultConfigurationName = 'default';

const hasTokens = (oidc: OidcClientLike | null): boolean => {
  return oidc != null && (oidc as { tokens?: unknown }).tokens != null;
};

const noop = (): void => {
  // No-op when no OIDC client is registered. Documented in the README.
};

const emptyTokensResponse = (): OidcAccessToken & OidcIdToken => ({
  accessToken: null,
  accessTokenPayload: null,
  idToken: null,
  idTokenPayload: null,
});

export const useOidc = (configurationName = defaultConfigurationName) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() =>
    hasTokens(tryGetOidcClient(configurationName)),
  );

  useEffect(() => {
    let isMounted = true;
    const oidc = tryGetOidcClient(configurationName);
    if (!oidc) {
      return;
    }

    const newSubscriptionId = (oidc as OidcClient).subscribeEvents((name: string, _data: any) => {
      if (
        name === OidcClient.eventNames.logout_from_another_tab ||
        name === OidcClient.eventNames.logout_from_same_tab ||
        name === OidcClient.eventNames.token_acquired
      ) {
        if (isMounted) {
          setIsAuthenticated(hasTokens(tryGetOidcClient(configurationName)));
        }
      }
    });
    return () => {
      isMounted = false;
      (oidc as OidcClient).removeEventSubscription(newSubscriptionId);
    };
  }, [configurationName]);

  const login = (
    callbackPath: string | undefined = undefined,
    extras: StringMap | undefined = undefined,
    silentLoginOnly = false,
    scope: string = undefined,
  ) => {
    const oidc = tryGetOidcClient(configurationName) as OidcClient | null;
    if (!oidc) {
      return Promise.resolve();
    }
    return oidc.loginAsync(callbackPath, extras, false, scope, silentLoginOnly);
  };
  const logout = (
    callbackPath: string | null | undefined = undefined,
    extras: StringMap | undefined = undefined,
  ) => {
    const oidc = tryGetOidcClient(configurationName) as OidcClient | null;
    if (!oidc) {
      return Promise.resolve();
    }
    return oidc.logoutAsync(callbackPath, extras);
  };
  const renewTokens = async (
    extras: StringMap | undefined = undefined,
  ): Promise<OidcAccessToken | OidcIdToken> => {
    const oidc = tryGetOidcClient(configurationName) as OidcClient | null;
    if (!oidc) {
      return emptyTokensResponse();
    }
    const tokens = (await oidc.renewTokensAsync(extras)) as unknown as Tokens;

    return {
      // @ts-ignore
      accessToken: tokens?.accessToken ?? null,
      // @ts-ignore
      accessTokenPayload: tokens?.accessTokenPayload ?? null,
      // @ts-ignore
      idToken: tokens?.idToken ?? null,
      // @ts-ignore
      idTokenPayload: tokens?.idTokenPayload ?? null,
    };
  };
  return { login, logout, renewTokens, isAuthenticated };
};

const accessTokenInitialState = {
  accessToken: null,
  accessTokenPayload: null,
  generateDemonstrationOfProofOfPossessionAsync: null,
};

const initTokens = (configurationName: string): OidcAccessToken => {
  const oidc = tryGetOidcClient(configurationName) as OidcClient | null;
  if (oidc && oidc.tokens) {
    const tokens = oidc.tokens;
    return {
      accessToken: tokens.accessToken,
      accessTokenPayload: tokens.accessTokenPayload,
      generateDemonstrationOfProofOfPossessionAsync: oidc.configuration
        ?.demonstrating_proof_of_possession
        ? (url: string, method: string) =>
            oidc.generateDemonstrationOfProofOfPossessionAsync(tokens.accessToken, url, method)
        : null,
    };
  }
  return accessTokenInitialState;
};

export type OidcAccessToken = {
  accessToken?: any;
  accessTokenPayload?: any;
  generateDemonstrationOfProofOfPossessionAsync?: any;
};

function getGenerateDemonstrationOfProofOfPossessionAsync(oidc: OidcClient, tokens: Tokens) {
  return oidc.configuration?.demonstrating_proof_of_possession
    ? (url: string, method: string, extras: StringMap = {}) =>
        oidc.generateDemonstrationOfProofOfPossessionAsync(tokens.accessToken, url, method, extras)
    : null;
}

export const useOidcAccessToken = (configurationName = defaultConfigurationName) => {
  const [state, setAccessToken] = useState<OidcAccessToken>(() => initTokens(configurationName));

  useEffect(() => {
    let isMounted = true;
    const oidc = tryGetOidcClient(configurationName) as OidcClient | null;
    if (!oidc) {
      return;
    }

    const newSubscriptionId = oidc.subscribeEvents((name: string, _data: any) => {
      if (
        name === OidcClient.eventNames.token_renewed ||
        name === OidcClient.eventNames.token_acquired ||
        name === OidcClient.eventNames.logout_from_another_tab ||
        name === OidcClient.eventNames.logout_from_same_tab ||
        name === OidcClient.eventNames.refreshTokensAsync_error ||
        name === OidcClient.eventNames.syncTokensAsync_error
      ) {
        if (isMounted) {
          const tokens = oidc.tokens;
          setAccessToken(
            tokens != null
              ? {
                  accessToken: tokens.accessToken,
                  accessTokenPayload: tokens.accessTokenPayload,
                  generateDemonstrationOfProofOfPossessionAsync:
                    getGenerateDemonstrationOfProofOfPossessionAsync(oidc, tokens),
                }
              : accessTokenInitialState,
          );
        }
      }
    });
    return () => {
      isMounted = false;
      oidc.removeEventSubscription(newSubscriptionId);
    };
  }, [configurationName]);
  return state;
};

const idTokenInitialState = { idToken: null, idTokenPayload: null };

const initIdToken = (configurationName: string): OidcIdToken => {
  const oidc = tryGetOidcClient(configurationName) as OidcClient | null;

  if (oidc && oidc.tokens) {
    const tokens = oidc.tokens;
    return { idToken: tokens.idToken, idTokenPayload: tokens.idTokenPayload };
  }
  return idTokenInitialState;
};

export type OidcIdToken = {
  idToken?: any;
  idTokenPayload?: any;
};

export const useOidcIdToken = (configurationName = defaultConfigurationName) => {
  const [state, setIDToken] = useState<OidcIdToken>(() => initIdToken(configurationName));

  useEffect(() => {
    let isMounted = true;
    const oidc = tryGetOidcClient(configurationName) as OidcClient | null;
    if (!oidc) {
      return;
    }

    const newSubscriptionId = oidc.subscribeEvents((name: string, _data: any) => {
      if (
        name === OidcClient.eventNames.token_renewed ||
        name === OidcClient.eventNames.token_acquired ||
        name === OidcClient.eventNames.logout_from_another_tab ||
        name === OidcClient.eventNames.logout_from_same_tab ||
        name === OidcClient.eventNames.refreshTokensAsync_error ||
        name === OidcClient.eventNames.syncTokensAsync_error
      ) {
        if (isMounted) {
          const tokens = oidc.tokens;
          setIDToken(
            tokens != null
              ? { idToken: tokens.idToken, idTokenPayload: tokens.idTokenPayload }
              : idTokenInitialState,
          );
        }
      }
    });
    return () => {
      isMounted = false;
      oidc.removeEventSubscription(newSubscriptionId);
    };
  }, [configurationName]);
  return state;
};

// Re-exported so callers can use a no-op outside the hooks if needed.
export const __noopForMissingProvider = noop;

import { OidcClient, StringMap, Tokens } from '@axa-fr/oidc-client';
import { useEffect, useState } from 'react';

import { warnMissingConfigurationOnce } from './warnMissingConfiguration.js';

const defaultConfigurationName = 'default';

type GetOidcFn = {
  (configurationName?: string): any;
};

const defaultIsAuthenticated = (getOidc: GetOidcFn, configurationName: string) => {
  let isAuthenticated = false;
  const oidc = getOidc(configurationName);
  if (oidc) {
    isAuthenticated = oidc.tokens != null;
  }
  return isAuthenticated;
};

export const useOidc = (configurationName = defaultConfigurationName) => {
  const getOidc = OidcClient.get;
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() =>
    defaultIsAuthenticated(getOidc, configurationName),
  );

  useEffect(() => {
    let isMounted = true;
    const oidc = getOidc(configurationName);
    // Hooks may be rendered outside of an <OidcProvider> (issue #1679):
    // in that case `oidc` is null and we simply skip event subscription.
    if (!oidc) {
      warnMissingConfigurationOnce(configurationName);
      return undefined;
    }

    const newSubscriptionId = oidc.subscribeEvents((name: string, data: any) => {
      if (
        name === OidcClient.eventNames.logout_from_another_tab ||
        name === OidcClient.eventNames.logout_from_same_tab ||
        name === OidcClient.eventNames.token_acquired
      ) {
        if (isMounted) {
          setIsAuthenticated(defaultIsAuthenticated(getOidc, configurationName));
        }
      }
    });
    return () => {
      isMounted = false;
      oidc.removeEventSubscription(newSubscriptionId);
    };
  }, [configurationName]);

  const login = (
    callbackPath: string | undefined = undefined,
    extras: StringMap | undefined = undefined,
    silentLoginOnly = false,
    scope: string = undefined,
  ): Promise<unknown> => {
    const oidc = getOidc(configurationName);
    if (!oidc) {
      warnMissingConfigurationOnce(configurationName);
      return Promise.resolve();
    }
    return oidc.loginAsync(callbackPath, extras, false, scope, silentLoginOnly);
  };
  const logout = (
    callbackPath: string | null | undefined = undefined,
    extras: StringMap | undefined = undefined,
  ): Promise<void> => {
    const oidc = getOidc(configurationName);
    if (!oidc) {
      warnMissingConfigurationOnce(configurationName);
      return Promise.resolve();
    }
    return oidc.logoutAsync(callbackPath, extras);
  };
  const renewTokens = async (
    extras: StringMap | undefined = undefined,
  ): Promise<OidcAccessToken | OidcIdToken> => {
    const oidc = getOidc(configurationName);
    if (!oidc) {
      warnMissingConfigurationOnce(configurationName);
      return { accessToken: null, accessTokenPayload: null, idToken: null, idTokenPayload: null };
    }
    const tokens = await oidc.renewTokensAsync(extras);

    return {
      // @ts-ignore
      accessToken: tokens.accessToken,
      // @ts-ignore
      accessTokenPayload: tokens.accessTokenPayload,
      // @ts-ignore
      idToken: tokens.idToken,
      // @ts-ignore
      idTokenPayload: tokens.idTokenPayload,
    };
  };
  return { login, logout, renewTokens, isAuthenticated };
};

const accessTokenInitialState = { accessToken: null, accessTokenPayload: null };

const initTokens = (configurationName: string) => {
  const getOidc = OidcClient.get;
  const oidc = getOidc(configurationName);
  if (!oidc) {
    return accessTokenInitialState;
  }
  if (oidc.tokens) {
    const tokens = oidc.tokens;
    return {
      accessToken: tokens.accessToken,
      accessTokenPayload: tokens.accessTokenPayload,
      generateDemonstrationOfProofOfPossessionAsync: oidc.configuration
        .demonstrating_proof_of_possession
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
  return oidc.configuration.demonstrating_proof_of_possession
    ? (url: string, method: string, extras: StringMap = {}) =>
        oidc.generateDemonstrationOfProofOfPossessionAsync(tokens.accessToken, url, method, extras)
    : null;
}

export const useOidcAccessToken = (configurationName = defaultConfigurationName) => {
  const getOidc = OidcClient.get;
  const [state, setAccessToken] = useState<OidcAccessToken>(() => initTokens(configurationName));

  useEffect(() => {
    let isMounted = true;
    const oidc = getOidc(configurationName);
    // No provider in the tree (issue #1679): keep the default token state.
    if (!oidc) {
      warnMissingConfigurationOnce(configurationName);
      return undefined;
    }

    const newSubscriptionId = oidc.subscribeEvents((name: string, data: any) => {
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

const initIdToken = (configurationName: string) => {
  const getOidc = OidcClient.get;
  const oidc = getOidc(configurationName);

  if (!oidc) {
    return idTokenInitialState;
  }
  if (oidc.tokens) {
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
  const getOidc = OidcClient.get;
  const [state, setIDToken] = useState<OidcIdToken>(() => initIdToken(configurationName));

  useEffect(() => {
    let isMounted = true;
    const oidc = getOidc(configurationName);
    // No provider in the tree (issue #1679): keep the default id-token state.
    if (!oidc) {
      warnMissingConfigurationOnce(configurationName);
      return undefined;
    }

    const newSubscriptionId = oidc.subscribeEvents((name: string, data: any) => {
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

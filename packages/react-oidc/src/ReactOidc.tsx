import { OidcClient, StringMap, Tokens } from '@axa-fr/oidc-client';
import { useEffect, useState } from 'react';

const defaultConfigurationName = 'default';

type GetOidcFn = {
  (configurationName?: string): any;
};

const defaultIsAuthenticated = (getOidc: GetOidcFn, configurationName: string) => {
  let isAuthenticated = false;
  const oidc = getOidc(configurationName);
  if (oidc) {
    isAuthenticated = getOidc(configurationName).tokens != null;
  }
  return isAuthenticated;
};

export const useOidc = (configurationName = defaultConfigurationName) => {
  const getOidc = OidcClient.get;
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    defaultIsAuthenticated(getOidc, configurationName),
  );

  useEffect(() => {
    let isMounted = true;
    const oidc = getOidc(configurationName);
    setIsAuthenticated(defaultIsAuthenticated(getOidc, configurationName));

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
  ) => {
    return getOidc(configurationName).loginAsync(
      callbackPath,
      extras,
      false,
      scope,
      silentLoginOnly,
    );
  };
  const logout = (
    callbackPath: string | null | undefined = undefined,
    extras: StringMap | undefined = undefined,
  ) => {
    return getOidc(configurationName).logoutAsync(callbackPath, extras);
  };
  const renewTokens = async (
    extras: StringMap | undefined = undefined,
  ): Promise<OidcAccessToken | OidcIdToken> => {
    const tokens = await getOidc(configurationName).renewTokensAsync(extras);

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
  const [state, setAccessToken] = useState<OidcAccessToken>(initTokens(configurationName));

  useEffect(() => {
    let isMounted = true;
    const oidc = getOidc(configurationName);
    if (oidc.tokens) {
      const tokens = oidc.tokens;
      setAccessToken({
        accessToken: tokens.accessToken,
        accessTokenPayload: tokens.accessTokenPayload,
      });
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
  const [state, setIDToken] = useState<OidcIdToken>(initIdToken(configurationName));

  useEffect(() => {
    let isMounted = true;
    const oidc = getOidc(configurationName);
    if (oidc.tokens) {
      const tokens = oidc.tokens;
      setIDToken({ idToken: tokens.idToken, idTokenPayload: tokens.idTokenPayload });
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

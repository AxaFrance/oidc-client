import {StringMap, OidcClient, OidcLocation} from '@axa-fr/oidc-client';
import { useEffect, useState } from 'react';
import {Tokens} from "@axa-fr/oidc-client/dist/parseTokens";
import OidcRoutes from "./core/routes/OidcRoutes";
import {eventNames} from "@axa-fr/oidc-client/dist/events";

const defaultConfigurationName = 'default';

type GetOidcFn = {
    (configurationName?: string): any;
}

const defaultAuthenticateStatus = (getOidc: GetOidcFn, configurationName: string) : OidcAuthenticateStatus => {
    let isAuthenticated = false;
    const oidc = getOidc(configurationName);
    if (oidc) {
        if(getOidc(configurationName).tokens != null){
            return OidcAuthenticateStatus.Authenticated;
        } else {
            return OidcAuthenticateStatus.Unauthenticated;
        }
    } 
    return OidcAuthenticateStatus.Loading;
};
export enum OidcAuthenticateStatus {
    Unauthenticated= 'Unauthenticated',
    Loading = 'Loading',
    Authenticated= 'Authenticated',
    Authenticating= 'Authenticating',
    AuthenticatingCallback= 'Authenticating callback',
    AuthenticatingError= 'Authenticating error',
    SessionLost= 'Session lost',
    ServiceWorkerNotSupported= 'ServiceWorker not supported',
}

export const useOidc = (configurationName = defaultConfigurationName) => {
    const getOidc = OidcClient.get;
    const [authenticateStatus, setAuthenticateStatus] = useState<OidcAuthenticateStatus>(defaultAuthenticateStatus(getOidc, configurationName));

    useEffect(() => {
        let isMounted = true;
        const oidc = getOidc(configurationName);
        setAuthenticateStatus(defaultAuthenticateStatus(getOidc, configurationName));
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const newSubscriptionId = oidc.subscribeEvents((name: string, data: any) => {
            console.log('useOidc', name, data);
            switch (name) {
                case OidcClient.eventNames.service_worker_not_supported_by_browser:
                    setAuthenticateStatus(OidcAuthenticateStatus.ServiceWorkerNotSupported);
                    return ;
                case OidcClient.eventNames.loginAsync_begin:
                    setAuthenticateStatus(OidcAuthenticateStatus.Authenticating);
                    return ;
                case OidcClient.eventNames.loginCallbackAsync_begin:
                    setAuthenticateStatus(OidcAuthenticateStatus.AuthenticatingCallback);
                    return ;
                case OidcClient.eventNames.loginAsync_error:
                case OidcClient.eventNames.loginCallbackAsync_error:
                    setAuthenticateStatus(OidcAuthenticateStatus.AuthenticatingError);
                    return ;
                case OidcClient.eventNames.refreshTokensAsync_error:
                case OidcClient.eventNames.syncTokensAsync_error:
                    setAuthenticateStatus(OidcAuthenticateStatus.SessionLost);
                    return ;
                default:
                    return ;
            }
        });
        return () => {
            isMounted = false;
            oidc.removeEventSubscription(newSubscriptionId);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [configurationName]);

    const login = (callbackPath:string | undefined = undefined, extras:StringMap = null, silentLoginOnly = false) => {
        return getOidc(configurationName).loginAsync(callbackPath, extras, false, undefined, silentLoginOnly);
    };
    const logout = (callbackPath: string | null | undefined = undefined, extras:StringMap = null) => {
        return getOidc(configurationName).logoutAsync(callbackPath, extras);
    };
    const renewTokens = async (extras: StringMap = null) : Promise<OidcAccessToken | OidcIdToken> => {
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
    return { login, logout, renewTokens, authenticateStatus };
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
            generateDemonstrationOfProofOfPossessionAsync: oidc.configuration.demonstrating_proof_of_possession ? (url:string, method:string) => oidc.generateDemonstrationOfProofOfPossessionAsync(tokens.accessToken, url, method) : null,
        };
    }
    return accessTokenInitialState;
};

export type OidcAccessToken = {
    accessToken?: any;
    accessTokenPayload?: any;
    generateDemonstrationOfProofOfPossessionAsync?: any;
}

function getGenerateDemonstrationOfProofOfPossessionAsync(oidc: OidcClient, tokens: Tokens) {
    return oidc.configuration.demonstrating_proof_of_possession ? (url: string, method: string) => oidc.generateDemonstrationOfProofOfPossessionAsync(tokens.accessToken, url, method) : null;
}

export const useOidcAccessToken = (configurationName = defaultConfigurationName) => {
    const getOidc = OidcClient.get;
    const [state, setAccessToken] = useState<OidcAccessToken>(initTokens(configurationName));

    useEffect(() => {
        let isMounted = true;
        const oidc = getOidc(configurationName);
        if (oidc.tokens) {
            const tokens = oidc.tokens;
            setAccessToken({ accessToken: tokens.accessToken, accessTokenPayload: tokens.accessTokenPayload });
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const newSubscriptionId = oidc.subscribeEvents((name: string, data: any) => {
            if (name === OidcClient.eventNames.token_renewed ||
                name === OidcClient.eventNames.token_aquired ||
                name === OidcClient.eventNames.logout_from_another_tab ||
                name === OidcClient.eventNames.logout_from_same_tab ||
                name === OidcClient.eventNames.refreshTokensAsync_error ||
                name === OidcClient.eventNames.syncTokensAsync_error ||
                name == OidcClient.eventNames.tryKeepExistingSessionAsync_end
            ) {
                if (isMounted) {
                    const tokens = oidc.tokens;
                    setAccessToken(tokens != null ? { 
                        accessToken: tokens.accessToken, 
                        accessTokenPayload: tokens.accessTokenPayload ,
                        generateDemonstrationOfProofOfPossessionAsync: getGenerateDemonstrationOfProofOfPossessionAsync(oidc, tokens),
                    } : accessTokenInitialState);
                }
            }
        });
        return () => {
            isMounted = false;
            oidc.removeEventSubscription(newSubscriptionId);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
}

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
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const newSubscriptionId = oidc.subscribeEvents((name: string, data: any) => {
            if (name === OidcClient.eventNames.token_renewed ||
                name === OidcClient.eventNames.token_aquired ||
                name === OidcClient.eventNames.logout_from_another_tab ||
                name === OidcClient.eventNames.logout_from_same_tab ||
                name === OidcClient.eventNames.refreshTokensAsync_error ||
                name === OidcClient.eventNames.syncTokensAsync_error ||
                name == OidcClient.eventNames.tryKeepExistingSessionAsync_end) {
                if (isMounted) {
                    const tokens = oidc.tokens;
                    setIDToken(tokens != null ? { idToken: tokens.idToken, idTokenPayload: tokens.idTokenPayload } : idTokenInitialState);
                }
            }
        });
        return () => {
            isMounted = false;
            oidc.removeEventSubscription(newSubscriptionId);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [configurationName]);
    return state;
};

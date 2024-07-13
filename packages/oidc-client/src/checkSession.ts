import { CheckSessionIFrame } from './checkSessionIFrame.js';
import Oidc from "./oidc";
import { _silentLoginAsync, SilentLoginResponse } from './silentLogin.js';
import { OidcConfiguration } from './types.js';

 
export const startCheckSessionAsync = (oidc:Oidc, oidcDatabase:any, configuration :OidcConfiguration) => (checkSessionIFrameUri, clientId, sessionState, isSilentSignin = false) => {
    const silentLoginAsync = (extras, state = undefined, scope = undefined):Promise<SilentLoginResponse> => {
        return _silentLoginAsync(oidc.configurationName, configuration, oidc.publishEvent.bind(oidc))(extras, state, scope);
    };

    return new Promise<CheckSessionIFrame>((resolve, reject): void => {
        if (configuration.silent_login_uri && configuration.silent_redirect_uri && configuration.monitor_session && checkSessionIFrameUri && sessionState && !isSilentSignin) {
            const checkSessionCallback = () => {
                oidc.checkSessionIFrame.stop();
                const tokens = oidc.tokens;
                if (tokens === null) {
                    return;
                }
                const idToken = tokens.idToken;
                const idTokenPayload = tokens.idTokenPayload;
                return silentLoginAsync({
                    prompt: 'none',
                    id_token_hint: idToken,
                    scope: configuration.scope || 'openid',
                }).then((silentSigninResponse) => {
                    if(silentSigninResponse.error) {
                        throw new Error(silentSigninResponse.error);
                    }   
                    const iFrameIdTokenPayload = silentSigninResponse.tokens.idTokenPayload;
                    if (idTokenPayload.sub === iFrameIdTokenPayload.sub) {
                        const sessionState = silentSigninResponse.sessionState;
                        oidc.checkSessionIFrame.start(silentSigninResponse.sessionState);
                        if (idTokenPayload.sid === iFrameIdTokenPayload.sid) {
                            console.debug('SessionMonitor._callback: Same sub still logged in at OP, restarting check session iframe; session_state:', sessionState);
                        } else {
                            console.debug('SessionMonitor._callback: Same sub still logged in at OP, session state has changed, restarting check session iframe; session_state:', sessionState);
                        }
                    } else {
                        console.debug('SessionMonitor._callback: Different subject signed into OP:', iFrameIdTokenPayload.sub);
                    }
                     
                }).catch(async (e) => {
                    console.warn('SessionMonitor._callback: Silent login failed, logging out other tabs:', e);
                    for (const [, oidc] of Object.entries(oidcDatabase)) {
                        // @ts-ignore
                        await oidc.logoutOtherTabAsync(configuration.client_id, idTokenPayload.sub);
                    }
                });
            };

            oidc.checkSessionIFrame = new CheckSessionIFrame(checkSessionCallback, clientId, checkSessionIFrameUri);
            oidc.checkSessionIFrame.load().then(() => {
                oidc.checkSessionIFrame.start(sessionState);
                resolve(oidc.checkSessionIFrame);
            }).catch((e) => {
                reject(e);
            });
        } else {
            resolve(null);
        }
    });
};

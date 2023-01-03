import { CheckSessionIFrame } from './checkSessionIFrame';
import { Tokens } from './parseTokens';
import { OidcConfiguration } from './types';

// eslint-disable-next-line @typescript-eslint/ban-types
export const startCheckSessionAsync = (oidcDatabase:any, configuration :OidcConfiguration, checkSessionIFrame: CheckSessionIFrame, silentLoginAsync:Function, tokens?: Tokens) => (checkSessionIFrameUri, clientId, sessionState, isSilentSignin = false) => {
    return new Promise<CheckSessionIFrame>((resolve, reject): void => {
        if (configuration.silent_login_uri && configuration.silent_redirect_uri && configuration.monitor_session && checkSessionIFrameUri && sessionState && !isSilentSignin) {
            const checkSessionCallback = () => {
                checkSessionIFrame.stop();

                if (tokens === null) {
                    return;
                }
                const idToken = tokens.idToken;
                const idTokenPayload = tokens.idTokenPayload;
                silentLoginAsync({
                    prompt: 'none',
                    id_token_hint: idToken,
                    scope: 'openid',
                }).then((silentSigninResponse) => {
                    const iFrameIdTokenPayload = silentSigninResponse.tokens.idTokenPayload;
                    if (idTokenPayload.sub === iFrameIdTokenPayload.sub) {
                        const sessionState = silentSigninResponse.sessionState;
                        checkSessionIFrame.start(silentSigninResponse.sessionState);
                        if (idTokenPayload.sid === iFrameIdTokenPayload.sid) {
                            console.debug('SessionMonitor._callback: Same sub still logged in at OP, restarting check session iframe; session_state:', sessionState);
                        } else {
                            console.debug('SessionMonitor._callback: Same sub still logged in at OP, session state has changed, restarting check session iframe; session_state:', sessionState);
                        }
                    } else {
                        console.debug('SessionMonitor._callback: Different subject signed into OP:', iFrameIdTokenPayload.sub);
                    }
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                }).catch(async (e) => {
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    for (const [key, oidc] of Object.entries(oidcDatabase)) {
                        // @ts-ignore
                        await oidc.logoutOtherTabAsync(this.configuration.client_id, idTokenPayload.sub);
                    }
                });
            };

            checkSessionIFrame = new CheckSessionIFrame(checkSessionCallback, clientId, checkSessionIFrameUri);
            checkSessionIFrame.load().then(() => {
                checkSessionIFrame.start(sessionState);
                resolve(checkSessionIFrame);
            }).catch((e) => {
                reject(e);
            });
        } else {
            resolve(null);
        }
    });
};

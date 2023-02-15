import { eventNames } from './events';
import { Tokens } from './parseTokens';
import { autoRenewTokens } from './renewTokens';
import timer from './timer';
import { OidcConfiguration, StringMap } from './types';
export type SilentLoginResponse = {
    tokens:Tokens;
    sessionState:string;
};

// eslint-disable-next-line @typescript-eslint/ban-types
export const _silentLoginAsync = (configurationName:string, configuration:OidcConfiguration, publishEvent:Function) => (extras:StringMap = null, state:string = null, scope:string = null):Promise<SilentLoginResponse> => {
    if (!configuration.silent_redirect_uri || !configuration.silent_login_uri) {
        return Promise.resolve(null);
    }

    try {
        publishEvent(eventNames.silentLoginAsync_begin, {});
        let queries = '';

        if (state) {
            if (extras == null) {
                extras = {};
            }
            extras.state = state;
        }

        if (scope) {
            if (extras == null) {
                extras = {};
            }
            extras.scope = scope;
        }

        if (extras != null) {
            for (const [key, value] of Object.entries(extras)) {
                if (queries === '') {
                    queries = `?${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
                } else {
                    queries += `&${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
                }
            }
        }
        const link = configuration.silent_login_uri + queries;
        const idx = link.indexOf('/', link.indexOf('//') + 2);
        const iFrameOrigin = link.substr(0, idx);
        const iframe = document.createElement('iframe');
        iframe.width = '0px';
        iframe.height = '0px';

        iframe.id = `${configurationName}_oidc_iframe`;
        iframe.setAttribute('src', link);
        document.body.appendChild(iframe);
        return new Promise((resolve, reject) => {
            try {
                let isResolved = false;
                window.onmessage = (e: MessageEvent<any>) => {
                    if (e.origin === iFrameOrigin &&
                        e.source === iframe.contentWindow
                    ) {
                        const key = `${configurationName}_oidc_tokens:`;
                        const key_error = `${configurationName}_oidc_error:`;
                        const data = e.data;
                        if (data && typeof (data) === 'string') {
                            if (!isResolved) {
                                if (data.startsWith(key)) {
                                    const result = JSON.parse(e.data.replace(key, ''));
                                    publishEvent(eventNames.silentLoginAsync_end, {});
                                    iframe.remove();
                                    isResolved = true;
                                    resolve(result);
                                } else if (data.startsWith(key_error)) {
                                    const result = JSON.parse(e.data.replace(key_error, ''));
                                    publishEvent(eventNames.silentLoginAsync_error, result);
                                    iframe.remove();
                                    isResolved = true;
                                    reject(new Error('oidc_' + result.error));
                                }
                            }
                        }
                    }
                };
                const silentSigninTimeout = configuration.silent_login_timeout;
                setTimeout(() => {
                    if (!isResolved) {
                        publishEvent(eventNames.silentLoginAsync_error, { reason: 'timeout' });
                        iframe.remove();
                        isResolved = true;
                        reject(new Error('timeout'));
                    }
                }, silentSigninTimeout);
            } catch (e) {
                iframe.remove();
                publishEvent(eventNames.silentLoginAsync_error, e);
                reject(e);
            }
        });
    } catch (e) {
        publishEvent(eventNames.silentLoginAsync_error, e);
        throw e;
    }
};

// eslint-disable-next-line @typescript-eslint/ban-types
export const defaultSilentLoginAsync = (window, configurationName, configuration:OidcConfiguration, publishEvent :(string, any)=>void, oidc:any) => (extras:StringMap = null, scope:string = undefined) => {
    extras = { ...extras };

    const silentLoginAsync = (extras, state, scope) => {
        return _silentLoginAsync(configurationName, configuration, publishEvent.bind(oidc))(extras, state, scope);
    };

    const loginLocalAsync = async () => {
        if (oidc.timeoutId) {
            timer.clearTimeout(oidc.timeoutId);
        }

        let state;
        if (extras && 'state' in extras) {
            state = extras.state;
            delete extras.state;
        }

        try {
            const extraFinal = !configuration.extras ? extras : { ...configuration.extras, ...extras };
            const silentResult = await silentLoginAsync({
                ...extraFinal,
                prompt: 'none',
            }, state, scope);

            if (silentResult) {
                oidc.tokens = silentResult.tokens;
                publishEvent(eventNames.token_aquired, {});
                // @ts-ignore
                oidc.timeoutId = autoRenewTokens(oidc, oidc.tokens.refreshToken, oidc.tokens.expiresAt, extras);
                return {};
            }
        } catch (e) {
            return e;
        }
    };
    return loginLocalAsync();
};

export default defaultSilentLoginAsync;

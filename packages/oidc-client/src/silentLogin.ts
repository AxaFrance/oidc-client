import { eventNames } from './events.js';
import { Tokens } from './parseTokens.js';
import { autoRenewTokens } from './renewTokens.js';
import timer from './timer.js';
import { OidcConfiguration, StringMap } from './types.js';
export type SilentLoginResponse = {
  tokens: Tokens;
  sessionState: string;
  error: string;
};

export type PublishEventFunction = (eventName: string, eventData: any) => void;

export const _silentLoginAsync =
  (
    configurationName: string,
    configuration: OidcConfiguration,
    publishEvent: PublishEventFunction,
  ) =>
  (
    extras: StringMap = null,
    state: string = null,
    scope: string = null,
  ): Promise<SilentLoginResponse> => {
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

      if (scope != null) {
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
      const iFrameOrigin = link.substring(0, idx);
      const iframe = document.createElement('iframe');
      iframe.width = '0px';
      iframe.height = '0px';

      iframe.id = `${configurationName}_oidc_iframe`;
      iframe.setAttribute('src', link);
      document.body.appendChild(iframe);
      return new Promise((resolve, reject) => {
        let isResolved = false;

        const clear = () => {
          window.removeEventListener('message', listener);
          iframe.remove();
          isResolved = true;
        };

        const listener = (e: MessageEvent) => {
          if (e.origin === iFrameOrigin && e.source === iframe.contentWindow) {
            const key = `${configurationName}_oidc_tokens:`;
            const key_error = `${configurationName}_oidc_error:`;
            const key_exception = `${configurationName}_oidc_exception:`;
            const data = e.data;

            if (data && typeof data === 'string') {
              if (!isResolved) {
                if (data.startsWith(key)) {
                  const result = JSON.parse(e.data.replace(key, ''));
                  publishEvent(eventNames.silentLoginAsync_end, {});
                  resolve(result);
                  clear();
                } else if (data.startsWith(key_error)) {
                  const result = JSON.parse(e.data.replace(key_error, ''));
                  publishEvent(eventNames.silentLoginAsync_error, result);
                  resolve({ error: 'oidc_' + result.error, tokens: null, sessionState: null });
                  clear();
                } else if (data.startsWith(key_exception)) {
                  const result = JSON.parse(e.data.replace(key_exception, ''));
                  publishEvent(eventNames.silentLoginAsync_error, result);
                  reject(new Error(result.error));
                  clear();
                }
              }
            }
          }
        };

        try {
          window.addEventListener('message', listener);

          const silentSigninTimeout = configuration.silent_login_timeout;
          setTimeout(() => {
            if (!isResolved) {
              clear();
              publishEvent(eventNames.silentLoginAsync_error, { reason: 'timeout' });
              reject(new Error('timeout'));
            }
          }, silentSigninTimeout);
        } catch (e) {
          clear();
          publishEvent(eventNames.silentLoginAsync_error, e);
          reject(e);
        }
      });
    } catch (e) {
      publishEvent(eventNames.silentLoginAsync_error, e);
      throw e;
    }
  };

export const defaultSilentLoginAsync =
  (
    window,
    configurationName,
    configuration: OidcConfiguration,
    publishEvent: (string, any) => void,
    oidc: any,
  ) =>
  (extras: StringMap = null, scope: string = undefined) => {
    extras = { ...extras };

    const silentLoginAsync = (extras, state, scopeInternal) => {
      return _silentLoginAsync(configurationName, configuration, publishEvent.bind(oidc))(
        extras,
        state,
        scopeInternal,
      );
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
        const silentResult = await silentLoginAsync(
          {
            ...extraFinal,
            prompt: 'none',
          },
          state,
          scope,
        );

        if (silentResult) {
          oidc.tokens = silentResult.tokens;
          publishEvent(eventNames.token_acquired, {});
          // @ts-ignore
          oidc.timeoutId = autoRenewTokens(oidc, oidc.tokens.expiresAt, extras, scope);
          return {};
        }
      } catch (e) {
        return e;
      }
    };
    return loginLocalAsync();
  };

export default defaultSilentLoginAsync;

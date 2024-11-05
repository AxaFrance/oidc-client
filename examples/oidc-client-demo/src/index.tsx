import { OidcClient } from '@axa-fr/oidc-client';

class Router {
  getCustomHistory() {
    const generateKey = () => Math.random().toString(36).substr(2, 6);

    // Exported only for test
    type WindowInternal = Window & {
      CustomEvent?: new <T>(typeArg: string, eventInitDict?: CustomEventInit<T>) => CustomEvent<T>;
      Event: typeof Event;
    };

    type IPrototype = {
      prototype: any;
    };

    type InitCustomEventParams<T = any> = {
      bubbles: boolean;
      cancelable: boolean;
      detail: T;
    };

    // IE Polyfill for CustomEvent
    const CreateEvent =
      (windowInternal: Window, documentInternal: Document) =>
      (event: string, params: InitCustomEventParams): CustomEvent => {
        // @ts-ignore
        if (typeof windowInternal.CustomEvent === 'function') {
          // @ts-ignore
          return new windowInternal.CustomEvent(event, params);
        }
        const paramsToFunction = params || { bubbles: false, cancelable: false, detail: undefined };
        const evt: CustomEvent = documentInternal.createEvent('CustomEvent');
        evt.initCustomEvent(
          event,
          paramsToFunction.bubbles,
          paramsToFunction.cancelable,
          paramsToFunction.detail,
        );
        // @ts-ignore
        (evt as CustomEvent & IPrototype).prototype = windowInternal.Event.prototype;
        return evt;
      };

    type WindowHistoryState = typeof window.history.state;

    type CustomHistory = {
      replaceState(url?: string | null, stateHistory?: WindowHistoryState): void;
    };

    const getHistory = (
      windowInternal: WindowInternal,
      CreateEventInternal: (event: string, params?: InitCustomEventParams) => CustomEvent,
      generateKeyInternal: typeof generateKey,
    ): CustomHistory => {
      return {
        replaceState: (url?: string | null, stateHistory?: WindowHistoryState): void => {
          const key = generateKeyInternal();
          const state = stateHistory || windowInternal.history.state;
          // @ts-ignore
          windowInternal.history.replaceState({ key, state }, null, url);
          windowInternal.dispatchEvent(CreateEventInternal('popstate'));
        },
      };
    };

    // @ts-ignore
    const getCustomHistory = () => getHistory(window, CreateEvent(window, document), generateKey);
    return getCustomHistory();
  }
}

// @ts-ignore
export const execute = () => {
  const router = new Router();

  const root = document.getElementById('root');

  const configuration = {
    client_id: 'interactive.public.short',
    redirect_uri: window.location.origin + '/#/authentication/callback',
    scope: 'openid profile email api offline_access',
    authority: 'https://demo.duendesoftware.com',
    refresh_time_before_tokens_expiration_in_second: 40,
  };

  const href = window.location.href;

  const vanillaOidc = OidcClient.getOrCreate(() => fetch)(configuration);
    
  // @ts-ignore
  function logout() {
    vanillaOidc.logoutAsync();
  }

  console.log(href);

  if (href.includes(configuration.redirect_uri)) {
    // @ts-ignore
    root.innerHTML = `<div>
            <h1>Login demo</h1>
            <h2>Loading callback</h2>
        </div>`;
    vanillaOidc.loginCallbackAsync().then(() => {
      router.getCustomHistory().replaceState('/');
      // @ts-ignore
      root.innerHTML = `<div>
            <h3>Login demo Authenticated</h3>
            <button id="logout">Logout</button>
            <pre>${JSON.stringify(vanillaOidc.tokens, null, '\t')}</pre>
        </div>`;
      // @ts-ignore
      window.document.getElementById('logout').addEventListener('click', logout);
    });
    return;
  }

  vanillaOidc.tryKeepExistingSessionAsync().then(() => {
    const tokens = vanillaOidc.tokens;
    if (tokens) {
      // @ts-ignore
      root.innerHTML = `<div>
            <h3>Login demo Authenticated</h3>
            <button id="logout">Logout</button>
            <pre>${JSON.stringify(tokens, null, '\t')}</pre>
        </div>`;
      // @ts-ignore
      window.document.getElementById('logout').addEventListener('click', logout);
    } else {
      // @ts-ignore
      function login() {
        // @ts-ignore
        root.innerHTML = `<div>
            <h1>Login demo</h1>
            <h2>Loading</h2>
        </div>`;
        vanillaOidc.loginAsync('/');
      }
      // @ts-ignore
      root.innerHTML = `<div>
            <h1>Login demo</h1>
            <button id="login" >Login</button>
        </div>`;
      // @ts-ignore
      document.getElementById('login').addEventListener('click', login);
    }
  });
};

execute();

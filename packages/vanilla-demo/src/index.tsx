import { VanillaOidc } from '@axa-fr/vanilla-oidc';
class Router
{    getCustomHistory(){
        const generateKey = () =>
            Math.random()
                .toString(36)
                .substr(2, 6);

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
        const CreateEvent = (windowInternal: Window, documentInternal: Document) => (
            event: string,
            params: InitCustomEventParams,
        ): CustomEvent => {
            // @ts-ignore
            if (typeof windowInternal.CustomEvent === 'function') {
                // @ts-ignore
                return new windowInternal.CustomEvent(event, params);
            }
            const paramsToFunction = params || { bubbles: false, cancelable: false, detail: undefined };
            const evt: CustomEvent = documentInternal.createEvent('CustomEvent');
            evt.initCustomEvent(event, paramsToFunction.bubbles, paramsToFunction.cancelable, paramsToFunction.detail);
            // @ts-ignore
            (evt as CustomEvent & IPrototype).prototype = windowInternal.Event.prototype;
            return evt;
        };

        type WindowHistoryState = typeof window.history.state;

        type CustomHistory = {
            replaceState(url?: string | null, stateHistory?: WindowHistoryState): void;
        }

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

const router = new Router();

document.body.innerHTML = `<div id="my-vanilla-app"></div>`;
const element = document.getElementById("my-vanilla-app");

export const configuration = {
    client_id: 'interactive.public.short',
    redirect_uri: window.location.origin + '/#/authentication/callback',
    silent_redirect_uri: window.location.origin + '/#/authentication/silent-callback',
    scope: 'openid profile email api offline_access',
    authority: 'https://demo.duendesoftware.com',
    refresh_time_before_tokens_expiration_in_second: 40,
    service_worker_relative_url:'/OidcServiceWorker.js',
    service_worker_only: false,
    // monitor_session: true,
};

navigator.serviceWorker.register('main-service-worker.js')
  // wip: let's wait 1s, to test what happens if our service worker loads earlier, before any axa-oidc stuff runs
  .then(() => new Promise(r => setTimeout(r, 1000))).then(() => {
  const href = window.location.href;

  const vanillaOidc = VanillaOidc.getOrCreate(() => fetch)(configuration);
  
  console.log(href);
  
  
  vanillaOidc.tryKeepExistingSessionAsync().then(() => {
      if(href.includes(configuration.redirect_uri)){
          // @ts-ignore
          element.innerHTML = `<div>
              <h1>@axa-fr/vanilla-oidc demo</h1>
              <h2>Loading callback</h2>
          </div>`;
          vanillaOidc.loginCallbackAsync().then(()=>{
              router.getCustomHistory().replaceState("/");
              // @ts-ignore
              window.logout = () =>  vanillaOidc.logoutAsync();
              let tokens = vanillaOidc.tokens;
              // @ts-ignore
              element.innerHTML = `<div>
              <h1>@axa-fr/vanilla-oidc demo</h1>
              <button onclick="window.logout()">Logout</button>
              <h2>Authenticated</h2>
              <pre>${JSON.stringify(tokens,null,'\t')}</pre>
          </div>`
          });
          return
      }
  
      let tokens = vanillaOidc.tokens;
  
      if(tokens){
  
          // @ts-ignore
          window.logout = () =>  vanillaOidc.logoutAsync();
          // @ts-ignore
          element.innerHTML = `<div>
              <h1>@axa-fr/vanilla-oidc demo</h1>
              <button onclick="window.logout()">Logout</button>
              <h2>Authenticated</h2>
              <pre>${JSON.stringify(tokens,null,'\t')}</pre>
          </div>`
          
      }
      else {
          // @ts-ignore
          window.login= () =>  {
              // @ts-ignore
              element.innerHTML = `<div>
              <h1>@axa-fr/vanilla-oidc demo</h1>
              <h2>Loading</h2>
          </div>`;
              vanillaOidc.loginAsync("/")
          };
          // @ts-ignore
          element.innerHTML = `<div>
              <h1>@axa-fr/vanilla-oidc demo</h1>
              <button onclick="window.login()">Login</button>
          </div>`
      }
  })
});


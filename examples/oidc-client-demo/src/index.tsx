import {OidcClient} from "@axa-fr/oidc-client";

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

// @ts-ignore
export const execute = () => {

    const router = new Router();

    const element = document.getElementById("root");

    const configuration = {
        client_id: 'interactive.public.short',
        redirect_uri: window.location.origin + '/#/authentication/callback',
        silent_redirect_uri: window.location.origin + '/#/authentication/silent-callback',
        scope: 'openid profile email api offline_access',
        authority: 'https://demo.duendesoftware.com',
        refresh_time_before_tokens_expiration_in_second: 40,
        service_worker_relative_url:'/OidcServiceWorker.js',
        service_worker_only: true,
    };

    const href = window.location.href;

    const vanillaOidc = OidcClient.getOrCreate(() => fetch)(configuration);

    console.log(href);

    if(href.includes(configuration.redirect_uri)){
        // @ts-ignore
        element.innerHTML = `<div>
            <h1>@axa-fr/oidc-client demo</h1>
            <h2>Loading callback</h2>
        </div>`;
        vanillaOidc.loginCallbackAsync().then(()=>{
            router.getCustomHistory().replaceState("/");
            // @ts-ignore
            function logout() {
                vanillaOidc.logoutAsync();
            }
            const tokens = vanillaOidc.tokens;
            // @ts-ignore
            element.innerHTML = `<div>
            <h1>@axa-fr/oidc-client demo</h1>
            <button id="logout" >Logout</button>
            <h2>Authenticated</h2>
            <pre>${JSON.stringify(tokens,null,'\t')}</pre>
        </div>`;

            // @ts-ignore
            window.document.getElementById('logout').addEventListener('click',logout);
        });
    }

    vanillaOidc.tryKeepExistingSessionAsync().then(() => {
        const tokens = vanillaOidc.tokens;
        if(tokens){

            // @ts-ignore
            function logout () {
                vanillaOidc.logoutAsync();
            }
            // @ts-ignore
            element.innerHTML = `<div>
            <h1>@axa-fr/oidc-client demo</h1>
            <button id="logout">Logout</button>
            <p>Game, let's try to make an XSS attacks to retrieve original tokens !</p>
            <p>You may think servcie worker mode is not secure like said here <a href="https://datatracker.ietf.org/doc/html/draft-ietf-oauth-browser-based-apps#payload-new-flow">https://datatracker.ietf.org/doc/html/draft-ietf-oauth-browser-based-apps#payload-new-flow</a>
            So let try to hack it !
            In fact it can be prevented by using the following CSP header to forbid to write dynamic iframe with javascript dynamic inside:
            <pre>
            Content-Security-Policy: script-src 'self'
            </pre>
            and setting up the redirect_uri and redirect_silent_uri at the top level of your javascript application before any XSS attack could accur.
            Security is always good a cursor level to adjsut and a set of good practices.
            </p>
            <textarea id="xsshack">alert('XSS');</textarea>
            <button id="buttonxsshack" >Hack</button>
            <h2>Authenticated</h2>
            <pre>${JSON.stringify(tokens,null,'\t')}</pre>
            
        </div>`;
            // @ts-ignore
            window.document.getElementById('logout').addEventListener('click',logout);
            // @ts-ignore
            window.document.getElementById('buttonxsshack').addEventListener('click',()=> {
                // @ts-ignore
                eval(document.getElementById('xsshack').value)
            });

        }
        else {
            // @ts-ignore
            function login()  {
                // @ts-ignore
                element.innerHTML = `<div>
            <h1>@axa-fr/oidc-client demo</h1>
            <h2>Loading</h2>
        </div>`;
                vanillaOidc.loginAsync("/");
            }

            // @ts-ignore
            element.innerHTML = `<div>
            <h1>@axa-fr/oidc-client demo</h1>
            <button id="login" >Login</button>
        </div>`;
            // @ts-ignore
            document.getElementById('login').addEventListener('click',login);
        }
    });

};

execute();
import { OidcClient } from '@axa-fr/oidc-client';
import EC, {JWK, JWT} from './jwt';

const guid = function () {
    // RFC4122: The version 4 UUID is meant for generating UUIDs from truly-random or
    // pseudo-random numbers.
    // The algorithm is as follows:
    //     Set the two most significant bits (bits 6 and 7) of the
    //        clock_seq_hi_and_reserved to zero and one, respectively.
    //     Set the four most significant bits (bits 12 through 15) of the
    //        time_hi_and_version field to the 4-bit version number from
    //        Section 4.1.3. Version4 
    //     Set all the other bits to randomly (or pseudo-randomly) chosen
    //     values.
    // UUID                   = time-low "-" time-mid "-"time-high-and-version "-"clock-seq-reserved and low(2hexOctet)"-" node
    // time-low               = 4hexOctet
    // time-mid               = 2hexOctet
    // time-high-and-version  = 2hexOctet
    // clock-seq-and-reserved = hexOctet: 
    // clock-seq-low          = hexOctet
    // node                   = 6hexOctet
    // Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    // y could be 1000, 1001, 1010, 1011 since most significant two bits needs to be 10
    // y values are 8, 9, A, B
    var guidHolder = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
    var hex = '0123456789abcdef';
    var r = 0;
    var guidResponse = "";
    for (var i = 0; i < 36; i++) {
        if (guidHolder[i] !== '-' && guidHolder[i] !== '4') {
            // each x and y needs to be random
            r = Math.random() * 16 | 0;
        }

        if (guidHolder[i] === 'x') {
            guidResponse += hex[r];
        } else if (guidHolder[i] === 'y') {
            // clock-seq-and-reserved first hex is filtered and remaining hex values are random
            r &= 0x3; // bit and with 0011 to set pos 2 to zero ?0??
            r |= 0x8; // set pos 3 to 1 as 1???
            guidResponse += hex[r];
        } else {
            guidResponse += guidHolder[i];
        }
    }

    return guidResponse;
};

const claims = {
    // https://www.rfc-editor.org/rfc/rfc9449.html#name-concept
    jit: btoa(guid()),
    htm: 'POST',
    htu: 'https://example.com/',
    iat: Math.round(Date.now() / 1000),
    // 
    // ath: 'hash o',
};

// @ts-ignore
EC.generate().then(function(jwk) {
    console.info('Private Key:', JSON.stringify(jwk));
    // @ts-ignore
    console.info('Public Key:', JSON.stringify(EC.neuter(jwk)));

    // @ts-ignore
    return JWK.thumbprint(jwk).then(function(kid) {
        // @ts-ignore
        return JWT.sign(jwk, { /*kid: kid*/ }, claims).then(function(jwt) {
            console.info('JWT:', jwt);
            return jwt;
        });
    });
});


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

const href = window.location.href;

const vanillaOidc = OidcClient.getOrCreate(() => fetch)(configuration);

console.log(href);


vanillaOidc.tryKeepExistingSessionAsync().then(() => {
    if(href.includes(configuration.redirect_uri)){
        // @ts-ignore
        element.innerHTML = `<div>
            <h1>@axa-fr/oidc-client demo</h1>
            <h2>Loading callback</h2>
        </div>`;
        vanillaOidc.loginCallbackAsync().then(()=>{
            router.getCustomHistory().replaceState("/");
            // @ts-ignore
            window.logout = () =>  vanillaOidc.logoutAsync();
            const tokens = vanillaOidc.tokens;
            // @ts-ignore
            element.innerHTML = `<div>
            <h1>@axa-fr/oidc-client demo</h1>
            <button onclick="window.logout()">Logout</button>
            <h2>Authenticated</h2>
            <pre>${JSON.stringify(tokens,null,'\t')}</pre>
        </div>`;
        });
        return;
    }

    const tokens = vanillaOidc.tokens;

    if(tokens){

        // @ts-ignore
        window.logout = () =>  vanillaOidc.logoutAsync();
        // @ts-ignore
        element.innerHTML = `<div>
            <h1>@axa-fr/oidc-client demo</h1>
            <button onclick="window.logout()">Logout</button>
            <h2>Authenticated</h2>
            <pre>${JSON.stringify(tokens,null,'\t')}</pre>
        </div>`;
        
    }
    else {
        // @ts-ignore
        window.login= () =>  {
            // @ts-ignore
            element.innerHTML = `<div>
            <h1>@axa-fr/oidc-client demo</h1>
            <h2>Loading</h2>
        </div>`;
            vanillaOidc.loginAsync("/");
        };
        // @ts-ignore
        element.innerHTML = `<div>
            <h1>@axa-fr/oidc-client demo</h1>
            <button onclick="window.login()">Login</button>
        </div>`;
    }
});


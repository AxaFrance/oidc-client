import { VanillaOidc } from '@axa-fr/vanilla-oidc'

export const configuration = {
    client_id: 'interactive.public.short',
    redirect_uri: window.location.origin + '/authentication/callback',
    silent_redirect_uri: window.location.origin + '/authentication/silent-callback',
    scope: 'openid profile email api offline_access',
    authority: 'https://demo.duendesoftware.com',
    refresh_time_before_tokens_expiration_in_second: 40,
    service_worker_relative_url:'/OidcServiceWorker.js',
    service_worker_only: false,
  //  token_renew_mode : TokenRenewMode.access_token_invalid
};

const href = window.location.href;
const vanillaOidc = VanillaOidc.getOrCreate(configuration);

console.log(href);

vanillaOidc.tryKeepExistingSessionAsync().then(() => {
    if(href.includes(configuration.redirect_uri)){
        vanillaOidc.loginCallbackAsync().then(()=>{
            window.location.href = "/";
        });
    }

    let tokens = vanillaOidc.tokens

    if(tokens){
        document.body.innerHTML = JSON.stringify(tokens);
    }
    else {
        // @ts-ignore
        window.login= () =>  vanillaOidc.loginAsync("/");
        document.body.innerHTML = `<div>
            <button onclick="window.login()">Login</button>
        </div>`
    }
})


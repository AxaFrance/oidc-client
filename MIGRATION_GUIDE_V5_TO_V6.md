# Migrate from v5 to v6

V6 offer a better silent signin and add session monitor feature.

```javascript

// BREAKING CHANGE
export const configuration = {
    ...,
    redirect_uri: window.location.origin+'/authentication/callback', // now this callback must be declared to your OIDC server
    silent_signin_uri: window.location.origin+'/authentication/silent-sign-in', // new property optinal but necessary for a working silent signin 
    ...,
};


// BREAKING CHANGE in OidcTrustedDomains.js
// To increase security in V6 your OIDC server urls must be added to the trusted domains
const trustedDomains = {
    default:["http://localhost:4200", "https://demo.duendesoftware.com"],
    config_classic: ["https://demo.duendesoftware.com"] ,
    config_without_refresh_token: ["https://demo.duendesoftware.com"],
    config_google: ["https://oauth2.googleapis.com", "https://openidconnect.googleapis.com"],
    config_with_hash: ["https://demo.duendesoftware.com"]
};



```

```javascript

// new properties    
export const configurationIdentityServer = {
    ...,
    authority_time_cache_wellknowurl_in_second: 60* 60,
    refresh_time_before_tokens_expiration_in_second: 280,
    monitor_session:true,
};

```

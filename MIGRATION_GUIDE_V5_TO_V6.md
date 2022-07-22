# Migrate from v5 to v6

V6 offer:
- More efficient silent login 
- More robust algorithm in order to keep the session alive
- Add session monitor feature: Monitor session feature allow to logout the same user from all tabs and from all websites where the user is logged to.
- Authority wellknowurl response can be cached inside sessionStorage
- Increase security
- Does not refresh token when refreshing the page if token is still valid

```javascript

// BREAKING CHANGE
export const configuration = {
    ...,
    redirect_uri: window.location.origin+'/authentication/callback', // now this callback must be declared to your OIDC server, manage callback information after login
    silent_login_uri: window.location.origin+'/authentication/silent-login', // new property optional, route that trigger silent signin
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

// New properties    
export const configurationIdentityServer = {
    ...,
    authority_time_cache_wellknowurl_in_second: 60* 60, // Time to cache in second of openid wellknowurl, default is 1 hour
    monitor_session:true, // Add OpenId monitor session, default is true (more information https://openid.net/specs/openid-connect-session-1_0.html)
    onLogoutFromAnotherTab: Function // Optional, can be set to override the default behavior, this function is triggered when user is logout from another tab
};

```

# Migrate from v5 to v6

V6 offer a better silent signin and add session monitor feature.
Monitor session feature allow to logout the same user from all tabs and from all websites where the user is logged to.

```javascript

// BREAKING CHANGE
export const configuration = {
    ...,
    redirect_uri: window.location.origin+'/authentication/callback', // now this callback must be declared to your OIDC server
    silent_signin_uri: window.location.origin+'/authentication/silent-sign-in', // new property optional but necessary for a working silent signin 
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

- redirect_uri: manage callback inforation after login and must be declared to your OIDC server
- silent_signin_uri: route that trigger silent signin

```javascript

// New properties    
export const configurationIdentityServer = {
    ...,
    authority_time_cache_wellknowurl_in_second: 60* 60, // Time to cache in second of openid wellknowurl, default is 1 hour
    monitor_session:true, // Add OpenId monitor session, default is true (more information https://openid.net/specs/openid-connect-session-1_0.html)
    onLogout: Function // Optional, can be set to override the default behavior, this function is triggered when user is logout from another tab
};

```

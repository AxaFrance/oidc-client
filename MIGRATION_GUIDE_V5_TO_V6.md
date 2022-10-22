# Migrating from v5 to v6

[YouTube demo of V6 and an explanation of breaking changes.](https://youtu.be/ReywDegsX-s)

V6 offers:

- Better browser multiple tab management
- More efficient silent login/sign-in.
- More robust algorithm in order to keep the service worker session alive
- Add session monitor feature: Monitor session feature allow to logout the same user from all tabs and from all websites where the user/clientId is logged to.
- [ServiceWorker] Authority wellKnowURL response is cached inside sessionStorage
- [ServiceWorker] Security is increased by adding OIDC URLs to OidcTrustedDomains.js and validate it
- Does not refresh token when refreshing the page if token is still valid

## Package deprecation

If you import the package `@axa-fr/react-oidc-content`, it has been deprecated/renamed to `@axa-fr/react-oidc`.
Using your package manager, remove the old package and replace with the new name.

```javascript

// BREAKING CHANGE
export const configuration = {
    ...,
    redirect_uri: window.location.origin+'/authentication/callback', // now this callback must be declared to your OIDC server, manage callback information after login
    silent_login_uri: window.location.origin+'/authentication/silent-login', // new property optional, route that trigger silent signin
    ...,
};


// BREAKING CHANGE in OidcTrustedDomains.js
// To increase security, in V6 your OIDC server URLs must be added to the trusted domains
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
    onLogoutFromAnotherTab: Function, // Optional, can be set to override the default behavior, this function is triggered when user with the same subject is logged out from another tab when session_monitor is active
    onLogoutFromSameTab: Function, // Optional, can be set to override the default behavior, this function is triggered when user is logged out from same tab when session_monitor is active
    authority_configuration: PropTypes.shape({ // Optional for providers that does not implement OIDC server auto discovery via a .wellknowurl
        ...,
        check_session_iframe: PropTypes.string // Optional, route from OIDC server necessary for monitoring session feature
    }),
};
```

## What next - Roadmap on v6

- Time to clean the code and build clean vanilla OIDC interface library
- Add feature to last edge case
- More documentation

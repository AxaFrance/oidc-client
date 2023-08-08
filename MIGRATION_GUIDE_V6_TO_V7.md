# Migrating from v6 to v7

- Package `@axa-fr/vanilla-oidc` as been renamed to `@axa-fr/oidc-client`
- VanillaOidc class as been renamed to OidcClient
- On version 7.3.0 configuration.service_worker_convert_all_requests_to_cors as been moved to TrustedDomains.js

```javascript

// Service worker will continue to give access token to the JavaScript client
// Ideal to hide refresh token from client JavaScript, but to retrieve access_token for some
// scenarios which require it. For example, to send it via websocket connection.
trustedDomains.config_show_access_token = { 
    domains: ['https://demo.duendesoftware.com'], 
    showAccessToken: true,
    // convertAllRequestsToCorsExceptNavigate: false, // default value is false
    // setAccessTokenToNavigateRequests: true, // default value is true
};

```
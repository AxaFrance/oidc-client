// Add bellow trusted domains, access tokens will automatically injected to be send to
// trusted domain can also be a path like https://www.myapi.com/users,
// then all subroute like https://www.myapi.com/useers/1 will be authorized to send access_token to.

// Domains used by OIDC server must be also declared here
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const trustedDomains = {
    default: ['https://demo.duendesoftware.com', 'https://kdhttps.auth0.com'],
    config_classic: ['https://demo.duendesoftware.com'],
    config_without_silent_login: ['https://demo.duendesoftware.com'],
    config_without_refresh_token: ['https://demo.duendesoftware.com'],
    config_without_refresh_token_silent_login: ['https://demo.duendesoftware.com'],
    config_google: ['https://oauth2.googleapis.com', 'https://openidconnect.googleapis.com'],
    config_with_hash: ['https://demo.duendesoftware.com'],
};

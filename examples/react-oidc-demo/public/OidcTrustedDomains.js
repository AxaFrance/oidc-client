// Add bellow trusted domains, access tokens will automatically injected to be send to
// trusted domain can also be a path like https://www.myapi.com/users,
// then all subroute like https://www.myapi.com/useers/1 will be authorized to send access_token to.
// Domains used by OIDC server must be also declared here
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const trustedDomains = {
  default: ['https://demo.duendesoftware.com', 'https://kdhttps.auth0.com'],
  config_classic: ['https://demo.duendesoftware.com'],
  config_with_monitor_session: ['https://demo.duendesoftware.com'],
  config_without_silent_login: ['https://demo.duendesoftware.com'],
  config_without_refresh_token: ['https://demo.duendesoftware.com'],
  config_without_refresh_token_silent_login: ['https://demo.duendesoftware.com'],
  config_google: [
    'https://oauth2.googleapis.com',
    'https://openidconnect.googleapis.com',
    'https://accounts.google.com',
  ],
  config_with_hash: ['https://demo.duendesoftware.com'],
};
// Service worker will continue to give access token to the JavaScript client
// Ideal to hide refresh token from client JavaScript, but to retrieve access_token for some
// scenarios which require it. For example, to send it via websocket connection.
trustedDomains.config_show_access_token = {
  domains: ['https://demo.duendesoftware.com'],
  showAccessToken: true,
};
// This example defines domains used by OIDC server separately from domains to which access tokens will be injected.
trustedDomains.config_separate_oidc_access_token_domains = {
  oidcDomains: ['https://demo.duendesoftware.com'],
  accessTokenDomains: ['https://myapi'],
};

trustedDomains.config_with_dpop = {
  domains: ['https://demo.duendesoftware.com'],
  demonstratingProofOfPossession: true,
  demonstratingProofOfPossessionOnlyWhenDpopHeaderPresent: false,
  allowMultiTabLogin: true,
};

trustedDomains.config_multi_tab_login = {
  domains: ['https://demo.duendesoftware.com'],
  allowMultiTabLogin: true,
};
//# sourceMappingURL=OidcTrustedDomains.js.map
export const configurationIdentityServer = {
    client_id: 'interactive.public.short', //  interactive.public.short
    redirect_uri: window.location.origin+'/authentication/callback', // http://localhost:4200/authentication/callback
    scope: 'openid profile email api offline_access',
    authority: 'https://demo.identityserver.io',
    refresh_time_before_tokens_expiration_in_second: 70,
    service_worker_relative_url:'/OidcServiceWorker.js',
    service_worker_only: false,
  };

export const configurationAuth0 = {
    client_id: 'xGZxEAJhzlkuQUlWl90y1ntIX-0UDWHx',
    redirect_uri: window.location.origin+'/callback', // http://localhost:4200/callback
    scope: 'openid profile email api offline_access',
    authority: 'https://kdhttps.auth0.com',
    refresh_time_before_tokens_expiration_in_second: 70,
    service_worker_relative_url:'/OidcServiceWorker.js',
    service_worker_only: false,
};


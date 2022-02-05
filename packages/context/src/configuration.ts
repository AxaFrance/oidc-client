let configuration = {
    client_id: 'interactive.public.short',
    redirect_uri: 'http://localhost:5002/authentication/callback',
    scope: 'openid profile email api offline_access',
    authority: 'https://demo.identityserver.io',
    refresh_time_before_tokens_expiration_in_second: 70,
    service_worker_relative_url:'/OidcServiceWorker.js'
  };

export default configuration;

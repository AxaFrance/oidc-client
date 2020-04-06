const configuration = {
  isEnabled: true,
  configurations: [
    {
      origin: 'http://localhost:3000',
      config: {
        client_id: 'spa',
        redirect_uri: 'http://localhost:3000/authentication/callback',
        response_type: 'code',
        post_logout_redirect_uri: 'http://localhost:3000/',
        scope: 'openid profile email api offline_access',
        authority: 'https://demo.identityserver.io',
        silent_redirect_uri: 'http://localhost:3000/authentication/silent_callback',
        automaticSilentRenew: true,
        loadUserInfo: true,
        checkSessionInterval: 60,
      }
    },
    {
      origin: 'http://127.0.0.1:3000',
      config: {
        client_id: 'spa',
        redirect_uri: 'http://127.0.0.1:3000/authentication/callback',
        response_type: 'code',
        post_logout_redirect_uri: 'https://127.0.0.1:3000/',
        scope: 'openid profile email api offline_access',
        authority: 'https://demo.identityserver.io',
        silent_redirect_uri: 'http://127.0.0.1:3000/authentication/silent_callback',
        automaticSilentRenew: true,
        loadUserInfo: true,
      }
    }
  ]
};

export default configuration;

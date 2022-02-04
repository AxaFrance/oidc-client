let configuration = {
    client_id: 'interactive.public.short',
    redirect_uri: 'http://localhost:5002/authentication/callback',
    scope: 'openid profile email api offline_access',
    authority: 'https://demo.identityserver.io',
  };

export default configuration;

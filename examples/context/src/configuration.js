const configuration = {
  client_id: 'implicit',
  redirect_uri: 'http://localhost:3000/authentication/callback',
  response_type: 'id_token token',
  post_logout_redirect_uri: 'http://localhost:3000/',
  scope: 'openid profile email',
  authority: 'https://demo.identityserver.io',
  silent_redirect_uri: 'http://localhost:3000/authentication/silent_callback',
  automaticSilentRenew: true,
  loadUserInfo: true,
  triggerAuthFlow: true
};

export default configuration;

const configuration = {
  isEnabled: true,
  configurations: [
    {
      origin: "http://localhost:3006",
      config: {
        client_id: "CSk26fuOE2NjQr17oCI1bKzBch9eUzF0",
        redirect_uri: "http://localhost:3000/authentication/callback",
        response_type: "id_token token",
        scope: "openid profile email",
        authority: "https://samplesreact.eu.auth0.com",
        silent_redirect_uri:
          "http://localhost:3000/authentication/silent_callback",
        automaticSilentRenew: true,
        loadUserInfo: true,
        triggerAuthFlow: true
      }
    },
    {
      origin: "http://127.0.0.1:3000",
      config: {
        client_id: "CSk26fuOE2NjQr17oCI1bKzBch9eUzF0",
        redirect_uri: "http://127.0.0.1:3000/authentication/callback",
        response_type: "id_token token",
        scope: "openid profile email",
        authority: "https://samplesreact.eu.auth0.com",
        silent_redirect_uri:
          "http://127.0.0.1:3000/authentication/silent_callback",
        automaticSilentRenew: true,
        loadUserInfo: true,
        triggerAuthFlow: true
      }
    }
  ]
};

export default configuration;

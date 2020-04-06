import * as React from 'react';

const NotAuthenticated = () => (
  <div className="oidc-not-authenticated">
    <div className="oidc-not-authenticated__container">
      <h1 className="oidc-not-authenticated__title">Authentification</h1>
      <p className="oidc-not-authenticated__content">Vous n'êtes pas authentifié.</p>
    </div>
  </div>
);

export default NotAuthenticated;

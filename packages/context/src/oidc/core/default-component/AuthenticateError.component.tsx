import * as React from 'react';

const AuthenticatingError = () => (
  <div className="oidc-authenticating">
    <div className="oidc-authenticating__container">
      <h1 className="oidc-authenticating__title">Authentification erreur</h1>
      <p className="oidc-authenticating__content">Une erreur est survenue lors de l'authentification</p>
    </div>
  </div>
);

export default AuthenticatingError;

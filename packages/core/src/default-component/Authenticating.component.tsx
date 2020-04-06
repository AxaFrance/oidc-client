import * as React from 'react';

const Authenticating = () => (
  <div className="oidc-authenticating">
    <div className="oidc-authenticating__container">
      <h1 className="oidc-authenticating__title">Authentification en cours</h1>
      <p className="oidc-authenticating__content">Vous allez être redirigé sur la page de login</p>
    </div>
  </div>
);

export default Authenticating;

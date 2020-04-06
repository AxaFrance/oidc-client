import * as React from 'react';

const NotAuthorized = () => (
  <div className="oidc-not-authorized">
    <div className="oidc-not-authorized__container">
      <h1 className="oidc-not-authorized__title">Autorisation</h1>
      <p className="oidc-not-authorized__content">
        Vous n'êtes pas autorisé à accéder à cette ressource.
      </p>
    </div>
  </div>
);

export default NotAuthorized;

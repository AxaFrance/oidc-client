import * as React from 'react';

const ServiceWorkerNotSupported = () => (
  <div className="oidc-serviceworker">
    <div className="oidc-serviceworker__container">
      <h1 className="oidc-serviceworker__title">Authentification impossible sur ce navigateur</h1>
      <p className="oidc-serviceworker__content">Votre navigateur n'est pas assez sécurisé pour faire fonctionner l'authentification. Essayer de mettre à jour votre navigateur ou utilisera un navigateur plus récent.</p>
    </div>
  </div>
);

export default ServiceWorkerNotSupported;

import * as React from 'react';

const ServiceWorkerNotSupported = () => (
  <div className="oidc-serviceworker">
    <div className="oidc-serviceworker__container">
      <h1 className="oidc-serviceworker__title">Authentification impossible sur ce navigateur</h1>
      <p className="oidc-serviceworker__content">Votre navigateur n'est pas assez sécurisé pour faire fonctionner l'authentification. Vérifier que votre navigateur supporte les ServiceWorkers ou bien essayer de vous reconnecter avec un navigateur plus modern.</p>
    </div>
  </div>
);

export default ServiceWorkerNotSupported;

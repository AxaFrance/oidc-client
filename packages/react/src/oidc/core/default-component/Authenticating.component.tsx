import * as React from 'react';
import { ComponentType } from 'react';

const Authenticating : ComponentType<any> = () => (
  <div className="oidc-authenticating">
    <div className="oidc-authenticating__container">
      <h1 className="oidc-authenticating__title">Authentication in progress</h1>
      <p className="oidc-authenticating__content">You will be redirected to the login page.</p>
    </div>
  </div>
);

export default Authenticating;

import * as React from 'react';
import {PropsWithChildren} from "react";

const AuthenticatingError: PropsWithChildren<any> = () => (
  <div className="oidc-authenticating">
    <div className="oidc-authenticating__container">
      <h1 className="oidc-authenticating__title">Error authentication</h1>
      <p className="oidc-authenticating__content">An error occurred during authentication.</p>
    </div>
  </div>
);

export default AuthenticatingError;

import * as React from 'react';
import {FC, PropsWithChildren} from "react";
import {ComponentOidcProps} from "../oidc/core/default-component/ComponentTypes";
import {style} from "./style";

const Authenticating : FC<PropsWithChildren<ComponentOidcProps>> = ({children}) => (
  <>
      <div className="oidc-authenticating" style={style}>
    <div className="oidc-authenticating__container">
      <h1 className="oidc-authenticating__title">Authentication in progress</h1>
      <p className="oidc-authenticating__content">You will be redirected to the login page.</p>
    </div>
  </div>
      <div>
        {children}
  </div>
</>
);

export default Authenticating;

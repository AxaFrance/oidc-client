import * as React from 'react';
import {FC, PropsWithChildren} from "react";
import {ComponentOidcProps} from "../oidc/core/default-component/ComponentTypes";
import {style} from "./style";



const AuthenticatingError: FC<PropsWithChildren<ComponentOidcProps>> = ({children}) => (
  <>
     <div className="oidc-authenticating" style={style}>
        <div className="oidc-authenticating__container">
          <h1 className="oidc-authenticating__title">Error authentication</h1>
          <p className="oidc-authenticating__content">An error occurred during authentication.</p>
        </div>
     </div>
      {children}
  </>
);

export default AuthenticatingError;

import * as React from 'react';
import {PropsWithChildren} from "react";
import {style} from "./style";

const AuthenticatingError:  PropsWithChildren<any> = ({children, configurationName}) => (
  <>
     <div className="oidc-authenticating" style={style}>
        <div className="oidc-authenticating__container">
          <h1 className="oidc-authenticating__title">Error authentication for {configurationName}</h1>
          <p className="oidc-authenticating__content">An error occurred during authentication.</p>
        </div>
     </div>
      {children}
  </>
);

export default AuthenticatingError;

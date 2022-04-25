import React, {FC, PropsWithChildren} from 'react';
import {ComponentOidcProps} from "../oidc/core/default-component/ComponentTypes";
import {style} from "./style"

export const SessionLost: FC<PropsWithChildren<ComponentOidcProps>> = ({children}) => (
    <>
  <div className="oidc-session-lost" style={style}>
    <div className="oidc-session-lost__container">
      <h1 className="oidc-session-lost__title">Session timed out</h1>
      <p className="oidc-session-lost__content">
          Your session has expired. Please re-authenticate.
      </p>
    </div>
  </div>
        <div>
{children}</div>
</>
);

export default SessionLost;

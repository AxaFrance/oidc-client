import React, {PropsWithChildren} from 'react';
import {style} from "./style"

export const SessionLost: PropsWithChildren<any> = ({children}) => (
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

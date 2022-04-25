import React, {PropsWithChildren} from 'react';
import {style} from "./style";

export const CallBackSuccess: PropsWithChildren<any> = ({children}) =>  (<><div className="oidc-callback"  style={style}>
  <div className="oidc-callback__container">
    <h1 className="oidc-callback__title">Authentication complete</h1>
    <p className="oidc-callback__content">You will be redirected to your application.</p>
  </div>
</div>
<div>
  {children}
</div>
</>
);

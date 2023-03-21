import { ComponentType } from 'react';

import { style } from './style.js';

export const CallBackSuccess: ComponentType<any> = ({ configurationName }) => (<><div className="oidc-callback" style={style}>
  <div className="oidc-callback__container">
    <h1 className="oidc-callback__title">Authentication complete for {configurationName}</h1>
    <p className="oidc-callback__content">You will be redirected to your application.</p>
  </div>
</div>
<div>
</div>
</>
);

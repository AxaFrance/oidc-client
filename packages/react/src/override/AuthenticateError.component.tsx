import * as React from 'react';
import { ComponentType } from 'react';

import { style } from './style.js';

const AuthenticatingError: ComponentType<any> = ({ configurationName }) => (
     <div className="oidc-authenticating" style={style}>
        <div className="oidc-authenticating__container">
          <h1 className="oidc-authenticating__title">Error authentication for {configurationName}</h1>
          <p className="oidc-authenticating__content">An error occurred during authentication.</p>
        </div>
     </div>
);

export default AuthenticatingError;

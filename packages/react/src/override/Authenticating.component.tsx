import * as React from 'react';
import { PropsWithChildren } from 'react';

import { style } from './style';

const Authenticating : PropsWithChildren<any> = ({ configurationName }) => (
      <div className="oidc-authenticating" style={style}>
    <div className="oidc-authenticating__container">
      <h1 className="oidc-authenticating__title">Authentication in progress for {configurationName}</h1>
      <p className="oidc-authenticating__content">You will be redirected to the login page.</p>
    </div>
  </div>
);

export default Authenticating;

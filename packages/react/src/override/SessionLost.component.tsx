import { ComponentType } from 'react';

import { useOidc } from '../oidc';
import { style } from './style.js';

export const SessionLost: ComponentType<any> = ({ configurationName }) => {
    const { login } = useOidc(configurationName);

    return (
      <div className="oidc-session-lost" style={style}>
        <div className="oidc-session-lost__container">
          <h1 className="oidc-session-lost__title">Session timed out for {configurationName}</h1>
          <p className="oidc-session-lost__content">
              Your session has expired. Please re-authenticate.
          </p>
            <button type="button" className="btn btn-primary" onClick={() => login(null)}>Login</button>
        </div>
      </div>
    );
};

export default SessionLost;

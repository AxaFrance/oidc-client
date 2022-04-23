import React, {FC, PropsWithChildren} from 'react';

export type SessionLostProps = {};

export const SessionLost: FC<PropsWithChildren<SessionLostProps>> = () => (
  <div className="oidc-session-lost">
    <div className="oidc-session-lost__container">
      <h1 className="oidc-session-lost__title">Session timed out</h1>
      <p className="oidc-session-lost__content">
          Your session has expired. Please re-authenticate.
      </p>
    </div>
  </div>
);

export default SessionLost;

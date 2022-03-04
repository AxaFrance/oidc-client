import React, {FC, MouseEventHandler} from 'react';

type SessionLostProps = {
  login?: MouseEventHandler;
};

export const SessionLost: FC<SessionLostProps> = () => (
  <div className="oidc-session-lost">
    <div className="oidc-session-lost__container">
      <h1 className="oidc-session-lost__title">Session expirée</h1>
      <p className="oidc-session-lost__content">
        Votre session est expirée. Veuillez vous ré-authentifier.
      </p>
    </div>
  </div>
);


export const SessionLostContainer = () => {
  return <SessionLost />;
};

export default SessionLostContainer;

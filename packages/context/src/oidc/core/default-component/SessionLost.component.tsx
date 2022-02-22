import React, {FC, MouseEventHandler} from 'react';
import withCustomRouter, { ReactOidcHistory } from '../routes/withRouter';

type SessionLostProps = {
  login?: MouseEventHandler;
};

export const SessionLost: FC<SessionLostProps> = ({ login }) => (
  <div className="oidc-session-lost">
    <div className="oidc-session-lost__container">
      <h1 className="oidc-session-lost__title">Session expirée</h1>
      <p className="oidc-session-lost__content">
        Votre session est expirée. Veuillez vous ré-authentifier.
      </p>
    </div>
  </div>
);

type SessionLostContainerProps = {
  location: Location;
  history?: ReactOidcHistory;
};

export const SessionLostContainer: FC<SessionLostContainerProps> = () => {
  return <SessionLost />;
};

export default withCustomRouter(SessionLostContainer);

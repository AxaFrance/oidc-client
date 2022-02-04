import React, {FC, MouseEventHandler, useContext} from 'react';
import withCustomRouter, { ReactOidcHistory } from '../routes/withRouter';
import {OidcContext} from "../../OidcProvider";

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
      <button className="oidc-session-lost__button" type="button" onClick={login}>
        Ré-authentifier
      </button>
    </div>
  </div>
);

type SessionLostContainerProps = {
  location: Location;
  history?: ReactOidcHistory;
};

export const SessionLostContainer: FC<SessionLostContainerProps> = () => {
  const { getOidc } = useContext(OidcContext);

  const login = (callbackPath=undefined) => {
    return getOidc().redirectAsync(callbackPath);
  };
  return <SessionLost login={login} />;
};

export default withCustomRouter(SessionLostContainer);

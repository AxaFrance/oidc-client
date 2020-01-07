import React from 'react';
import withCustomRouter from '../routes/withRouter';
import { getUserManager, authenticateUser } from '../services';

export const SessionLost = ({ onAuthenticate }) => (
  <div className="oidc-session-lost">
    <div className="oidc-session-lost__container">
      <h1 className="oidc-session-lost__title">Session expirée</h1>
      <p className="oidc-session-lost__content">Votre session est expirée. Veuillez vous ré-authentifier.</p>
      <button className="oidc-session-lost__button" type="button" onClick={onAuthenticate}>Ré-authentifier</button>
    </div>
  </div>
);

export const SessionLostContainer = ({ location, history }) => {
  const callbackPath = location.search.replace('?path=', '');
  const onAuthenticate = () => {
    authenticateUser(getUserManager(), location, history)(true, callbackPath);
  };
  return <SessionLost onAuthenticate={onAuthenticate} />;
};

export default withCustomRouter(SessionLostContainer);

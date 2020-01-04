import React from 'react';
import withCustomRouter from '../routes/withRouter';
import { getUserManager, authenticateUser } from '../services';

export const SessionLost = ({ onAuthenticate }) => (
  <div>
    <div className="container">
      <h1>Session expirée</h1>
      <p>Votre session est expirée. Veuillez vous ré-authentifier.</p>
      <button type="button" onClick={onAuthenticate}>Ré-authentifier</button>
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

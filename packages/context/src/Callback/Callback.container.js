import React, { useEffect } from 'react';
import { withRouter, getUserManager, oidcLog } from '@axa-fr/react-oidc-core';
import withServices from '../withServices';

export const onRedirectSuccess = (history, oidcLogInternal) => user => {
  oidcLogInternal.info('Successfull login Callback', user);
  if (user.state.url) {
    history.push(user.state.url);
  } else {
    oidcLogInternal.warn('no location in state');
  }
};

export const onRedirectError = (history, oidcLogInternal) => ({ message }) => {
  oidcLogInternal.error(`There was an error handling the token callback: ${message}`);
  history.push(`/authentication/not-authenticated?message=${encodeURIComponent(message)}`);
};

export const CallbackContainerCore = ({
  history,
  getUserManager: getUserManagerInternal,
  oidcLog: oidcLogInternal,
}) => {
  const onSuccess = onRedirectSuccess(history, oidcLogInternal);
  const onError = onRedirectError(history, oidcLogInternal);

  useEffect(() => {
    getUserManagerInternal()
      .signinRedirectCallback()
      .then(onSuccess, onError);
  }, [getUserManagerInternal, onError, onSuccess]);
  return (
    <div>
      <div className="container">
        <h1>Authentification terminée</h1>
        <p>Vous allez être redirigé sur votre application.</p>
      </div>
    </div>
  );
};

const CallbackContainer = withRouter(
  withServices(CallbackContainerCore, {
    getUserManager,
    oidcLog,
  })
);

export default React.memo(CallbackContainer);

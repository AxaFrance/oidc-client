import React, { useEffect } from 'react';
import { withRouter } from '@axa-fr/react-oidc-core';

import { getUserManager, oidcLog, withServices } from '../Services';
import CallbackComponent from './Callback.component';

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
  return <CallbackComponent />;
};

const CallbackContainer = withRouter(
  withServices(CallbackContainerCore, {
    getUserManager,
    oidcLog,
  })
);

export default React.memo(CallbackContainer);

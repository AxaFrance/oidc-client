import React, { useEffect, useCallback } from 'react';
import { withRouter } from 'react-router-dom';

import { getUserManager, oidcLog, withServices } from '../Services';
import CallbackComponent from './Callback.component';

export const onRedirectSuccess = (history, oidcLogInternal) => user => {
  oidcLogInternal.info('Successfull login Callback');
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
  const onSuccess = useCallback(onRedirectSuccess(history, oidcLogInternal), [history]);
  const onError = useCallback(onRedirectError(history, oidcLog), [history]);

  useEffect(() => {
    getUserManagerInternal()
      .signinRedirectCallback()
      .then(onSuccess, onError);
  }, []);
  return <CallbackComponent />;
};

const CallbackContainer = withRouter(
  withServices(CallbackContainerCore, { getUserManager, oidcLog })
);

export default CallbackContainer;

import React, { ComponentType, FC, useEffect } from 'react';
import { withRouter, getUserManager, oidcLog, Callback, ReactOidcHistory } from '@axa-fr/react-oidc-core';
import { User, UserManager } from 'oidc-client';
import withServices from '../withServices';

export const onRedirectSuccess = (history: ReactOidcHistory, oidcLogInternal: typeof oidcLog) => (user: User) => {
  oidcLogInternal.info('Successfull login Callback', user);
  if (user.state.url) {
    history.replaceCurrent(user.state.url);
  } else {
    oidcLogInternal.warn('no location in state');
  }
};

export const onRedirectError = (oidcLogInternal: typeof oidcLog, userManager: UserManager) => ({ message }: { message: string }) => {
  oidcLogInternal.error(`There was an error handling the token callback: ${message}`);
  userManager.signinRedirect({ data: { url: "/" } })
};

type CallbackContainerCoreProps = {
  history: ReactOidcHistory;
  getUserManager: () => UserManager | undefined;
  oidcLog: typeof oidcLog;
  callbackComponentOverride: ComponentType;
};
export const CallbackContainerCore: FC<CallbackContainerCoreProps> = ({
  history,
  getUserManager: getUserManagerInternal,
  oidcLog: oidcLogInternal,
  callbackComponentOverride: CallbackComponentOverride,
}) => {
  const onSuccess = onRedirectSuccess(history, oidcLogInternal);
  const onError = onRedirectError(oidcLogInternal, getUserManagerInternal());

  useEffect(() => {
    getUserManagerInternal()
      .signinRedirectCallback()
      .then(onSuccess, onError);
  }, [getUserManagerInternal, onError, onSuccess]);
  return CallbackComponentOverride ? <CallbackComponentOverride /> : <Callback />;
};

const CallbackContainer = withRouter(
  withServices(CallbackContainerCore, {
    getUserManager,
    oidcLog,
  })
);

export default React.memo(CallbackContainer);

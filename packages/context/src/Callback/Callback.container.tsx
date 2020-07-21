import React, { ComponentType, FC, useEffect } from 'react';
import {
  withRouter,
  getUserManager,
  oidcLog,
  Callback,
  ReactOidcHistory,
} from '@axa-fr/react-oidc-core';
import { User, UserManager } from 'oidc-client';
import withServices from '../withServices';

export const onRedirectSuccess = (history: ReactOidcHistory, oidcLogInternal: typeof oidcLog) => (
  user: User
) => {
  oidcLogInternal.info('Successfull login Callback', user);
  if (user.state.url) {
    history.push(user.state.url);
  } else {
    oidcLogInternal.warn('no location in state');
  }
};

export const onRedirectError = (history: ReactOidcHistory, oidcLogInternal: typeof oidcLog) => ({
  message,
}: {
  message: string;
}) => {
  oidcLogInternal.error(`There was an error handling the token callback: ${message}`);
  history.push(`/authentication/not-authenticated?message=${encodeURIComponent(message)}`);
};

interface CallbackContainerCoreProps {
  history: ReactOidcHistory;
  getUserManager: () => UserManager | undefined;
  oidcLog: typeof oidcLog;
  callbackComponentOverride: ComponentType;
}
export const CallbackContainerCore: FC<CallbackContainerCoreProps> = ({
  history,
  getUserManager: getUserManagerInternal,
  oidcLog: oidcLogInternal,
  callbackComponentOverride: CallbackComponentOverride,
}) => {
  const onSuccess = onRedirectSuccess(history, oidcLogInternal);
  const onError = onRedirectError(history, oidcLogInternal);

  useEffect(() => {
    const handle = async () => {
      const userManager = await getUserManagerInternal();
      if (userManager.settings != null && userManager.settings.popup_redirect_uri != null) {
        oidcLog.info('Using popup callback');
        userManager
          .signinPopupCallback(window.location.href.split('?')[1])
          .then(onSuccess, onError);
      } else {
        oidcLog.info('Using redirect callback');
        userManager.signinRedirectCallback().then(onSuccess, onError);
      }
    };
    handle();
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

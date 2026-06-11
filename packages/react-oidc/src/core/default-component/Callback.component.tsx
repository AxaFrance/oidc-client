import { OidcClient } from '@axa-fr/oidc-client';
import { ComponentType, useEffect, useState } from 'react';

import { getCustomHistory } from '../routes/withRouter.js';
import AuthenticatingError from './AuthenticateError.component.js';

export const CallBackSuccess: ComponentType<any> = () => (
  <div className="oidc-callback">
    <div className="oidc-callback__container">
      <h1 className="oidc-callback__title">Authentication complete</h1>
      <p className="oidc-callback__content">You will be redirected to your application.</p>
    </div>
  </div>
);

export type CallbackManagerProps = {
  callBackError?: ComponentType<any>;
  callBackSuccess?: ComponentType<any>;
  configurationName: string;
  withCustomHistory?: (() => { replaceState: (url?: string | null) => void }) | null;
  navigateAfterCallback?: ((callbackPath: string) => Promise<void>) | null;
};

const CallbackManager: ComponentType<CallbackManagerProps> = ({
  callBackError,
  callBackSuccess,
  configurationName,
  withCustomHistory,
  navigateAfterCallback,
}) => {
  const [isError, setIsError] = useState(false);
  useEffect(() => {
    let isMounted = true;
    const playCallbackAsync = async () => {
      const getOidc = OidcClient.get;
      try {
        const { callbackPath } = await getOidc(configurationName).loginCallbackAsync();
        const targetPath = callbackPath || '/';
        if (navigateAfterCallback) {
          await navigateAfterCallback(targetPath);
        } else {
          const history = withCustomHistory ? withCustomHistory() : getCustomHistory();
          history.replaceState(targetPath);
          await new Promise(resolve => setTimeout(resolve, 0));
          if (window.location.pathname !== targetPath) {
            throw new Error(`Navigation to "${targetPath}" did not commit`);
          }
        }
      } catch (error) {
        if (isMounted) {
          console.warn(error);
          setIsError(true);
        }
      }
    };
    playCallbackAsync();
    return () => {
      isMounted = false;
    };
  }, []);

  const CallbackErrorComponent = callBackError || AuthenticatingError;
  const CallbackSuccessComponent = callBackSuccess || CallBackSuccess;

  if (isError) {
    return <CallbackErrorComponent configurationName={configurationName} />;
  }

  return <CallbackSuccessComponent configurationName={configurationName} />;
};

export default CallbackManager;

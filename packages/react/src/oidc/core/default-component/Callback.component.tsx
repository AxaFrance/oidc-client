import React, { ComponentType, useEffect, useState } from 'react';

import { VanillaOidc } from '../../vanilla/vanillaOidc.js';
import { getCustomHistory } from '../routes/withRouter.js';
import AuthenticatingError from './AuthenticateError.component.js';

export const CallBackSuccess: ComponentType<any> = () => (<div className="oidc-callback">
  <div className="oidc-callback__container">
    <h1 className="oidc-callback__title">Authentication complete</h1>
    <p className="oidc-callback__content">You will be redirected to your application.</p>
  </div>
</div>);

const CallbackManager: ComponentType<any> = ({ callBackError, callBackSuccess, configurationName, withCustomHistory }) => {
  const [isError, setIsError] = useState(false);
  useEffect(() => {
    let isMounted = true;
    const playCallbackAsync = async () => {
      const getOidc = VanillaOidc.get;
      try {
        const { callbackPath } = await getOidc(configurationName).loginCallbackAsync();
        const history = (withCustomHistory) ? withCustomHistory() : getCustomHistory();
        history.replaceState(callbackPath || '/');
      } catch (error) {
          if (isMounted) {
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

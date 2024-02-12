import { OidcClient } from '@axa-fr/oidc-client';
import { ComponentType, useEffect, useState } from 'react';

import { getCustomHistory } from '../routes/withRouter.js';

const CallbackManager: ComponentType<any> = ({ children, configurationName, withCustomHistory }) => {
  // const [isError, setIsError] = useState(false);
  useEffect(() => {
    let isMounted = true;
    const playCallbackAsync = async () => {
      const getOidc = OidcClient.get;
      try {
        const { callbackPath } = await getOidc(configurationName).loginCallbackAsync();
        const history = (withCustomHistory) ? withCustomHistory() : getCustomHistory();
        history.replaceState(callbackPath || '/');
      } catch (error) {
          if (isMounted) {
            console.warn(error);
            // setIsError(true);
          }
      }
    };
    playCallbackAsync();
    return () => {
      isMounted = false;
    };
  }, []);

  return <>{children}</>;
};

export default CallbackManager;

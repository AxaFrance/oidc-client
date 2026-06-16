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

const NAVIGATION_VERIFICATION_DELAY_MS = 200;

export const verifyNavigationCommitted = (
  targetPath: string,
  windowInternal: Window = window,
): boolean => {
  const currentPath = windowInternal.location.pathname;
  return currentPath === targetPath || targetPath === '/';
};

const CallbackManager: ComponentType<any> = ({
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
        const oidcClient = getOidc(configurationName);
        const { callbackPath } = await oidcClient.loginCallbackAsync();
        const targetPath = callbackPath || '/';

        if (navigateAfterCallback) {
          try {
            await navigateAfterCallback(targetPath);
            oidcClient.publishEvent(OidcClient.eventNames.loginCallbackAsync_navigated, {
              configurationName,
              callbackPath: targetPath,
            });
          } catch (navigationError) {
            oidcClient.publishEvent(OidcClient.eventNames.loginCallbackAsync_navigation_error, {
              configurationName,
              callbackPath: targetPath,
              error: navigationError,
            });
            if (isMounted) {
              console.warn(navigationError);
              setIsError(true);
            }
          }
        } else {
          const history = withCustomHistory ? withCustomHistory() : getCustomHistory();
          history.replaceState(targetPath);

          await new Promise<void>(resolve => {
            setTimeout(() => {
              resolve();
            }, NAVIGATION_VERIFICATION_DELAY_MS);
          });

          if (isMounted) {
            const committed = verifyNavigationCommitted(targetPath);
            if (committed) {
              oidcClient.publishEvent(OidcClient.eventNames.loginCallbackAsync_navigated, {
                configurationName,
                callbackPath: targetPath,
              });
            } else {
              oidcClient.publishEvent(OidcClient.eventNames.loginCallbackAsync_navigation_error, {
                configurationName,
                callbackPath: targetPath,
                error: new Error(
                  `Navigation did not commit: expected "${targetPath}" but found "${window.location.pathname}"`,
                ),
              });
              setIsError(true);
            }
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

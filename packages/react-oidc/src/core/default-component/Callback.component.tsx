import { getPath, OidcClient } from '@axa-fr/oidc-client';
import { ComponentType, useEffect, useState } from 'react';

import { CustomHistory, getCustomHistory } from '../routes/withRouter.js';
import AuthenticatingError from './AuthenticateError.component.js';

export const CallBackSuccess: ComponentType<any> = () => (
  <div className="oidc-callback">
    <div className="oidc-callback__container">
      <h1 className="oidc-callback__title">Authentication complete</h1>
      <p className="oidc-callback__content">You will be redirected to your application.</p>
    </div>
  </div>
);

const DEFAULT_NAVIGATION_TIMEOUT_MS = 3000;
const MAX_NAVIGATION_RETRIES = 1;

export const verifyNavigationCommitted = (
  expectedPath: string,
  windowInternal: Window = window,
): Promise<void> => {
  return new Promise<void>((resolve, reject) => {
    // Use a microtask + rAF to allow the browser to process the navigation
    queueMicrotask(() => {
      requestAnimationFrame(() => {
        const currentPath = getPath(windowInternal.location.href);
        if (currentPath === expectedPath) {
          resolve();
        } else {
          reject(
            new Error(
              `Navigation did not commit: expected "${expectedPath}", got "${currentPath}"`,
            ),
          );
        }
      });
    });
  });
};

export const navigateWithRetry = async (
  history: CustomHistory,
  targetPath: string,
  maxRetries: number = MAX_NAVIGATION_RETRIES,
  windowInternal: Window = window,
): Promise<void> => {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    await history.replaceState(targetPath);

    try {
      await verifyNavigationCommitted(targetPath, windowInternal);
      return;
    } catch {
      if (attempt === maxRetries) {
        throw new Error(
          `Navigation failed after ${maxRetries + 1} attempt(s): could not navigate to "${targetPath}"`,
        );
      }
    }
  }
};

export type CallbackManagerProps = {
  callBackError?: ComponentType<any>;
  callBackSuccess?: ComponentType<any>;
  configurationName: string;
  withCustomHistory?: () => CustomHistory;
  navigationTimeoutMs?: number;
  onNavigateAfterCallback?: (callbackPath: string) => Promise<void>;
};

const CallbackManager: ComponentType<CallbackManagerProps> = ({
  callBackError,
  callBackSuccess,
  configurationName,
  withCustomHistory,
  navigationTimeoutMs = DEFAULT_NAVIGATION_TIMEOUT_MS,
  onNavigateAfterCallback,
}) => {
  const [isError, setIsError] = useState(false);
  useEffect(() => {
    let isMounted = true;
    const playCallbackAsync = async () => {
      const getOidc = OidcClient.get;
      try {
        const { callbackPath } = await getOidc(configurationName).loginCallbackAsync();
        const targetPath = callbackPath || '/';

        if (onNavigateAfterCallback) {
          await onNavigateAfterCallback(targetPath);
        } else {
          const history = withCustomHistory ? withCustomHistory() : getCustomHistory();
          await navigateWithRetry(history, targetPath);
        }
      } catch (error) {
        if (isMounted) {
          console.warn(error);
          setIsError(true);
        }
      }
    };

    const timeoutId = setTimeout(() => {
      if (isMounted) {
        console.warn(
          `Callback navigation did not complete within ${navigationTimeoutMs}ms. Setting error state.`,
        );
        setIsError(true);
      }
    }, navigationTimeoutMs);

    playCallbackAsync().finally(() => {
      clearTimeout(timeoutId);
    });

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
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

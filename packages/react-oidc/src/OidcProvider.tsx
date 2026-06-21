import {
  Fetch,
  getFetchDefault,
  ILOidcLocation,
  OidcClient,
  OidcConfiguration,
  OidcLocation,
} from '@axa-fr/oidc-client';
import { ComponentType, FC, PropsWithChildren, useEffect, useState } from 'react';

import AuthenticatingError from './core/default-component/AuthenticateError.component.js';
import {
  Authenticating,
  CallBackSuccess,
  Loading,
  LoadingTimeout,
  SessionLost,
} from './core/default-component/index.js';
import ServiceWorkerNotSupported from './core/default-component/ServiceWorkerNotSupported.component.js';
import OidcRoutes from './core/routes/OidcRoutes.js';
import { CustomHistory } from './core/routes/withRouter.js';

export type oidcContext = {
  (name?: string): OidcClient;
};

const defaultEventState = { name: '', data: null };

export type OidcProviderProps = {
  callbackSuccessComponent?: ComponentType<any>;
  sessionLostComponent?: ComponentType<any>;
  authenticatingComponent?: ComponentType<any>;
  authenticatingErrorComponent?: ComponentType<any>;
  loadingComponent?: ComponentType<any>;
  loadingTimeoutComponent?: ComponentType<any>;
  serviceWorkerNotSupportedComponent?: ComponentType<any>;
  configurationName?: string;
  configuration?: OidcConfiguration;
  children: any;
  onSessionLost?: () => void;
  onLogoutFromAnotherTab?: () => void;
  onLogoutFromSameTab?: () => void;
  withCustomHistory?: () => CustomHistory;
  navigateAfterCallback?: (callbackPath: string) => Promise<void>;
  onEvent?: (configuration: string, name: string, data: any) => void;
  getFetch?: () => Fetch;
  location?: ILOidcLocation;
};

export type OidcSessionProps = {
  configurationName: string;
  loadingComponent: PropsWithChildren<any>;
};

const OidcSession: FC<PropsWithChildren<OidcSessionProps>> = ({
  loadingComponent,
  children,
  configurationName,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const getOidc = OidcClient.get;
  const oidc = getOidc(configurationName);
  useEffect(() => {
    let isMounted = true;
    if (oidc) {
      oidc.tryKeepExistingSessionAsync().then(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [configurationName]);
  const LoadingComponent = loadingComponent;
  return (
    <>{isLoading ? <LoadingComponent configurationName={configurationName} /> : <>{children}</>}</>
  );
};

const Switch = ({ isLoading, loadingComponent, children, configurationName }) => {
  const LoadingComponent = loadingComponent;
  if (isLoading) {
    return <LoadingComponent configurationName={configurationName}>{children}</LoadingComponent>;
  }
  return <>{children}</>;
};

const DEFAULT_LOADING_TIMEOUT_MS = 30_000;

/**
 * Returns true when an event signals that the OIDC client has reached an
 * authenticated, idle state and the loading watchdog should be disarmed.
 *
 * The default `event.name === ''` state in {@link OidcProvider} is overloaded:
 * it represents both "not started yet" and "done and idle". A silent session
 * restore via `tryKeepExistingSessionAsync` does not emit
 * `loginCallbackAsync_end`, so without these explicit ready signals the
 * watchdog would fire against a fully authenticated app.
 */
const isReadySignal = (name: string, data: unknown): boolean => {
  if (
    name === OidcClient.eventNames.token_acquired ||
    name === OidcClient.eventNames.token_renewed ||
    name === OidcClient.eventNames.loginCallbackAsync_end
  ) {
    return true;
  }
  if (name === OidcClient.eventNames.tryKeepExistingSessionAsync_end) {
    return (data as { success?: boolean } | null)?.success === true;
  }
  return false;
};

export const OidcProvider: FC<PropsWithChildren<OidcProviderProps>> = ({
  children,
  configuration,
  configurationName = 'default',
  callbackSuccessComponent = CallBackSuccess,
  authenticatingComponent = Authenticating,
  loadingComponent = Loading,
  loadingTimeoutComponent = LoadingTimeout,
  serviceWorkerNotSupportedComponent = ServiceWorkerNotSupported,
  authenticatingErrorComponent = AuthenticatingError,
  sessionLostComponent = SessionLost,
  onSessionLost = null,
  onLogoutFromAnotherTab = null,
  onLogoutFromSameTab = null,
  withCustomHistory = null,
  navigateAfterCallback = null,
  onEvent = null,
  getFetch = null,
  location = null,
}) => {
  if (configuration && configuration.redirect_uri && configuration.silent_redirect_uri) {
    if (configuration.redirect_uri === configuration.silent_redirect_uri) {
      throw new Error('redirect_uri and silent_redirect_uri must be different');
    }
  }

  const getOidc = (configurationName = 'default') => {
    return OidcClient.getOrCreate(getFetch ?? getFetchDefault, location ?? new OidcLocation())(
      configuration,
      configurationName,
    );
  };

  const loading = false;
  const [event, setEvent] = useState(defaultEventState);
  const [isAuthenticatedAndIdle, setIsAuthenticatedAndIdle] = useState<boolean>(false);
  const [currentConfigurationName, setConfigurationName] = useState(configurationName);

  useEffect(() => {
    const oidc = getOidc(configurationName);
    const newSubscriptionId = oidc.subscribeEvents((name, data) => {
      if (onEvent) {
        onEvent(configurationName, name, data);
      }
    });
    return () => {
      const previousOidc = getOidc(configurationName);
      previousOidc.removeEventSubscription(newSubscriptionId);
    };
  }, [configurationName, onEvent]);

  useEffect(() => {
    const oidc = getOidc(configurationName);
    const newSubscriptionId = oidc.subscribeEvents((name, data) => {
      if (isReadySignal(name, data)) {
        setIsAuthenticatedAndIdle(true);
      }
      if (
        name === OidcClient.eventNames.refreshTokensAsync_error ||
        name === OidcClient.eventNames.syncTokensAsync_error
      ) {
        if (onSessionLost != null) {
          onSessionLost();
          return;
        }
        setEvent({ name, data });
      } else if (name === OidcClient.eventNames.logout_from_another_tab) {
        if (onLogoutFromAnotherTab != null) {
          onLogoutFromAnotherTab();
          return;
        }
        setEvent({ name, data });
      } else if (name === OidcClient.eventNames.logout_from_same_tab) {
        if (onLogoutFromSameTab != null) {
          onLogoutFromSameTab();
        }
        // setEvent({name, data});
      } else if (name === OidcClient.eventNames.loadingTimeout_error) {
        setEvent({ name, data });
      } else if (
        name === OidcClient.eventNames.loginAsync_begin ||
        name === OidcClient.eventNames.loginCallbackAsync_end ||
        name === OidcClient.eventNames.loginAsync_error ||
        name === OidcClient.eventNames.loginCallbackAsync_error
      ) {
        setEvent({ name, data });
      } else if (
        name === OidcClient.eventNames.service_worker_not_supported_by_browser &&
        configuration.service_worker_only === true
      ) {
        setEvent({ name, data });
      }
    });

    queueMicrotask(() => {
      setConfigurationName(configurationName);
    });

    return () => {
      const previousOidc = getOidc(configurationName);
      previousOidc.removeEventSubscription(newSubscriptionId);
      setEvent(defaultEventState);
      setIsAuthenticatedAndIdle(false);
    };
  }, [configuration, configurationName]);

  useEffect(() => {
    const timeoutMs = configuration?.loading_timeout_ms ?? DEFAULT_LOADING_TIMEOUT_MS;
    if (timeoutMs <= 0) {
      return;
    }
    if (isAuthenticatedAndIdle) {
      return;
    }
    const oidcInstance = getOidc(configurationName);
    if (oidcInstance?.tokens != null) {
      return;
    }
    const isStuck = event.name === '' || event.name === OidcClient.eventNames.loginAsync_begin;
    if (!isStuck) {
      return;
    }
    const timeoutId = setTimeout(() => {
      getOidc(configurationName).publishEvent(OidcClient.eventNames.loadingTimeout_error, {
        timeoutMs,
      });
    }, timeoutMs);
    return () => clearTimeout(timeoutId);
  }, [event.name, isAuthenticatedAndIdle, configurationName, configuration]);

  const SessionLostComponent = sessionLostComponent;
  const AuthenticatingComponent = authenticatingComponent;
  const LoadingComponent = loadingComponent;
  const LoadingTimeoutComponent = loadingTimeoutComponent;
  const ServiceWorkerNotSupportedComponent = serviceWorkerNotSupportedComponent;
  const AuthenticatingErrorComponent = authenticatingErrorComponent;

  const isLoading = loading || currentConfigurationName !== configurationName;
  const oidc = getOidc(configurationName);
  const eventName = event.name;
  switch (eventName) {
    case OidcClient.eventNames.service_worker_not_supported_by_browser:
      return (
        <Switch
          loadingComponent={LoadingComponent}
          isLoading={isLoading}
          configurationName={configurationName}
        >
          <ServiceWorkerNotSupportedComponent configurationName={configurationName} />
        </Switch>
      );
    case OidcClient.eventNames.loginAsync_begin:
      return (
        <Switch
          loadingComponent={LoadingComponent}
          isLoading={isLoading}
          configurationName={configurationName}
        >
          <AuthenticatingComponent configurationName={configurationName} />
        </Switch>
      );
    case OidcClient.eventNames.loadingTimeout_error:
      return (
        <Switch
          loadingComponent={LoadingComponent}
          isLoading={isLoading}
          configurationName={configurationName}
        >
          <LoadingTimeoutComponent configurationName={configurationName} />
        </Switch>
      );
    case OidcClient.eventNames.loginAsync_error:
    case OidcClient.eventNames.loginCallbackAsync_error:
      return (
        <Switch
          loadingComponent={LoadingComponent}
          isLoading={isLoading}
          configurationName={configurationName}
        >
          <AuthenticatingErrorComponent configurationName={configurationName} />
        </Switch>
      );
    case OidcClient.eventNames.refreshTokensAsync_error:
    case OidcClient.eventNames.syncTokensAsync_error:
    case OidcClient.eventNames.logout_from_another_tab:
      return (
        <Switch
          loadingComponent={LoadingComponent}
          isLoading={isLoading}
          configurationName={configurationName}
        >
          <SessionLostComponent configurationName={configurationName} />
        </Switch>
      );
    default:
      return (
        <Switch
          loadingComponent={LoadingComponent}
          isLoading={isLoading}
          configurationName={configurationName}
        >
          <OidcRoutes
            redirect_uri={oidc.configuration.redirect_uri}
            silent_redirect_uri={oidc.configuration.silent_redirect_uri}
            silent_login_uri={oidc.configuration.silent_login_uri}
            callbackSuccessComponent={callbackSuccessComponent}
            callbackErrorComponent={authenticatingErrorComponent}
            authenticatingComponent={authenticatingComponent}
            configurationName={configurationName}
            withCustomHistory={withCustomHistory}
            navigateAfterCallback={navigateAfterCallback}
            location={location ?? new OidcLocation()}
          >
            <OidcSession loadingComponent={LoadingComponent} configurationName={configurationName}>
              {children}
            </OidcSession>
          </OidcRoutes>
        </Switch>
      );
  }
};

export default OidcProvider;

import {Fetch, getFetchDefault, OidcConfiguration, OidcClient, ILOidcLocation, OidcLocation} from '@axa-fr/oidc-client';
import { ComponentType, FC, PropsWithChildren, useEffect, useState } from 'react';

import AuthenticatingError from './core/default-component/AuthenticateError.component.js';
import { Authenticating, CallBackSuccess, Loading, SessionLost } from './core/default-component/index.js';
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
    serviceWorkerNotSupportedComponent?: ComponentType<any>;
    configurationName?: string;
    configuration?: OidcConfiguration;
    children: any;
    onSessionLost?: () => void;
    onLogoutFromAnotherTab?: () => void;
    onLogoutFromSameTab?: () => void;
    withCustomHistory?: () => CustomHistory;
    onEvent?: (configuration: string, name: string, data: any) => void;
    getFetch?: () => Fetch;
    location?: ILOidcLocation
};

export type OidcSessionProps = {
    configurationName: string;
    loadingComponent: PropsWithChildren<any>;
};

const OidcSession: FC<PropsWithChildren<OidcSessionProps>> = ({ loadingComponent, children, configurationName }) => {
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [configurationName]);
    const LoadingComponent = loadingComponent;
    return (
        <>
            {isLoading
                ? (
                    <LoadingComponent configurationName={configurationName} />
                )
                : (
                    <>{children}</>
                )}
        </>
    );
};

const Switch = ({ isLoading, loadingComponent, children, configurationName }) => {
    const LoadingComponent = loadingComponent;
    if (isLoading) {
        return <LoadingComponent configurationName={configurationName}>{children}</LoadingComponent>;
    }
    return <>{children}</>;
};

export const OidcProvider: FC<PropsWithChildren<OidcProviderProps>> = ({
    children,
    configuration,
    configurationName = 'default',
    callbackSuccessComponent = CallBackSuccess,
    authenticatingComponent = Authenticating,
    loadingComponent = Loading,
    serviceWorkerNotSupportedComponent = ServiceWorkerNotSupported,
    authenticatingErrorComponent = AuthenticatingError,
    sessionLostComponent = SessionLost,
    onSessionLost = null,
    onLogoutFromAnotherTab = null,
    onLogoutFromSameTab = null,
    withCustomHistory = null,
    onEvent = null,
    getFetch = null,
    location= null,
}) => {
    const getOidc = (configurationName = 'default') => {
        return OidcClient.getOrCreate(getFetch ?? getFetchDefault, location ?? new OidcLocation())(configuration, configurationName);
    };
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const [loading, setLoading] = useState(true);
    const [event, setEvent] = useState(defaultEventState);
    const [currentConfigurationName, setConfigurationName] = useState('default');

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
            if (name === OidcClient.eventNames.refreshTokensAsync_error || name === OidcClient.eventNames.syncTokensAsync_error) {
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
            } else if (name === OidcClient.eventNames.loginAsync_begin ||
                name === OidcClient.eventNames.loginCallbackAsync_end ||
                name === OidcClient.eventNames.loginAsync_error ||
                name === OidcClient.eventNames.loginCallbackAsync_error
            ) {
                setEvent({ name, data });
            } else if (name === OidcClient.eventNames.service_worker_not_supported_by_browser && configuration.service_worker_only === true) {
                setEvent({ name, data });
            }
        });

        setConfigurationName(configurationName);
        setLoading(false);
        return () => {
            const previousOidc = getOidc(configurationName);
            previousOidc.removeEventSubscription(newSubscriptionId);
            setEvent(defaultEventState);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [configuration, configurationName]);

    const SessionLostComponent = sessionLostComponent;
    const AuthenticatingComponent = authenticatingComponent;
    const LoadingComponent = loadingComponent;
    const ServiceWorkerNotSupportedComponent = serviceWorkerNotSupportedComponent;
    const AuthenticatingErrorComponent = authenticatingErrorComponent;

    const isLoading = (loading || (currentConfigurationName !== configurationName));
    const oidc = getOidc(configurationName);
    const eventName = event.name;
    switch (eventName) {
        case OidcClient.eventNames.service_worker_not_supported_by_browser:
            return (<Switch loadingComponent={LoadingComponent} isLoading={isLoading} configurationName={configurationName}>
                <ServiceWorkerNotSupportedComponent configurationName={configurationName} />
            </Switch>);
        case OidcClient.eventNames.loginAsync_begin:
            return (<Switch loadingComponent={LoadingComponent} isLoading={isLoading} configurationName={configurationName}>
                <AuthenticatingComponent configurationName={configurationName} />
            </Switch>);
        case OidcClient.eventNames.loginAsync_error:
        case OidcClient.eventNames.loginCallbackAsync_error:
            return (<Switch loadingComponent={LoadingComponent} isLoading={isLoading} configurationName={configurationName}>
                <AuthenticatingErrorComponent configurationName={configurationName} />
            </Switch>);
        case OidcClient.eventNames.refreshTokensAsync_error:
        case OidcClient.eventNames.syncTokensAsync_error:
        case OidcClient.eventNames.logout_from_another_tab:
            return (<Switch loadingComponent={LoadingComponent} isLoading={isLoading} configurationName={configurationName}>
                <SessionLostComponent configurationName={configurationName} />
            </Switch>);
        default:
            return (
                <Switch loadingComponent={LoadingComponent} isLoading={isLoading} configurationName={configurationName}>
                    <OidcRoutes redirect_uri={oidc.configuration.redirect_uri}
                        silent_redirect_uri={oidc.configuration.silent_redirect_uri}
                        silent_login_uri={oidc.configuration.silent_login_uri}
                        callbackSuccessComponent={callbackSuccessComponent}
                        callbackErrorComponent={authenticatingErrorComponent}
                        authenticatingComponent={authenticatingComponent}
                        configurationName={configurationName}
                        withCustomHistory={withCustomHistory}>
                        <OidcSession loadingComponent={LoadingComponent} configurationName={configurationName}>
                            {children}
                        </OidcSession>
                    </OidcRoutes>
                </Switch>
            );
    }
};

export default OidcProvider;

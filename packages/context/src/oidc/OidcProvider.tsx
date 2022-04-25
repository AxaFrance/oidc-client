import React, {ComponentType, FC, PropsWithChildren, useEffect, useState} from 'react';
import Oidc, {OidcConfiguration} from './vanilla/oidc';
import OidcRoutes from './core/routes/OidcRoutes';
import {Authenticating, AuthenticateError, SessionLost, Loading, CallBackSuccess} from './core/default-component/index';
import ServiceWorkerNotSupported from "./core/default-component/ServiceWorkerNotSupported.component";
import AuthenticatingError from "./core/default-component/AuthenticateError.component";


export type oidcContext = {
    getOidc: Function;
};

const defaultEventState = {name:"", data:null};

export type OidcProviderProps = {
    callbackSuccessComponent?: PropsWithChildren<any>;
    callbackErrorComponent?: PropsWithChildren<any>;
    sessionLostComponent?: PropsWithChildren<any>;
    authenticatingComponent?: PropsWithChildren<any>;
    loadingComponent?: PropsWithChildren<any>;
    authenticatingErrorComponent?: PropsWithChildren<any>;
    serviceWorkerNotSupportedComponent?: PropsWithChildren<any>;
    configurationName?: string;
    configuration?: OidcConfiguration;
    children: any;
};

export type OidcSessionProps = {
    configurationName: string;
    loadingComponent: ComponentType
};


const OidcSession : FC<PropsWithChildren<OidcSessionProps>> = ({loadingComponent, children, configurationName}) =>{
    const [loading, setLoading] = useState(true);
    const getOidc =  Oidc.get;
    const oidc = getOidc(configurationName);
    useEffect(() => {
        let isMounted = true;
        if(oidc) {
            oidc.tryKeepExistingSessionAsync().then(() => {
                if (isMounted) {
                    setLoading(false);
                }
            })
        }
        return () => {
            isMounted = false;
        }
    }, [oidc, configurationName]);
    const LoadingComponent = loadingComponent;
    return (
        <>
            {loading ? (
               <LoadingComponent/>
            ) : (
                <>{children}</>
            )}
        </>
    );
}

const Switch = ({isLoading, loadingComponent, children}) => {
    const LoadingComponent = loadingComponent;
    if(isLoading){
        return <LoadingComponent>{children}</LoadingComponent>;
    }
    return <>{children}</>;
}


export const OidcProvider : FC<PropsWithChildren<OidcProviderProps>>  = ({ children, 
                                                                             configuration, 
                                                                             configurationName = "default", 
                                                                             callbackSuccessComponent = CallBackSuccess, 
                                                                             callbackErrorComponent = AuthenticateError,
                                                                             authenticatingComponent = Authenticating,
                                                                             loadingComponent = Loading,
                                                                             serviceWorkerNotSupportedComponent = ServiceWorkerNotSupported,
                                                                             authenticatingErrorComponent = AuthenticatingError,
    
    
sessionLostComponent=SessionLost }) => {
    const getOidc =(configurationName="default") => {
        return Oidc.getOrCreate(configuration, configurationName);
    }
    const [loading, setLoading] = useState(true);
    const [event, setEvent] = useState(defaultEventState);
    const [currentConfigurationName, setConfigurationName] = useState("default");

    useEffect(() => {
        const oidc = getOidc(configurationName);
        const newSubscriptionId = oidc.subscriveEvents((name, data) => {
            if (name == Oidc.eventNames.loginAsync_begin
                || name == Oidc.eventNames.loginCallbackAsync_end
                || name == Oidc.eventNames.loginAsync_error
                || name == Oidc.eventNames.loginCallbackAsync_error
                || name == Oidc.eventNames.refreshTokensAsync_error
            ) {
                setEvent({name, data});
            } else if (name == Oidc.eventNames.service_worker_not_supported_by_browser && configuration.service_worker_only === true) {
                setEvent({name, data});
            }
        });
        setConfigurationName(configurationName);
        setLoading(false);
        return () => {
            const previousOidc = getOidc(configurationName);
            previousOidc.removeEventSubscription(newSubscriptionId);
            setEvent(defaultEventState);
        }
    }, [configuration, configurationName]);

    
    const SessionLostComponent = sessionLostComponent;
    const AuthenticatingComponent = authenticatingComponent;
    const LoadingComponent = loadingComponent;
    const ServiceWorkerNotSupportedComponent = serviceWorkerNotSupportedComponent;
    const AuthenticatingErrorComponent = authenticatingErrorComponent;

    const isLoading = (loading || (currentConfigurationName != configurationName ));
    
    switch(event.name){
        case Oidc.eventNames.service_worker_not_supported_by_browser:
            return <Switch loadingComponent={LoadingComponent} isLoading={isLoading}>
                <ServiceWorkerNotSupportedComponent>
                    {children}
                </ServiceWorkerNotSupportedComponent>
            </Switch>;
        case Oidc.eventNames.loginAsync_begin:
            return  <Switch loadingComponent={LoadingComponent} isLoading={isLoading}>
                <AuthenticatingComponent>
                    {children}
                </AuthenticatingComponent>
            </Switch>;
        case Oidc.eventNames.loginAsync_error:
        case Oidc.eventNames.loginCallbackAsync_error:
            return <Switch loadingComponent={LoadingComponent} isLoading={isLoading}>
                <AuthenticatingErrorComponent>
                    {children}
                </AuthenticatingErrorComponent>;
            </Switch>;
        case Oidc.eventNames.refreshTokensAsync_error:
            return <Switch loadingComponent={LoadingComponent} isLoading={isLoading}>
                <SessionLostComponent>
                    {children}
                </SessionLostComponent> 
            </Switch>;
        default:
            return (
                <Switch loadingComponent={LoadingComponent} isLoading={isLoading}>
                      <OidcRoutes redirect_uri={configuration.redirect_uri}
                                  silent_redirect_uri={configuration.silent_redirect_uri}
                                  callbackSuccessComponent={callbackSuccessComponent} 
                                  callbackErrorComponent={callbackErrorComponent}
                                  authenticatingComponent={authenticatingComponent}
                                  configurationName={configurationName}>
                          <OidcSession loadingComponent={LoadingComponent} configurationName={configurationName}>
                            {children}
                          </OidcSession>
                      </OidcRoutes>
                </Switch>
            );
    }
};

export default OidcProvider;

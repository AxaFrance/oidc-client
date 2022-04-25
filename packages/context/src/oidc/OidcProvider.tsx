import React, {ComponentType, FC, PropsWithChildren, useEffect, useState} from 'react';
import Oidc, {OidcConfiguration} from './vanilla/oidc';
import OidcRoutes from './core/routes/OidcRoutes';
import {Authenticating, AuthenticateError, SessionLost, Loading, CallBackSuccess} from './core/default-component/index';
import ServiceWorkerNotSupported from "./core/default-component/ServiceWorkerNotSupported.component";
import AuthenticatingError from "./core/default-component/AuthenticateError.component";
import {ComponentOidcProps} from "./core/default-component/ComponentTypes";


export type oidcContext = {
    getOidc: Function;
};

const defaultEventState = {name:"", data:null};

export type OidcProviderProps = {
    callbackSuccessComponent?: ComponentType;
    callbackErrorComponent?: FC<PropsWithChildren<ComponentOidcProps>>;
    sessionLostComponent?: FC<PropsWithChildren<ComponentOidcProps>>;
    authenticatingComponent?: FC<PropsWithChildren<ComponentOidcProps>>;
    loadingComponent?: FC<PropsWithChildren<ComponentOidcProps>>;
    authenticatingErrorComponent?: FC<PropsWithChildren<ComponentOidcProps>>;
    serviceWorkerNotSupportedComponent?: FC<PropsWithChildren<ComponentOidcProps>>;
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
    useEffect(() => {
        let isMounted = true;
        const oidc = getOidc(configurationName);
        oidc.tryKeepExistingSessionAsync().then( () =>  {
            if(isMounted){
                setLoading(false);
            }
        })
 
        return () => {
            isMounted = false;
        }
    }, []);
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
    const [subscriptionId, setSubscriptionId] = useState(null);
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
        setSubscriptionId(newSubscriptionId);
        setLoading(false);
        return () => {
            oidc.removeEventSubscription(subscriptionId);
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
            // @ts-ignore
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

import React, {ComponentType, createContext, FC, PropsWithChildren, useEffect, useState} from 'react';
import Oidc, {Configuration} from './vanilla/oidc';
import OidcRoutes from './core/routes/OidcRoutes';
import {Authenticating, AuthenticateError, SessionLost, Loading, Callback} from './core/default-component/index';
import ServiceWorkerNotSupported from "./core/default-component/ServiceWorkerNotSupported.component";
import AuthenticatingError from "./core/default-component/AuthenticateError.component";

export const OidcContext = createContext<oidcContext>(null);

export type oidcContext = {
    getOidc: Function;
};

export const OidcConsumer = OidcContext.Consumer;

export const withOidc = Component => props => (
    <OidcConsumer>
        {store => <Component {...props} {...store} />}
    </OidcConsumer>
);

const defaultEventState = {name:"", data:null};

type OidcProviderProps = {
    callbackSuccessComponent?: ComponentType;
    callbackErrorComponent?: ComponentType;
    sessionLostComponent?: ComponentType;
    authenticatingComponent?: ComponentType;
    loadingComponent?: ComponentType;
    authenticatingErrorComponent?: ComponentType;
    serviceWorkerNotSupportedComponent?: ComponentType;
    configurationName?: string;
    configuration?: Configuration;
};

const OidcSession = ({oidcState, loadingComponent, children, configurationName}) =>{
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        let isMounted = true;
        const oidc = oidcState.getOidc(configurationName);
        oidc.tryKeepExistingSessionAsync().then( () =>  {
            if(isMounted){
                setLoading(false);
            }
        })

        return () => {
            oidc.destroyAsync();
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


export const OidcProvider : FC<PropsWithChildren<OidcProviderProps>>  = ({ children, 
                                                                             configuration, 
                                                                             configurationName = "default", 
                                                                             callbackSuccessComponent = Callback, 
                                                                             callbackErrorComponent = AuthenticateError,
                                                                             authenticatingComponent = Authenticating,
                                                                             loadingComponent = Loading,
                                                                             serviceWorkerNotSupportedComponent = ServiceWorkerNotSupported,
                                                                             authenticatingErrorComponent = AuthenticatingError,
sessionLostComponent=SessionLost }) => {
    const getOidc =(configurationName="default") => {
        return Oidc.getOrCreate(configuration, configurationName);
    }
    const [oidcState, setOidc] = useState({getOidc});
    const [loading, setLoading] = useState(true);
    const [event, setEvent] = useState(defaultEventState);

    useEffect(() => {
        let isMounted = true;
        const oidc = getOidc(configurationName);
        oidc.subscriveEvents((name, data) => {
            if(!isMounted){
                return;
            }
            
            setEvent({name, data});
           if(name == Oidc.eventNames.loginAsync_begin 
                || name == Oidc.eventNames.loginCallbackAsync_end
                || name == Oidc.eventNames.loginAsync_error 
                || name == Oidc.eventNames.loginCallbackAsync_error
                || name == Oidc.eventNames.refreshTokensAsync_error
                || name == Oidc.eventNames.service_worker_not_supported_by_browser && !(configuration.service_worker_only === true)){
                    setEvent({name, data});
                } else{
               if(defaultEventState.name === event.name)
                    setEvent(defaultEventState);
                }
        });

            if(isMounted) {
                setLoading(false);
            }
        return () => {
            oidc.destroyAsync();
            isMounted = false;
        }
    }, []);
    
    
    const SessionLostComponent = sessionLostComponent;
    const AuthenticatingComponent = authenticatingComponent;
    const LoadingComponent = loadingComponent;
    const ServiceWorkerNotSupportedComponent = serviceWorkerNotSupportedComponent;
    const AuthenticatingErrorComponent = authenticatingErrorComponent;

    switch(event.name){
        case Oidc.eventNames.service_worker_not_supported_by_browser:
            return <ServiceWorkerNotSupportedComponent />;
        case Oidc.eventNames.loginAsync_begin:
            return <AuthenticatingComponent />;
        case Oidc.eventNames.loginAsync_error:
        case Oidc.eventNames.loginCallbackAsync_error:
            return <AuthenticatingErrorComponent />;
        case Oidc.eventNames.refreshTokensAsync_error:
            return <SessionLostComponent />;
        default:
            return (
                <>
                    {loading ? (
                        <LoadingComponent/>
                    ) : (
                            <OidcContext.Provider value={oidcState}>
                                  <OidcRoutes redirect_uri={configuration.redirect_uri} 
                                              callbackSuccessComponent={callbackSuccessComponent} 
                                              callbackErrorComponent={callbackErrorComponent}
                                              configurationName={configurationName}
                                                >
                                      <OidcSession oidcState={oidcState} loadingComponent={LoadingComponent} configurationName={configurationName}>
                                        {children}
                                      </OidcSession>
                                </OidcRoutes>
                            </OidcContext.Provider>
                    )}
                </>
            );
    }
};

export default OidcProvider;

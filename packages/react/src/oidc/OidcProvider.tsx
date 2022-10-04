import React, {ComponentType, FC, PropsWithChildren, useEffect, useState} from 'react';
import {OidcConfiguration} from './vanilla/oidc';
import {VanillaOidc} from './vanilla/vanillaOidc';
import OidcRoutes from './core/routes/OidcRoutes';
import {Authenticating, SessionLost, Loading, CallBackSuccess} from './core/default-component/index';
import ServiceWorkerNotSupported from "./core/default-component/ServiceWorkerNotSupported.component";
import AuthenticatingError from "./core/default-component/AuthenticateError.component";
import { CustomHistory } from "./core/routes/withRouter";

export type oidcContext = {
    getOidc: Function;
};

const defaultEventState = {name:"", data:null};

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
    onSessionLost?: Function,
    onLogoutFromAnotherTab?:Function,
    onLogoutFromSameTab?:Function,
    withCustomHistory?: () => CustomHistory,
    onEvent?:Function
};

export type OidcSessionProps = {
    configurationName: string;
    loadingComponent: PropsWithChildren<any>;
};


const OidcSession : FC<PropsWithChildren<OidcSessionProps>> = ({loadingComponent, children, configurationName}) =>{
    const [loading, setLoading] = useState(true);
    const getOidc =  VanillaOidc.get;
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
    }, [configurationName]);
    const LoadingComponent = loadingComponent;
    return (
        <>
            {loading ? (
               <LoadingComponent configurationName={configurationName}/>
            ) : (
                <>{children}</>
            )}
        </>
    );
}

const Switch = ({isLoading, loadingComponent, children, configurationName}) => {
    const LoadingComponent = loadingComponent;
    if(isLoading){
        return <LoadingComponent configurationName={configurationName}>{children}</LoadingComponent>;
    }
    return <>{children}</>;
}


export const OidcProvider : FC<PropsWithChildren<OidcProviderProps>>  = ({ children, 
                                                                             configuration, 
                                                                             configurationName = "default", 
                                                                             callbackSuccessComponent = CallBackSuccess, 
                                                                             authenticatingComponent = Authenticating,
                                                                             loadingComponent = Loading,
                                                                             serviceWorkerNotSupportedComponent = ServiceWorkerNotSupported,
                                                                             authenticatingErrorComponent = AuthenticatingError,
                                                                             sessionLostComponent=SessionLost,
                                                                             onSessionLost=null,
                                                                             onLogoutFromAnotherTab=null,
                                                                             onLogoutFromSameTab=null,
                                                                             withCustomHistory=null,
                                                                             onEvent=null,
                                                                         }) => {
    const getOidc =(configurationName="default") => {
        return VanillaOidc.getOrCreate(configuration, configurationName);
    }
    const [loading, setLoading] = useState(true);
    const [event, setEvent] = useState(defaultEventState);
    const [currentConfigurationName, setConfigurationName] = useState("default");

    useEffect(() => {
        const oidc = getOidc(configurationName);
        const newSubscriptionId = oidc.subscriveEvents((name, data) => {
            if(onEvent)
            {
                onEvent(configurationName, name, data);
            }
        });
        return () => {
            const previousOidc = getOidc(configurationName);
            previousOidc.removeEventSubscription(newSubscriptionId);
        }
    }, [configurationName, onEvent]);

    useEffect(() => {
        const oidc = getOidc(configurationName);
        const newSubscriptionId = oidc.subscriveEvents((name, data) => {
            if(name == VanillaOidc.eventNames.refreshTokensAsync_error || name == VanillaOidc.eventNames.syncTokensAsync_error){
                if(onSessionLost != null){
                    onSessionLost();
                    return;
                }
                setEvent({name, data});
            }
            else if(name === VanillaOidc.eventNames.logout_from_another_tab){
                if(onLogoutFromAnotherTab != null){
                    onLogoutFromAnotherTab();
                    return;
                }
                setEvent({name, data});
            }
            else if(name === VanillaOidc.eventNames.logout_from_same_tab){
                if(onLogoutFromSameTab != null){
                    onLogoutFromSameTab();
                    return;
                }
                //setEvent({name, data});
            }
            else if (name == VanillaOidc.eventNames.loginAsync_begin
                || name == VanillaOidc.eventNames.loginCallbackAsync_end
                || name == VanillaOidc.eventNames.loginAsync_error
                || name == VanillaOidc.eventNames.loginCallbackAsync_error
            ) {
                setEvent({name, data});
            } else if (name == VanillaOidc.eventNames.service_worker_not_supported_by_browser && configuration.service_worker_only === true) {
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
    const oidc = getOidc(configurationName);
    let eventName = event.name;
    switch(eventName){
        case VanillaOidc.eventNames.service_worker_not_supported_by_browser:
            return <Switch loadingComponent={LoadingComponent} isLoading={isLoading} configurationName={configurationName}>
                <ServiceWorkerNotSupportedComponent configurationName={configurationName} />
            </Switch>;
        case VanillaOidc.eventNames.loginAsync_begin:
            return  <Switch loadingComponent={LoadingComponent} isLoading={isLoading} configurationName={configurationName}>
                <AuthenticatingComponent configurationName={configurationName} />
            </Switch>;
        case VanillaOidc.eventNames.loginAsync_error:
        case VanillaOidc.eventNames.loginCallbackAsync_error:
            return <Switch loadingComponent={LoadingComponent} isLoading={isLoading} configurationName={configurationName}>
                <AuthenticatingErrorComponent configurationName={configurationName} />
            </Switch>;
        case VanillaOidc.eventNames.refreshTokensAsync_error:
        case VanillaOidc.eventNames.syncTokensAsync_error:
        case VanillaOidc.eventNames.logout_from_another_tab:
            return <Switch loadingComponent={LoadingComponent} isLoading={isLoading} configurationName={configurationName}>
                <SessionLostComponent configurationName={configurationName} /> 
            </Switch>;
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

import React, {ComponentType, createContext, FC, PropsWithChildren, useEffect, useState} from 'react';
import Oidc, {Configuration} from './vanilla/oidc';
import OidcRoutes from './core/routes/OidcRoutes';
import {Authenticating, AuthenticateError, SessionLost, Loading, Callback} from './core/default-component/index';

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
    configurationName?: string;
    configuration?: Configuration;
};

const OidcSession = ({oidcState, loadingComponent, children}) =>{
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        let isMounted = true;
        const oidc = oidcState.getOidc();
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
                ||name == Oidc.eventNames.refreshTokensAsync_error){
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

    switch(event.name){
        case Oidc.eventNames.loginAsync_begin:
            return <AuthenticatingComponent />;
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
                                                >
                                      <OidcSession oidcState={oidcState} loadingComponent={LoadingComponent}>
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

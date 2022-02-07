import React, {ComponentType, createContext, FC, PropsWithChildren, useEffect, useState} from 'react';
import Oidc, {Configuration} from './vanilla/oidc';
import OidcRoutes from './core/routes/OidcRoutes';
import {Authenticating, AuthenticateError, SessionLost} from './core/default-component/index';

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
    configurationName?: string;
    configuration?: Configuration;
};


export const OidcProvider : FC<PropsWithChildren<OidcProviderProps>>  = ({ children, configuration, configurationName = "default", callbackSuccessComponent, callbackErrorComponent,
sessionLostComponent }) => {
    
    const getOidc =() => {
        return Oidc.getOrCreate(configuration, configurationName);
    }
    const [oidcState, setOidc] = useState({getOidc});
    const [loading, setLoading] = useState(true);
    const [event, setEvent] = useState(defaultEventState);

    useEffect(() => {
        let isMounted = true;
        const oidc = getOidc();
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
        
        setLoading(false);
        return () => {
            getOidc().destroyAsync();
            isMounted = false;
        }
    }, []);

    switch(event.name){
        case Oidc.eventNames.loginAsync_begin:
            return <Authenticating />;
        case Oidc.eventNames.loginAsync_error:
            return <AuthenticateError />;
        case Oidc.eventNames.refreshTokensAsync_error:
            return <SessionLost />;
        default:
            return (
                <>
                    {loading ? (
                        <span>Loading</span>
                    ) : (
                            <OidcContext.Provider value={oidcState}>
                                  <OidcRoutes redirect_uri={configuration.redirect_uri} 
                                              callbackSuccessComponent={callbackSuccessComponent} 
                                              callbackErrorComponent={callbackErrorComponent}
                                                sessionLostComponent={sessionLostComponent} >
                                      {children}
                                </OidcRoutes>
                            </OidcContext.Provider>
                    )}
                </>
            );
    }
};

export default OidcProvider;

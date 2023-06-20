import React, { useReducer, useState } from 'react';

import { configurationGoogle, configurationIdentityServer, configurationIdentityServerWithHash } from './configurations';
import { OidcProvider, useOidc, useOidcAccessToken, useOidcIdToken } from './oidc';
import { Fetch } from './oidc/FetchToken';
import AuthenticatingError from './override/AuthenticateError.component';
import Authenticating from './override/Authenticating.component';
import { CallBackSuccess } from './override/Callback.component';
import Loading from './override/Loading.component';
import ServiceWorkerNotSupported from './override/ServiceWorkerNotSupported.component';
import SessionLost from './override/SessionLost.component';

const fetchWithLogs = (fetch: Fetch) => async (...params: Parameters<Fetch>) => {
    const [url, options, ...rest] = params;

    console.log('fetchWithLogs', url, options, ...rest);

    return await fetch(url, options, ...rest);
};

const MultiAuth = ({ configurationName, handleConfigurationChange }) => {
    const { login, logout, isAuthenticated } = useOidc(configurationName);
    const { isAuthenticated: isAuthenticatedDefault } = useOidc('default');
    const [fname, setFname] = useState('');

    const handleChange = e => {
        setFname(e.target.value);
    };
    return (
        <div className="container-fluid mt-3">
            <div className="card">
                <div className="card-body">
                    <h5 className="card-title">Multiple Authentication</h5>
                    <form>
                        <label>
                            First Name:{' '}
                            <input type="text" value={fname} onChange={handleChange} />
                        </label>
                    </form>
                    <p className="card-text">React Demo Application protected by OpenId Connect with MultipleAuthentication.
                        <br/>For example, config_1 can have other sensitive scope, config_2 does not ask for the &quot;offline_access&quot; so it does not retrieve the most sensitive token &quot;refresh_token&quot; for very sensitive operation, it retrive only access_token valid for a small amout of time.</p>
                    <select value={configurationName} onChange={handleConfigurationChange} >
                        <option value="config_classic">config_classic</option>
                        <option value="config_without_refresh_token">config_without_refresh_token</option>
                        <option value="config_without_silent_login">config_without_silent_login</option>
                        <option value="config_without_refresh_token_silent_login">config_without_refresh_token_silent_login</option>
                        <option value="config_google">google</option>
                        <option value="config_with_hash">config_with_hash</option>
                        <option value="config_show_access_token">config_show_access_token</option>
                    </select>
                    {!isAuthenticated && <button type="button" className="btn btn-primary" onClick={() => login()}>Login</button>}
                    {isAuthenticatedDefault && <button type="button" className="btn btn-primary" onClick={() => login(undefined, { 'test:token_request': 'test', youhou: 'youhou', grant_type: 'tenant', tenantId: '1234' }, true)}>Silent Login</button>}
                    {isAuthenticated && <button type="button" className="btn btn-primary" onClick={() => logout()}>logout</button>}
                </div>
            </div>
        </div>
    );
};

if (!sessionStorage.configurationName) {
    sessionStorage.configurationName = 'config_classic';
}
const getRandomInt = (max) => {
    return Math.floor(Math.random() * max);
};

function reducer(state, action) {
    switch (action.type) {
        case 'event':
        {
            const id = getRandomInt(9999999999999).toString();
            return [{ ...action.data, id, date: Date.now() }, ...state];
        }
        default:
            throw new Error();
    }
}

export const MultiAuthContainer = () => {
    const [isSessionLost, setIsSessionLost] = useState(false);
    const [configurationName, setConfigurationName] = useState(sessionStorage.configurationName);
    const [events, dispatch] = useReducer(reducer, []);
    const callBack = window.location.origin + '/multi-auth/authentification/callback2';
    const silent_redirect_uri = window.location.origin + '/multi-auth/authentification/silent-callback2';
    const configurations = {
        config_classic: {
            ...configurationIdentityServer,
            redirect_uri: callBack,
            silent_redirect_uri,
            scope: 'openid profile email api offline_access',
            client_id: 'interactive.public.short',
        },
        config_without_refresh_token: {
            ...configurationIdentityServer,
            redirect_uri: callBack,
            silent_redirect_uri,
            scope: 'openid profile email api',
        },
        config_without_silent_login: {
            ...configurationIdentityServer,
            redirect_uri: callBack,
            silent_redirect_uri: '',
            scope: 'openid profile email api offline_access',
        },
        config_without_refresh_token_silent_login: {
            ...configurationIdentityServer,
            redirect_uri: callBack,
            silent_redirect_uri: '',
            scope: 'openid profile email api',
},
        config_show_access_token: {
            ...configurationIdentityServer,
            redirect_uri: callBack,
            silent_redirect_uri,
        },
        config_google: { ...configurationGoogle },
        config_with_hash: { ...configurationIdentityServerWithHash },
    };
    const handleConfigurationChange = (event) => {
        const configurationName = event.target.value;
        sessionStorage.configurationName = configurationName;
        setConfigurationName(configurationName);
    };

    const onSessionLost = () => {
        setIsSessionLost(true);
    };
    const onEvent = (configurationName, eventName, data) => {
        // console.log(`oidc:${configurationName}:${eventName}`, data);
        dispatch({ type: 'event', data: { name: `oidc:${configurationName}:${eventName}`, data } });
    };

    return (
        <>
        <OidcProvider configuration={configurations[configurationName]}
                      configurationName={configurationName}
                      loadingComponent={Loading}
                      authenticatingErrorComponent={AuthenticatingError}
                      authenticatingComponent={Authenticating}
                      serviceWorkerNotSupportedComponent={ServiceWorkerNotSupported}
                      callbackSuccessComponent={CallBackSuccess}
                      onSessionLost={onSessionLost}
                      onEvent={onEvent}
                      fetch={fetchWithLogs(fetch)}
        >
            { isSessionLost && <SessionLost configurationName={configurationName}/>}
            <MultiAuth configurationName={configurationName} handleConfigurationChange={handleConfigurationChange} />
            <DisplayAccessToken configurationName={configurationName} />
        </OidcProvider>
            <div className="container-fluid mt-3">
                <div className="card">
                    <div className="card-body" >
                        <h5 className="card-title">Current configuration Events</h5>
                        <div style={{ overflowX: 'hidden', overflowY: 'scroll', maxHeight: '400px' }}>
                            {events.map(e => {
                                const date = new Date(e.date);
                                const dateFormated = `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
                                return <p key={e.id}>{dateFormated} {e.name}: { JSON.stringify(e.data)}</p>;
                            })}
                        </div>
                    </div>
                </div>
            </div>
    </>
    );
};

const DisplayAccessToken = ({ configurationName }) => {
    const { accessToken, accessTokenPayload } = useOidcAccessToken(configurationName);
    const { idTokenPayload } = useOidcIdToken(configurationName);

    if (!accessToken) {
        return <p>you are not authentified</p>;
    }
    return (
        <div className="card text-white bg-info mb-3">
            <div className="card-body">
                <h5 className="card-title">Access Token</h5>
                <p style={{ color: 'red', backgroundColor: 'white' }}>Please consider to configure the ServiceWorker in order to protect your application from XSRF attacks. &quot;access_token&quot; and &quot;refresh_token&quot; will never be accessible from your client side javascript.</p>
                {<p className="card-text">Access Token: {JSON.stringify(accessToken)}</p>}
                {accessTokenPayload != null && <p className="card-text">Access Token Payload: {JSON.stringify(accessTokenPayload)}</p>}
                <h5 className="card-title">Id Token</h5>
                {idTokenPayload != null && <p className="card-text">Access Token Payload: {JSON.stringify(idTokenPayload)}</p>}
            </div>
        </div>
    );
};

import { getParseQueryStringFromLocation, OidcClient } from '@axa-fr/oidc-client';
import { ComponentType, useEffect } from 'react';

const SilentLogin: ComponentType<any> = ({ configurationName }) => {
    const queryParams = getParseQueryStringFromLocation(window.location.href);

    const getOidc = OidcClient.get;
    const oidc = getOidc(configurationName);

    let extras = null;

    for (const [key, value] of Object.entries(queryParams)) {
        if (key === 'state' || key === 'scope') {
            continue;
        }
        if (extras === null) {
            extras = {};
        }
        extras[key] = value;
    }

    useEffect(() => {
        if (!oidc.tokens) {
            oidc.loginAsync(null, extras, true, queryParams.scope);
        }
    }, []);

    return <></>;
};

export default SilentLogin;

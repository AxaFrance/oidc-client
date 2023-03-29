import { ComponentType, useEffect } from 'react';

import { getParseQueryStringFromLocation } from '../../vanilla/route-utils.js';
import { VanillaOidc } from '../../vanilla/vanillaOidc.js';

const SilentLogin: ComponentType<any> = ({ configurationName }) => {
    const queryParams = getParseQueryStringFromLocation(window.location.href);

    const getOidc = VanillaOidc.get;
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

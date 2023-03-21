import { ComponentType, useEffect } from 'react';

import { VanillaOidc } from '../../vanilla/vanillaOidc.js';

const SilentCallbackManager: ComponentType<any> = ({ configurationName }) => {
    useEffect(() => {
        const playCallbackAsync = async () => {
            const getOidc = VanillaOidc.get;
            const oidc = getOidc(configurationName);
            oidc.silentLoginCallbackAsync();
        };
        playCallbackAsync();
    }, []);

    return <></>;
};

export default SilentCallbackManager;

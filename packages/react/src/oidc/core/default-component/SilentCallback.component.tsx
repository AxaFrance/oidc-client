import { ComponentType, useEffect } from 'react';

import { VanillaOidc } from '../../vanilla/vanillaOidc';

const CallbackManager: ComponentType<any> = ({ configurationName }) => {
    useEffect(() => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        let isMounted = true;
        const playCallbackAsync = async () => {
            const getOidc = VanillaOidc.get;
            const oidc = getOidc(configurationName);
            oidc.silentLoginCallbackAsync();
        };
        playCallbackAsync();
        return () => {
            isMounted = false;
        };
    }, []);

    return <></>;
};

export default CallbackManager;

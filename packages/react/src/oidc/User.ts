import { useEffect, useState } from 'react';

import { OidcUserInfo, VanillaOidc } from './vanilla/vanillaOidc.js';

export enum OidcUserStatus {
    Unauthenticated= 'Unauthenticated',
    Loading = 'Loading user',
    Loaded = 'User loaded',
    LoadingError = 'Error loading user'
}

export type OidcUser<T extends OidcUserInfo = OidcUserInfo> = {
    user: T;
    status: OidcUserStatus;
}

export const useOidcUser = <T extends OidcUserInfo = OidcUserInfo>(configurationName = 'default') => {
    const [oidcUser, setOidcUser] = useState<OidcUser<T>>({ user: null, status: OidcUserStatus.Unauthenticated });

    const oidc = VanillaOidc.get(configurationName);
    useEffect(() => {
        let isMounted = true;
        if (oidc && oidc.tokens) {
            setOidcUser({ ...oidcUser, status: OidcUserStatus.Loading });
            oidc.userInfoAsync()
                .then((info) => {
                    if (isMounted) {
                        // @ts-ignore
                        setOidcUser({ user: info, status: OidcUserStatus.Loaded });
                    }
                })
                .catch(() => setOidcUser({ ...oidcUser, status: OidcUserStatus.LoadingError }));
        }
        return () => { isMounted = false; };
    }, []);

    return { oidcUser: oidcUser.user, oidcUserLoadingState: oidcUser.status };
};

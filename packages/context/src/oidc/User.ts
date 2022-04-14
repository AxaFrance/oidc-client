import { useEffect, useState} from "react";
import Oidc from "./vanilla/oidc";

export enum OidcUserStatus {
    Unauthenticated= 'Unauthenticated',
    Loading = 'Loading user',
    Loaded = 'User loaded',
    LoadingError = 'Error loading user'
}

export type OidcUser = {
    user: any,
    status: OidcUserStatus
}

export const useOidcUser = (configurationName="default") => {
    const [oidcUser, setOidcUser] = useState<OidcUser>({user: null, status: OidcUserStatus.Unauthenticated});

    const oidc = Oidc.get(configurationName);
    useEffect(() => {
        let isMounted = true;

        if(oidc && oidc.tokens) {
            setOidcUser({...oidcUser, status: OidcUserStatus.Loading});
            oidc.userInfoAsync()
                .then((info) => {
                    if (isMounted) {
                        setOidcUser({user: info, status: OidcUserStatus.Loaded});
                    }
                })
                .catch(() => setOidcUser({...oidcUser, status: OidcUserStatus.LoadingError}));
        }

        return  () => { isMounted = false };
    }, []);

    return {oidcUser: oidcUser.user, oidcUserLoadingState: oidcUser.status}
}

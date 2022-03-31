import { useEffect, useState} from "react";
import Oidc from "./vanilla/oidc";

export enum UserStatus {
    Unauthenticated= 'Unauthenticated',
    Loading = 'Loading user',
    Loaded = 'User loaded'
}

type OidcUser = {
    user: any,
    status: UserStatus
}

export const useOidcUser = (configurationName="default") => {
    const [oidcUser, setOidcUser] = useState<OidcUser>({user: null, status: UserStatus.Unauthenticated});

    const oidc = Oidc.get(configurationName);
    useEffect(() => {
        let isMounted = true;

        if(oidc && oidc.tokens) {
            setOidcUser({...oidcUser, status: UserStatus.Loading});
            oidc.userInfoAsync()
                .then((info) => {
                    if (isMounted) {
                        setOidcUser({user: info, status: UserStatus.Loaded});
                    }
                })
                .catch(() => setOidcUser({...oidcUser, status: UserStatus.Unauthenticated}));
        }

        return  () => { isMounted = false };
    }, []);

    return {oidcUser: oidcUser.user, isOidcUserLoading: oidcUser.status}
}

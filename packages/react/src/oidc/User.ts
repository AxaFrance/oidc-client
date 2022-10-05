import { useEffect, useState} from "react";
import Oidc from "./vanilla/oidc";

export enum OidcUserStatus {
    Unauthenticated= 'Unauthenticated',
    Loading = 'Loading user',
    Loaded = 'User loaded',
    LoadingError = 'Error loading user'
}

export type OidcUser = {
    user: OidcUserInfo,
    status: OidcUserStatus
}

export interface OidcUserInfo {
    sub: string;
    name?: string;
    given_name?: string;
    family_name?: string;
    middle_name?: string;
    nickname?: string;
    preferred_username?: string;
    profile?: string;
    picture?: string;
    website?: string;
    email?: string;
    email_verified?: boolean;
    gender?: string;
    birthdate?: string;
    zoneinfo?: string;
    locale?: string;
    phone_number?: string;
    phone_number_verified?: boolean;
    address?: OidcAddressClaim;
    updated_at?: number;
}

export interface OidcAddressClaim {
    formatted?: string;
    street_address?: string;
    locality?: string;
    region?: string;
    postal_code?: string;
    country?: string;
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

import { type OidcUserInfo, OidcClient } from '@axa-fr/oidc-client';
import { useEffect, useState } from 'react';

export enum OidcUserStatus {
    Unauthenticated= 'Unauthenticated',
    Loading = 'Loading user',
    Loaded = 'User loaded',
    LoadingError = 'Error loading user'
}

export type OidcUser<T extends OidcUserInfo = OidcUserInfo> = {
    user: T | null;
    status: OidcUserStatus;
}

export const useOidcUser = <T extends OidcUserInfo = OidcUserInfo>(configurationName = 'default') => {
    const [oidcUser, setOidcUser] = useState<OidcUser<T>>({ user: null, status: OidcUserStatus.Unauthenticated });
    const [oidcUserId, setOidcUserId] = useState<string>('');

    const oidc = OidcClient.get(configurationName);
    useEffect(() => {
        let isMounted = true;
        if (oidc && oidc.tokens) {
            setOidcUser({ ...oidcUser, status: OidcUserStatus.Loading });
            const isNoCache = oidcUserId !== '';
            oidc.userInfoAsync(isNoCache)
                .then((info) => {
                    if (isMounted) {
                        // @ts-ignore
                        setOidcUser({ user: info, status: OidcUserStatus.Loaded });
                    }
                })
                .catch(() => setOidcUser({ ...oidcUser, status: OidcUserStatus.LoadingError }));
        } else {
            setOidcUser({ user: null, status: OidcUserStatus.Unauthenticated });
        }

        const newSubscriptionId = oidc.subscribeEvents((name: string, data: any) => {
            console.log(`Event ${name} has been raised`);
            if (name == OidcClient.eventNames.tryKeepExistingSessionAsync_end) {
                if (isMounted) {
                    reloadOidcUser();
                }
            }
        });
        
        return () => { 
            isMounted = false;
            oidc.removeEventSubscription(newSubscriptionId);
        };
    }, [oidcUserId]);

    const reloadOidcUser = () => {
        setOidcUserId(oidcUserId + ' ');
    };

    return { oidcUser: oidcUser.user, oidcUserLoadingState: oidcUser.status, reloadOidcUser };
};

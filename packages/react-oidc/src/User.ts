import { OidcClient, type OidcUserInfo } from '@axa-fr/oidc-client';
import { useEffect, useState } from 'react';

export enum OidcUserStatus {
  Unauthenticated = 'Unauthenticated',
  Loading = 'Loading user',
  Loaded = 'User loaded',
  LoadingError = 'Error loading user',
}

export type OidcUser<T extends OidcUserInfo = OidcUserInfo> = {
  user: T | null;
  status: OidcUserStatus;
};

export const useOidcUser = <T extends OidcUserInfo = OidcUserInfo>(
  configurationName = 'default',
  demonstrating_proof_of_possession = false,
) => {
  const oidc = OidcClient.get(configurationName);
  const user = oidc.userInfo<T>();
  const [oidcUser, setOidcUser] = useState<OidcUser<T>>({
    user: user,
    status: user ? OidcUserStatus.Loaded : OidcUserStatus.Unauthenticated,
  });
  const [oidcUserId, setOidcUserId] = useState<number>(user ? 1 : 0);
  const [oidcPreviousUserId, setPreviousOidcUserId] = useState<number>(user ? 1 : 0);

  useEffect(() => {
    const oidc = OidcClient.get(configurationName);
    let isMounted = true;

    const loadUser = async () => {
      if (oidc && oidc.tokens) {
        const isCache = oidcUserId === oidcPreviousUserId;
        if (isCache && oidc.userInfo<T>()) {
          return;
        }

        try {
          const info = await oidc.userInfoAsync(!isCache, demonstrating_proof_of_possession);
          if (isMounted) {
            // @ts-ignore
            setOidcUser({ user: info, status: OidcUserStatus.Loaded });
          }
        } catch {
          if (isMounted) {
            setOidcUser(prev => ({ ...prev, status: OidcUserStatus.LoadingError }));
          }
        }
        setPreviousOidcUserId(oidcUserId);
      } else {
        if (isMounted) {
          setOidcUser({ user: null, status: OidcUserStatus.Unauthenticated });
        }
      }
    };

    loadUser();

    const newSubscriptionId = oidc.subscribeEvents((name: string) => {
      if (
        name === OidcClient.eventNames.logout_from_another_tab ||
        name === OidcClient.eventNames.logout_from_same_tab
      ) {
        if (isMounted) {
          setOidcUser({ user: null, status: OidcUserStatus.Unauthenticated });
        }
      }
    });
    return () => {
      isMounted = false;
      oidc.removeEventSubscription(newSubscriptionId);
    };
  }, [oidcUserId, configurationName, demonstrating_proof_of_possession, oidcPreviousUserId]);

  const reloadOidcUser = () => {
    setOidcUserId(oidcUserId + 1);
  };

  return { oidcUser: oidcUser.user, oidcUserLoadingState: oidcUser.status, reloadOidcUser };
};

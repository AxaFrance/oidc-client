import { OidcClient, StringMap } from '@axa-fr/oidc-client';
import { FC, PropsWithChildren, useEffect } from 'react';

export type OidcSecureProps = {
  callbackPath?: string;
  extras?: StringMap;
  configurationName?: string;
};

export const OidcSecure: FC<PropsWithChildren<OidcSecureProps>> = ({
  children,
  callbackPath = null,
  extras = null,
  configurationName = 'default',
}) => {
  // Keep the previous fail-fast behaviour: this component cannot
  // meaningfully render without an initialized OIDC configuration.
  const getOidc = OidcClient.getOrThrow;
  const oidc = getOidc(configurationName);
  useEffect(() => {
    // Skip auto re-login while a logout flow is in progress: in that window
    // `tokens` has just been cleared but the browser has not yet navigated to
    // the identity provider's end-session endpoint, and starting a new auth
    // flow here would race the logout navigation (see issue #1677).
    if (!oidc.tokens && !oidc.isLoggingOut) {
      oidc.loginAsync(callbackPath, extras);
    }
  }, [configurationName, callbackPath, extras]);

  if (!oidc.tokens) {
    return null;
  }
  return <>{children}</>;
};

export const withOidcSecure =
  (
    WrappedComponent: FC<PropsWithChildren<OidcSecureProps>>,
    callbackPath = null,
    extras = null,
    configurationName = 'default',
  ) =>
  props => {
    return (
      <OidcSecure callbackPath={callbackPath} extras={extras} configurationName={configurationName}>
        <WrappedComponent {...props} />
      </OidcSecure>
    );
  };

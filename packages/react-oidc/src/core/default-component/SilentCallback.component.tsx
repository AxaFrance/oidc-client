import { OidcClient } from '@axa-fr/oidc-client';
import { FC, useEffect } from 'react';

export interface SilentCallbackProps {
    configurationName: string;
  }

const SilentCallbackManager: FC<SilentCallbackProps> = ({ configurationName }) => {
    useEffect(() => {
        const playCallbackAsync = async () => {
            const oidc = OidcClient.get(configurationName);
            oidc.silentLoginCallbackAsync();
        };

        playCallbackAsync().catch(error => {
            console.error('Error during silent login callback:', error);
        });

    }, [configurationName]);

    return null;
};

export default SilentCallbackManager;

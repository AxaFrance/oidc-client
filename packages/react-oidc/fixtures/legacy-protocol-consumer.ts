// Frozen consumer imports from main f44fd4a6, before RFC 8707 support.
import {
  type MessageData,
  type MessageEventData,
  type MessageEventType,
  type Nonce,
  type OidcConfiguration,
  type OidcServerConfiguration,
  type Status,
  PROTOCOL_VERSION,
  ServiceWorkerMessageType,
  type ServiceWorkerMessageTypeKey,
  type ServiceWorkerMessageTypeValue,
  type ServiceWorkerMessage,
  type ServiceWorkerResponse,
  TOKEN_PLACEHOLDERS,
  DPOP_TOKEN_PLACEHOLDER_PREFIX,
  STORAGE_KEY_PREFIX,
  SW_CONTROLLER_CHANGE_RELOAD_COUNT_KEY,
  buildStorageKey,
  buildSecuredTokenPlaceholder,
  buildDpopSecuredPlaceholder,
  isServiceWorkerMessageType,
  type ServiceWorkerMessageEventType,
} from '../../oidc-client-service-worker/dist/protocol.js';

export const legacyInit: ServiceWorkerMessage = {
  type: ServiceWorkerMessageType.INIT,
  configurationName: 'legacy',
  data: {
    where: 'tryKeepExistingSessionAsync',
    oidcConfiguration: {
      token_renew_mode: 'access_token_invalid',
      demonstrating_proof_of_possession: false,
    },
    oidcServerConfiguration: {
      issuer: 'https://issuer.example.com',
      authorizationEndpoint: 'https://issuer.example.com/authorize',
      tokenEndpoint: 'https://issuer.example.com/token',
      revocationEndpoint: 'https://issuer.example.com/revoke',
      userInfoEndpoint: 'https://issuer.example.com/userinfo',
    },
  },
};

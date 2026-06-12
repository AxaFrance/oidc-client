# OIDC Service Worker Message Protocol

> **Stability: Stable** – This protocol is part of the public API as of v7.28.0.
> Breaking changes (renaming a `type`, changing a `data` envelope, removing a storage key) will result in a **semver major** version bump.

This document describes the `postMessage` protocol between the main thread (consumer application) and the OIDC service worker, as well as the `sessionStorage` / `localStorage` key conventions.

## Quick Start

```ts
import { MessageTypes, OidcStorageKeys } from '@axa-fr/oidc-client-service-worker/protocol';

// Retrieve the tab ID for the current configuration
const tabId = sessionStorage.getItem(OidcStorageKeys.tabId('default'));

// Get the active service worker
const registration = await navigator.serviceWorker.getRegistration();
const sw = registration?.active;

// Send a message using the MessageChannel pattern
const response = await new Promise((resolve, reject) => {
  const channel = new MessageChannel();
  channel.port1.onmessage = (event) => resolve(event.data);
  sw.postMessage(
    {
      type: MessageTypes.clear,
      configurationName: 'default',
      tabId,
      data: { status: 'logout' },
    },
    [channel.port2],
  );
});
```

Or use the high-level helper from `@axa-fr/oidc-client`:

```ts
import { OidcClient } from '@axa-fr/oidc-client';

const oidc = OidcClient.get('default');
await oidc.signalServiceWorker('clear', { status: 'logout' });
```

---

## Message Envelope

Every message sent to the service worker **must** follow this shape:

```ts
interface MessageEventData {
  /** The message type (see table below). */
  type: MessageEventType | 'SKIP_WAITING' | 'claim';
  /** The OIDC configuration name (e.g. `'default'`). */
  configurationName: string;
  /** Tab identifier for multi-tab support. */
  tabId?: string;
  /** Payload – shape depends on `type`. */
  data: Record<string, unknown> | null;
}
```

Messages **must** be sent with a `MessageChannel` transfer so the SW can reply:

```ts
const channel = new MessageChannel();
channel.port1.onmessage = (event) => { /* handle response */ };
sw.postMessage(message, [channel.port2]);
```

---

## Message Types

### Lifecycle Messages

| Type | Data | Description | Response |
|------|------|-------------|----------|
| `SKIP_WAITING` | `null` | Forces the waiting SW to activate immediately. | `{}` |
| `claim` | `null` | Claims all open clients so the SW intercepts fetches. | `{}` |

### Data Messages

| Type | Data | Description | Response |
|------|------|-------------|----------|
| `clear` | `{ status: Status }` | Clears all stored tokens, state, nonce, code verifier, and DPoP data. Sets the status. | `{ configurationName }` |
| `init` | `{ oidcServerConfiguration, where, oidcConfiguration }` | Initializes the SW with server configuration (token/revocation/userinfo endpoints) and client options (token renew mode). Returns current tokens if available. | `{ tokens, status, configurationName, version }` |
| `setState` | `{ state: string }` | Stores the PKCE state parameter. | `{ configurationName }` |
| `getState` | `null` | Retrieves the stored state. | `{ configurationName, state }` |
| `setCodeVerifier` | `{ codeVerifier: string }` | Stores the PKCE code verifier. | `{ configurationName }` |
| `getCodeVerifier` | `null` | Retrieves the code verifier (as a secured placeholder). | `{ configurationName, codeVerifier }` |
| `setSessionState` | `{ sessionState: string }` | Stores the OIDC session state for session monitoring. | `{ configurationName }` |
| `getSessionState` | `null` | Retrieves the session state. | `{ configurationName, sessionState }` |
| `setNonce` | `{ nonce: { nonce: string } }` | Stores the nonce for ID token validation. | `{ configurationName }` |
| `getNonce` | `null` | Retrieves the stored nonce (as a secured placeholder). | `{ configurationName, nonce }` |
| `setDemonstratingProofOfPossessionNonce` | `{ demonstratingProofOfPossessionNonce: string }` | Stores the DPoP nonce returned by the AS. | `{ configurationName }` |
| `getDemonstratingProofOfPossessionNonce` | `null` | Retrieves the DPoP nonce. | `{ configurationName, demonstratingProofOfPossessionNonce }` |
| `setDemonstratingProofOfPossessionJwk` | `{ demonstratingProofOfPossessionJwkJson: string }` | Stores the DPoP JWK (JSON stringified). | `{ configurationName }` |
| `getDemonstratingProofOfPossessionJwk` | `null` | Retrieves the DPoP JWK (JSON stringified). | `{ configurationName, demonstratingProofOfPossessionJwkJson }` |

---

## Status Values

The `Status` type used by `clear` and returned by `init`:

| Value | Meaning |
|-------|---------|
| `'LOGGED'` | User is logged in and tokens are available. |
| `'LOGGED_IN'` | Login is in progress / just completed. |
| `'LOGGED_OUT'` | User has been logged out. |
| `'NOT_CONNECTED'` | No session exists. |
| `'LOGOUT_FROM_ANOTHER_TAB'` | Logout triggered from a different tab. |
| `'SESSION_LOST'` | Session was lost (e.g. token expired without renewal). |
| `'REQUIRE_SYNC_TOKENS'` | Tokens need to be synced. |
| `'FORCE_REFRESH'` | Forced token refresh required. |
| `null` | Initial / unset state. |

---

## Storage Key Conventions

The library reads and writes the following keys. Use the `OidcStorageKeys` helper for type-safe access.

### sessionStorage

| Key Pattern | Helper | Description |
|-------------|--------|-------------|
| `oidc.tabId.<config>` | `OidcStorageKeys.tabId(config)` | Unique tab identifier (UUID) for multi-tab login. |
| `oidc.nonce.<config>` | `OidcStorageKeys.nonce(config)` | Nonce fallback when SW loses state. |
| `oidc.state.<config>` | `OidcStorageKeys.state(config)` | PKCE state fallback. |
| `oidc.code_verifier.<config>` | `OidcStorageKeys.codeVerifier(config)` | PKCE code verifier fallback. |
| `oidc.<config>` | `OidcStorageKeys.tokens(config)` | Serialized tokens + status (non-SW mode). |
| `oidc.<config>.userInfo` | `OidcStorageKeys.userInfo(config)` | Cached user info. |
| `oidc.sw.controllerchange_reload_count` | `OidcStorageKeys.swReloadCount()` | Reload loop prevention counter. |
| `oidc.sw.version_mismatch_reload.<config>` | `OidcStorageKeys.swVersionMismatchReload(config)` | Version mismatch reload counter. |

### localStorage

| Key Pattern | Helper | Description |
|-------------|--------|-------------|
| `oidc.login.<config>` | `OidcStorageKeys.login(config)` | Login parameters (extras, scope, callbackPath). |

---

## TypeScript Types

All types are exported from `@axa-fr/oidc-client-service-worker/protocol`:

```ts
import type {
  MessageEventType,
  MessageEventData,
  MessageData,
  Status,
  Nonce,
  OidcServerConfiguration,
  OidcConfiguration,
} from '@axa-fr/oidc-client-service-worker/protocol';

import { MessageTypes, OidcStorageKeys } from '@axa-fr/oidc-client-service-worker/protocol';
```

---

## Versioning Policy

- **Additions** (new message types, new storage keys, new optional fields): minor version bump.
- **Breaking changes** (renamed types, changed data shapes, removed keys): major version bump.
- The service worker package and `@axa-fr/oidc-client` are versioned together.

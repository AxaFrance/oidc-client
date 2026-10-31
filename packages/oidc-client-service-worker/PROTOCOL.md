# Service Worker Protocol

This document describes the public, supported `postMessage` protocol exposed
by the OIDC service worker shipped with `@axa-fr/oidc-client-service-worker`,
together with the storage key conventions used by `@axa-fr/oidc-client`.

The protocol is reachable through the dedicated entry point:

```ts
import {
  PROTOCOL_VERSION,
  ServiceWorkerMessageType,
  ServiceWorkerMessage,
  ServiceWorkerResponse,
  TOKEN_PLACEHOLDERS,
  STORAGE_KEY_PREFIX,
  buildSecuredTokenPlaceholder,
  buildDpopSecuredPlaceholder,
  buildStorageKey,
  isServiceWorkerMessageType,
} from '@axa-fr/oidc-client-service-worker/protocol';
```

`@axa-fr/oidc-client` re-exports the same symbols on its public entry point
for convenience.

## Stability guarantees

The protocol is versioned with [Semantic Versioning](https://semver.org/) via
the exported `PROTOCOL_VERSION` constant.

| Change                                                   | Version bump |
| -------------------------------------------------------- | ------------ |
| Removing a message type, response field or storage key   | major        |
| Renaming or repurposing an existing field                | major        |
| Adding a new message type, response field or helper      | minor        |
| Documentation-only or behaviour-preserving fixes         | patch        |

Any breaking change is announced at least one minor version in advance with
a deprecation notice in the [CHANGELOG](../../CHANGELOG.md), and the
`PROTOCOL_VERSION` major number is bumped on the release that ships the
breaking change.

The wire format itself (string values of `ServiceWorkerMessageType`) is
considered _public_ and stable: tools that rely on the literal strings
`init`, `claim`, `getState`, etc. will continue to work as long as the major
`PROTOCOL_VERSION` is unchanged.

## Resource contexts (protocol 1.1)

`init` adds `resourceTokenManagement: true` and `resourceContexts: string[]`.
The latter lists worker-owned nested context names, without token or key
material. Clients must negotiate the capability on the base configuration
before using resource operations; absence means unsupported, not permission
to use default tokens or browser storage.

The existing message names and placeholders are unchanged. A resource operation
uses a context built with `getResourceContextName(configurationName, resource)`:

```text
default#resource=<encodeURIComponent(resource)>
default#tabId=<effective-tab>#resource=<encodeURIComponent(resource)>
```

The worker validates the resource against the base client's `resources` registry
and maintains a nested entry. The resource suffix does not create a different
tab identity. Tokens carry `resourceContext` metadata: resource, issuer,
client ID, base configuration name, authenticated subject, and grant owner.
A `grantResource` of `null` refers to the default shared grant; a resource URI
refers to an independently authorized grant.

API placeholders require an exact resource-context match, permitted resource
URL mapping, and existing trusted-domain authorization. Resource access tokens
remain masked even if the default configuration exposes its access token.
Resource code/refresh requests must select their intended resource and exact
token endpoint; revocation uses the exact configured revocation endpoint.
DPoP proofs use the real selected token and its grant's key. Token-endpoint
nonces belong to the grant; API nonces are per resource and do not overwrite
the grant nonce. API nonce responses are retained without automatic HTTP retries.
Resource code exchange requires a fresh ID token with the transaction nonce and
parent subject. Resource refresh responses may omit ID tokens; retained identity
claims do not make an expired ID token invalidate a fresh resource access token.

`clear` on a resource resets only that entry and rejects its late responses.
`clear` on the base configuration removes all nested entries. The worker retains
valid shared refresh rotation if only the requesting resource was cleared.
Malformed resource contexts and initialization failures return logged error
responses. These additions do not make worker memory persistent; stale
placeholders cannot restore a lost parent grant.

## Message envelope

Every message sent _to_ the service worker conforms to the following shape
(see also `ServiceWorkerMessage` in the typings):

```ts
interface ServiceWorkerMessage {
  type: ServiceWorkerMessageTypeValue; // see table below
  configurationName: string;           // OIDC configuration identifier
  data: object | null;                 // payload, depends on `type`
  tabId?: string;                      // optional tab id (defaults to "default")
}
```

Every message is sent through a `MessageChannel`; the service worker replies
on `port2` exactly once. Responses always include a top-level
`configurationName` (when applicable) and may include `error` if the SW
could not service the request.

Use [`OidcClient.signalServiceWorker`](../../packages/oidc-client/README.md)
to send a message without having to manage the channel yourself.

## Message types

| `ServiceWorkerMessageType` | Wire value (`type`) | Description |
| -------------------------- | ------------------- | ----------- |
| `SKIP_WAITING`             | `SKIP_WAITING`      | Lifecycle: ask the worker to call `skipWaiting()`. |
| `CLAIM`                    | `claim`             | Lifecycle: ask the worker to claim the current page. |
| `CLEAR`                    | `clear`             | Reset the in-memory entry for `configurationName` (tokens, state, nonce, DPoP, …). |
| `INIT`                     | `init`              | Provide the OIDC server configuration; returns the masked tokens and the SW version. |
| `SET_STATE` / `GET_STATE`  | `setState` / `getState` | Persist / retrieve the OAuth `state` value. |
| `SET_CODE_VERIFIER` / `GET_CODE_VERIFIER` | `setCodeVerifier` / `getCodeVerifier` | Persist / retrieve the PKCE code verifier. |
| `SET_SESSION_STATE` / `GET_SESSION_STATE` | `setSessionState` / `getSessionState` | Persist / retrieve the `session_state` claim. |
| `SET_NONCE` / `GET_NONCE`  | `setNonce` / `getNonce` | Persist / retrieve the OIDC nonce. |
| `SET_DPOP_NONCE` / `GET_DPOP_NONCE` | `setDemonstratingProofOfPossessionNonce` / `getDemonstratingProofOfPossessionNonce` | Persist / retrieve the DPoP server nonce. |
| `SET_DPOP_JWK` / `GET_DPOP_JWK` | `setDemonstratingProofOfPossessionJwk` / `getDemonstratingProofOfPossessionJwk` | Persist / retrieve the JSON serialised DPoP JWK. |

### Payloads

Below are the supported `data` payloads. All others fields on `data` are
ignored; sending unknown extra fields is allowed and will not cause a
protocol-version bump.

| Type | Request payload | Response payload |
| ---- | --------------- | ---------------- |
| `SKIP_WAITING` | `null` | `{}` |
| `claim` | `null` | `{}` |
| `clear` | `{ status: Status }` | `{ configurationName }` |
| `init`  | `{ oidcServerConfiguration, oidcConfiguration, where }` | `{ configurationName, tokens, status, version }` |
| `setState` | `{ state: string }` | `{ configurationName }` |
| `getState` | `null` | `{ configurationName, state }` |
| `setCodeVerifier` | `{ codeVerifier: string }` | `{ configurationName }` |
| `getCodeVerifier` | `null` | `{ configurationName, codeVerifier }` |
| `setSessionState` | `{ sessionState: string }` | `{ configurationName }` |
| `getSessionState` | `null` | `{ configurationName, sessionState }` |
| `setNonce` | `{ nonce: { nonce: string } }` | `{ configurationName }` |
| `getNonce` | `null` | `{ configurationName, nonce }` |
| `setDemonstratingProofOfPossessionNonce` | `{ demonstratingProofOfPossessionNonce: string }` | `{ configurationName }` |
| `getDemonstratingProofOfPossessionNonce` | `null` | `{ configurationName, demonstratingProofOfPossessionNonce }` |
| `setDemonstratingProofOfPossessionJwk` | `{ demonstratingProofOfPossessionJwkJson: string }` | `{ configurationName }` |
| `getDemonstratingProofOfPossessionJwk` | `null` | `{ configurationName, demonstratingProofOfPossessionJwkJson }` |

## Token placeholders

Secret values (access token, refresh token, nonce, code verifier) are never
returned to the page. Instead, the service worker emits stable placeholder
strings that are recognised when the page later sends a `fetch`/`request` to
a trusted endpoint:

```text
ACCESS_TOKEN_SECURED_BY_OIDC_SERVICE_WORKER_<configurationName>#tabId=<tabId>
REFRESH_TOKEN_SECURED_BY_OIDC_SERVICE_WORKER_<configurationName>#tabId=<tabId>
NONCE_SECURED_BY_OIDC_SERVICE_WORKER_<configurationName>#tabId=<tabId>
CODE_VERIFIER_SECURED_BY_OIDC_SERVICE_WORKER_<configurationName>#tabId=<tabId>
DPOP_SECURED_BY_OIDC_SERVICE_WORKER_<configurationName>#tabId=<tabId>
```

Use `buildSecuredTokenPlaceholder(TOKEN_PLACEHOLDERS.<KIND>, configurationName, tabId)`
or `buildDpopSecuredPlaceholder(configurationName, tabId)` to construct the
exact string a consumer will receive.

## Storage key conventions

When the service worker is unavailable (or during graceful fallback paths),
`@axa-fr/oidc-client` mirrors the same data into Web Storage. The exported
`STORAGE_KEY_PREFIX` map plus the `buildStorageKey(prefix, configurationName)`
helper produce the canonical key:

| Symbol | Storage | Pattern |
| ------ | ------- | ------- |
| `STORAGE_KEY_PREFIX.TAB_ID`                     | `sessionStorage` | `oidc.tabId.<configurationName>` |
| `STORAGE_KEY_PREFIX.STATE`                      | `sessionStorage` | `oidc.state.<configurationName>` |
| `STORAGE_KEY_PREFIX.NONCE`                      | `sessionStorage` | `oidc.nonce.<configurationName>` |
| `STORAGE_KEY_PREFIX.CODE_VERIFIER`              | `sessionStorage` | `oidc.code_verifier.<configurationName>` |
| `STORAGE_KEY_PREFIX.LOGIN_PARAMS`               | `localStorage`   | `oidc.login.<configurationName>` |
| `STORAGE_KEY_PREFIX.SW_VERSION_MISMATCH_RELOAD` | `sessionStorage` | `oidc.sw.version_mismatch_reload.<configurationName>` |
| `SW_CONTROLLER_CHANGE_RELOAD_COUNT_KEY`         | `sessionStorage` | `oidc.sw.controllerchange_reload_count` |

The `oidc.` namespace is reserved by the library; consumers should not write
keys under it directly.

## High-level helper

For most use-cases, prefer the high-level helper exposed by
`OidcClient`:

```ts
import { ServiceWorkerMessageType } from '@axa-fr/oidc-client-service-worker/protocol';

const oidcClient = OidcClient.get();

const response = await oidcClient.signalServiceWorker({
  type: ServiceWorkerMessageType.GET_STATE,
  data: null,
});

console.log(response.state);
```

`signalServiceWorker` resolves with the response sent by the SW, rejects on
timeout (default 5 s) or when the SW is not registered.

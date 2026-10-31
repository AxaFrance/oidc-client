# Local OpenIddict demo server

This .NET 10 / OpenIddict fixture runs the React and native demos locally without
changing their production Duende settings. It is **not a production identity
server**: sign-in creates a fictional Alice session without credentials.

## Start from the repository root

Install the .NET 10 SDK, the Node version required by the root manifest, and pnpm.
Then run:

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm demo:server
```

Keep that terminal running. In two other terminals:

```sh
pnpm demo:react
pnpm demo:native
```

These scripts refresh each demo's worker assets and require the registered ports
instead of silently selecting a different port. The end-to-end runner uses the
same commands.

| Component | URL |
| --- | --- |
| Authority, discovery, login and OAuth endpoints | `http://localhost:7001/` |
| React resource playground | `http://localhost:5173/resources` |
| Native demo and resource playground | `http://localhost:5174/` |
| Orders resource / API | `http://localhost:7002/` / `http://localhost:7002/api/orders?limit=2` |
| Inventory resource / API | `http://localhost:7003/` / `http://localhost:7003/api/inventory` |

Use the exact `localhost` origins and ports: these are the registered callbacks
and CORS origins. The server binds only loopback and refuses non-Development
startup and non-loopback callers/hosts.

## Provider and mode selection

Development defaults to OpenIddict; production builds default to Duende.
Set `VITE_OIDC_PROVIDER=duende` before starting Vite to use the online provider
locally, or explicitly select `openiddict` when building a local preview.
Production never adds localhost to its worker trust rules.

Open either demo with `?dpop=true&worker=on`, `?dpop=true&worker=off`,
`?dpop=false&worker=on`, or `?dpop=false&worker=off`. These local choices persist
in session storage across OAuth redirects. Log out and clear site storage when
switching providers. Invalid settings fail explicitly; remove
`oidc-demo-options` if saved settings are malformed.

OpenIddict rejects fragment-bearing OAuth callbacks. The native local callback
is `/authentication/callback`; React's local hash example uses
`/multi-auth/authentification/hash-callback`. Online legacy hash callbacks remain
unchanged. The local Google-labeled scenario uses the synthetic `local.google`
public client, **not Google's identity service or a client secret**.

The multi-tab example deliberately keeps separate per-tab grants. A second tab
selects the same named configuration and signs in using the existing Alice
cookie; it does not automatically adopt the first tab's tokens.

## RFC 8707 walkthrough

Sign in as Alice, then:

1. **Call both APIs**: acquire distinct Orders and Inventory tokens. Inspect
   audience/resource, scopes, token ID, subject, client and token type, not token
   values. Resource identifiers include the trailing slash that OpenIddict
   registers through its canonical absolute URI representation.
2. **Renew Orders**: rotate the shared refresh grant without replacing Inventory.
   The server retains all originally granted scopes/resources in rotated refresh
   tokens and narrows each access token to the selected API.
3. Wait beyond the short access-token lifetimes and call again to exercise renewal.
   Orders tokens last 15 seconds; Inventory tokens last 20 seconds.
4. **Clear Orders**: remove its local entry without clearing Inventory or logging
   out. Call again to reacquire it.
5. **Test wrong destination**: the client rejects the request before dispatch.
6. **Test provider error**: the configured unsupported resource receives an
   explicit `invalid_target`; no default audience token is substituted.

This fixture implements native OpenIddict resource registration, client resource
permissions, repeated authorization/PAR resource parameters, PKCE code exchange,
refresh rotation, userinfo, revocation and logout. It does not implement token
exchange. Refresh requires `offline_access`; additional silent authorization
requires an existing Alice session and enabled silent callbacks.

The React Multi Auth page also exposes these controls for its selected named
configuration. Use `config_without_refresh_token` to exercise successful
additional silent authorization and renewal without a refresh grant, and
`config_without_discovery` to use explicitly configured local endpoints.

## DPoP and session-monitoring limitations

OpenIddict's native confirmation validator supports certificate-bound tokens,
not this DPoP integration. The fixture substitutes a **custom demo-only adapter**
for that validator, leaving signature, issuer, audience, lifetime and token-entry
validation enabled. Access tokens contain `cnf.jkt`, token responses use `DPoP`,
and every bound API/userinfo request must pass the adapter.

The adapter checks ES256/RS256 signatures, public keys, key binding, method,
query/fragment-free `htu`, timestamp, replay identifier and access-token hash.
Orders and Inventory challenge independently with `DPoP-Nonce`; the demo retries
one challenge explicitly. This is not native OpenIddict DPoP support or a
production-ready RFC 9449 implementation. There is no distributed replay store,
durable nonce/key service or real user authentication.

Likewise, `check_session_iframe` is a small custom local session-cookie adapter,
not native OpenIddict session management. Browser third-party-cookie policies
still apply to real cross-site deployments.

SQLite state lives in ignored `.data/`; signing/encryption keys are ephemeral.
Restarting requires fresh authentication. No database, keys, cookies, raw tokens,
browser traces or credential-bearing logs should be published.

## Verification and evidence

```sh
pnpm test:server
pnpm exec playwright install chromium
pnpm test:e2e
```

The E2E command starts and stops its own three servers; stop manually started
instances first. It exercises both demos in Bearer/DPoP and browser/worker modes,
the React named scenarios and protected/userinfo routes. Credential-masked PNGs
are saved in [the screenshot folder](../e2e/screenshots/); GitHub Actions uploads
only those PNGs, never traces or raw error snapshots.

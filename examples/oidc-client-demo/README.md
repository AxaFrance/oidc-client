# Vanilla OIDC client demo

This Vite application demonstrates `@axa-fr/oidc-client` without a UI framework.
It creates an OIDC client, starts login, processes the callback, restores an existing
session, and signs out. The implementation is in [`src/index.tsx`](src/index.tsx).

For the library API and authentication flow, see the
[OIDC client documentation](../../packages/oidc-client/README.md).
For workspace requirements and other examples, see the [repository README](../../README.md).

## Run locally

Run these commands from the **repository root**, using the Node.js version required
by the [root package manifest](../../package.json):

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm build
pnpm --dir examples/oidc-client-demo start
```

Open the URL printed by Vite, normally `http://localhost:5173`. No port is fixed in
[`vite.config.js`](vite.config.js); if that port is busy, Vite may choose another.
The origin you use must match the identity provider's client registration.

## Configuration and callbacks

The `configuration` object in [`src/index.tsx`](src/index.tsx) uses the external
[Duende demo provider](https://demo.duendesoftware.com) with client ID
`interactive.public.short` and scopes `openid profile email api offline_access`.
Use the sign-in options published by that provider; this repository does not
manage its accounts, availability, or allowed redirect URLs.

The callback URLs are built from `window.location.origin`. At the usual Vite
origin, they are:

| Purpose         | Configured URL                                           |
| --------------- | -------------------------------------------------------- |
| Login callback  | `http://localhost:5173/#/authentication/callback`        |
| Silent callback | `http://localhost:5173/#/authentication/silent-callback` |

These are the demo's existing hash-based URLs, not a recommendation for a new
client registration. OAuth redirect URIs must not contain fragments, and a
provider may reject this pattern. For a provider that requires path-based
callbacks, update both the configuration and callback handling before registering
the URLs.

When using your own provider:

- Register a public browser client using Authorization Code with PKCE, not a
  confidential client requiring a secret in browser code.
- Set `authority`, `client_id`, scopes, and callbacks to match that registration.
  Allow the browser origin through the provider's CORS settings and register any
  post-logout return URLs you use.
- Enable refresh tokens and the relevant scopes if you want to test renewal with
  `offline_access`. Silent sign-in also depends on provider session cookies and
  browser cookie restrictions.
- Update [`public/OidcTrustedDomains.js`](public/OidcTrustedDomains.js) to allow
  only the OIDC endpoints and API destinations you trust.

This demo sets `service_worker_relative_url` to `/OidcServiceWorker.js` and
`service_worker_only` to `true`: it requires service worker support and a secure
context, such as HTTPS or localhost. See the
[service worker documentation](../../packages/oidc-client-service-worker/README.md)
before changing its trust rules.

## Walkthrough

1. Open the home page and select **Login**. The client redirects to the provider.
2. Complete the provider's sign-in flow. The callback calls
   `loginCallbackAsync()`, returns to `/`, and displays the client token object.
   In service worker mode, protected token values are represented by placeholders,
   not the underlying access or refresh tokens.
3. Reload the page to exercise `tryKeepExistingSessionAsync()`.
4. Select **Logout** to call `logoutAsync()`.
5. Use browser developer tools to inspect redirects, the worker registration, and
   network requests. If login fails, first check the actual origin, registered
   callback URLs, provider availability, and worker trust configuration.

## Educational code, not a production template

The **Game Hack Challenge** deliberately evaluates text entered in a textarea.
The development CSP allows `'unsafe-eval'` for that exercise. Run only code you
understand, locally and with test accounts; do not paste untrusted scripts.

Do not copy the evaluator, permissive CSP, or token display into a production
application. A service worker can reduce token exposure, but it does not eliminate
XSS or prevent malicious page code from making authenticated requests.

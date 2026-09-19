# Next.js OIDC demo

This example integrates `@axa-fr/react-oidc` with the Next.js **Pages Router**.
Authentication runs in the browser. It does **not** create a server-side session,
protect server-rendered data, or demonstrate the App Router.

For hooks and components, see the
[React package documentation](../../packages/react-oidc/README.md).
For workspace setup and other examples, see the [repository README](../../README.md).

## Run locally

Run these commands from the **repository root**, using the Node.js version required
by the [root package manifest](../../package.json):

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm build
pnpm --dir examples/nextjs-demo dev
```

Open **http://localhost:3001**. The `dev` script explicitly selects port `3001`,
and the OIDC callback configuration uses that same origin.

## Configuration and provider requirements

[`components/layout.js`](components/layout.js) contains the OIDC configuration.
It uses the external [Duende demo provider](https://demo.duendesoftware.com),
client ID `interactive.public`, and scopes `openid profile email api offline_access`.
Use that provider's published sign-in options; this repository does not manage its
accounts, availability, or client registrations.

The current callback URLs are fixed strings, not derived from the browser origin:

| Purpose         | Configured URL                                          |
| --------------- | ------------------------------------------------------- |
| Login callback  | `http://localhost:3001/#authentication/callback`        |
| Silent callback | `http://localhost:3001/#authentication/silent-callback` |

If you change the host, port, or deployment URL, update the configuration and
provider registration together. OAuth redirect URIs must not contain fragments;
these legacy hash-based callbacks may be rejected by your provider. For a new
integration, use registered path-based callbacks and provide the corresponding
Next.js routes.

For your own provider, register a public browser client supporting Authorization
Code with PKCE, enable the intended scopes and refresh-token support, and allow
the browser origin in its CORS settings. Register any post-logout return URLs you
use. Do not place confidential client secrets in this browser configuration.
Silent sign-in depends on provider session cookies and browser cookie policies.

## How the integration works

1. [`pages/_app.js`](pages/_app.js) dynamically loads the layout with `ssr: false`.
   The layout wraps the page in `OidcProvider`.
2. [`pages/index.js`](pages/index.js) also loads the home component with
   `ssr: false`, keeping the demonstration's authentication UI in the browser.
3. The layout passes `withCustomHistory` to `OidcProvider`. Its `replaceState`
   implementation calls `router.replace({ pathname: url })` and dispatches a
   `popstate` event **after the replacement completes**. This connects the
   library's callback navigation to the Next.js router.
4. [`components/home.js`](components/home.js) wraps the profile in `OidcSecure`
   and reads access-token, ID-token, and user information through React hooks.

Use the source files above as the maintained example rather than copying a
separate layout implementation from this README.

## Walkthrough

1. Open the home page. `OidcSecure` starts authentication when no session exists;
   there is no separate login button on this page.
2. Sign in at the provider and return to the application.
3. Inspect the access-token, ID-token, and user-information cards. Browser console
   messages from `onEvent` show authentication lifecycle events.
4. Reload to observe session restoration. If the callback fails, check the exact
   callback URL, the provider registration, browser cookie restrictions, and the
   console/network logs.

## Security boundaries

Although installation copies worker assets into [`public`](public), the layout
does not configure `service_worker_relative_url`: **service worker token isolation
is not enabled in this demo**. Tokens are accessible to browser JavaScript and
displayed on the page. Copying worker files alone does not enable protection; see
the [service worker documentation](../../packages/oidc-client-service-worker/README.md)
for configuration and trusted-domain requirements.

This is an educational integration, not a production authentication template.
Remove token displays and sensitive debug logging before adapting it. Enforce
authorization independently on APIs and server resources; a browser-side
`OidcSecure` boundary is not server-side access control.

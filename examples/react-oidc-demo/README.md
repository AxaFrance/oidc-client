# React OIDC demo

This Vite application demonstrates `@axa-fr/react-oidc` with React Router:
login and logout, protected components, authenticated requests, token renewal,
service worker options, and multiple named OIDC configurations.

This README is a walkthrough of the demo. For component and hook usage, see the
[React package documentation](../../packages/react-oidc/README.md).
For workspace requirements and the authentication flow, see the
[repository README](../../README.md).

## Run locally

Run these commands from the **repository root**, using the Node.js version required
by the [root package manifest](../../package.json):

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm build
pnpm --dir examples/react-oidc-demo start
```

The start script refreshes the service worker assets before starting Vite. Open
the URL printed in the terminal, normally `http://localhost:5173`.
[`vite.config.js`](vite.config.js) does not fix a port; a busy port may cause Vite
to choose another. Register the actual browser origin with your identity provider.

## Configuration and callbacks

- [`src/configurations.ts`](src/configurations.ts) defines the default provider,
  a hash-routing variant, a configuration without discovery, and a Google example.
- [`src/App.tsx`](src/App.tsx) mounts the default `OidcProvider` and routes.
- [`src/MultiAuth.tsx`](src/MultiAuth.tsx) defines the named configurations used
  by the **Multi Auth** page.
- [`public/OidcTrustedDomains.js`](public/OidcTrustedDomains.js) defines service
  worker trust rules for each configuration name.

The default configuration uses the external
[Duende demo provider](https://demo.duendesoftware.com), client ID
`interactive.public.short`, and scopes `openid profile email api offline_access`.
Use the provider's published sign-in options. Its accounts, availability, and
registered redirect URLs are outside this repository's control.

The following suffixes are appended to `window.location.origin`. For example, the
default login callback is normally
`http://localhost:5173/authentication/callback`.

| Configuration                         | Login callback suffix                                  | Silent callback suffix                                        |
| ------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------- |
| Default                               | `/authentication/callback`                             | `/authentication/silent-callback`                             |
| Multi Auth, except the variants below | `/multi-auth/authentification/callback`                | `/multi-auth/authentification/silent-callback`                |
| `config_with_hash`                    | `/multi-auth/authentification#authentication-callback` | `/multi-auth/authentification#authentication-silent-callback` |
| Google                                | `/multi-auth/callback-google`                          | `/multi-auth/silent-callback-google`                          |

The spelling `authentification` is intentional here: it matches the existing
source. The hash variant also sets `silent_login_uri` to
`/multi-auth/authentification#authentication-silent-login`.
The variants with `without_silent_login` or `without_refresh_token_silent_login`
in their names disable the silent callback.

OAuth redirect URIs must not contain fragments. The hash variant is a legacy
demonstration and may be rejected by your provider; prefer registered path-based
callbacks for a new integration.

To use your own provider, register a **public browser client** supporting
Authorization Code with PKCE. Update the authority, client ID, allowed scopes,
exact redirect URLs, post-logout return URLs, and provider CORS settings for your
origin. Refresh-token, session-monitoring, PAR, and DPoP support depend on the
provider. Silent sign-in can be affected by browser restrictions on third-party
cookies.

The Google entry is not a ready-to-use local registration: configure your own
provider-approved browser flow and allowed URLs. Never ship a confidential client
secret in browser code.

## What to try

| Page or control              | What it demonstrates                                                                                               |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Home**                     | Login returning to `/profile`, several logout options, manual token renewal, and navigation without forcing login. |
| **Profile**                  | Authentication state, token information, and user information.                                                     |
| **Secure Profile Component** | Protecting content with `OidcSecure`.                                                                              |
| **Secure Profile Hoc**       | Protecting content with `withOidcSecure`.                                                                          |
| **Secure User Fetch Hoc**    | Calling the provider's user-info endpoint through `withOidcFetch`.                                                 |
| **Secure User Fetch Hook**   | The same request through `useOidcFetch`.                                                                           |
| **Multi Auth**               | Switching between named configurations and observing their independent authentication state.                       |

Start with **Login** on Home, inspect Profile, and then try a protected page after
logging out. Return to Home to renew tokens manually. The **Default configuration
Events** panel shows lifecycle events; Multi Auth adds a panel for its selected
configuration.

In Multi Auth, compare configurations with and without refresh tokens or silent
sign-in, then explore session monitoring, hash callbacks, token visibility,
separate OIDC/API trust rules, DPoP, and multi-tab login. The selected configuration
name is kept in session storage. Some examples need provider-side setup; the
separate-domain example includes an API placeholder rather than a working API.
The fetch demonstrations call the Duende user-info endpoint, so adapt those
requests as well when testing another provider.

## Service worker behavior

The default configuration enables `/OidcServiceWorker.js` but sets
`service_worker_only: false`, allowing fallback when the worker cannot be used.
Use HTTPS or localhost for worker support. Review the active mode in browser
developer tools instead of assuming tokens are always hidden.

In worker mode, access and refresh tokens normally remain in the worker, while
the page receives placeholders. The `config_show_access_token` trust rule
deliberately exposes the access token. Changing providers or API destinations also
requires updating the matching trust rules; do not solve trust errors by allowing
all destinations. See the
[service worker documentation](../../packages/oidc-client-service-worker/README.md).

## Educational code, not a production template

The **Execute your JavaScript Code** panel in
[`src/CodeExecutor.tsx`](src/CodeExecutor.tsx) uses `eval`. It intentionally runs
code in the page's context; use only code you understand with test accounts.

Do not deploy that executor or copy permissive CSP settings, token displays, or
debug logging into a production application. Service worker token isolation is
not a complete defense against XSS: malicious page code can still make
authenticated requests.

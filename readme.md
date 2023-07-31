# @axa-fr/oidc-client

[![Continuous Integration](https://github.com/AxaFrance/react-oidc/actions/workflows/npm-publish.yml/badge.svg)](https://github.com/AxaFrance/react-oidc/actions/workflows/npm-publish.yml)
[![Quality Gate](https://sonarcloud.io/api/project_badges/measure?project=AxaGuilDEv_react-oidc&metric=alert_status)](https://sonarcloud.io/dashboard?id=AxaGuilDEv_react-oidc) [![Reliability](https://sonarcloud.io/api/project_badges/measure?project=AxaGuilDEv_react-oidc&metric=reliability_rating)](https://sonarcloud.io/component_measures?id=AxaGuilDEv_react-oidc&metric=reliability_rating) [![Security](https://sonarcloud.io/api/project_badges/measure?project=AxaGuilDEv_react-oidc&metric=security_rating)](https://sonarcloud.io/component_measures?id=AxaGuilDEv_react-oidc&metric=security_rating) [![Code Coverage](https://sonarcloud.io/api/project_badges/measure?project=AxaGuilDEv_react-oidc&metric=coverage)](https://sonarcloud.io/component_measures?id=AxaGuilDEv_react-oidc&metric=Coverage) [![Twitter](https://img.shields.io/twitter/follow/GuildDEvOpen?style=social)](https://twitter.com/intent/follow?screen_name=GuildDEvOpen)

**@axa-fr/oidc-client** the lightest and securest library to manage authentication with OpenID Connect (OIDC) and OAuth2 protocol. It is compatible with all OIDC providers.
**@axa-fr/oidc-client** is a pure javascript library. It works with any JavaScript framework or library.

We provide a wrapper **@axa-fr/react-oidc** for **React** (compatible next.js) and we expect soon to provide one for **Vue**, **Angular** and **Svelte**.

- Try the react demo at https://black-rock-0dc6b0d03.1.azurestaticapps.net/
- Try the pure javascript demo at https://icy-glacier-004ab4303.2.azurestaticapps.net/

<p align="center">
    <img src="./docs/img/introduction.gif"
     alt="Sample React Oicd"
      />
</p>

- [About](#about)
- [Getting Started](#getting-started)
- [Run The Demos](#run-the-demos)
- [How It Works](#how-it-works)
- Packages
  - [`@axa-fr/react-oidc`](./packages/react-oidc#readme.md) [![npm version](https://badge.fury.io/js/%40axa-fr%2Freact-oidc.svg)](https://badge.fury.io/js/%40axa-fr%2Freact-oidc)
  - [`@axa-fr/oidc-client`](./packages/oidc-client#readme.md) [![npm version](https://badge.fury.io/js/%40axa-fr%2Foidc-client.svg)](https://badge.fury.io/js/%40axa-fr%2Foidc-client)
- [Migrations](#migrations)
- [Contribute](#contribute)

## About

@axa-fr/oidc-client is:

- **Secure** :
  - With the use of Service Worker, your tokens (refresh_token and access_token) are not accessible to the JavaScript client code (big protection against XSS attacks)
  - OIDC using client side Code Credential Grant with pkce only
- **Lightweight** : Unpacked Size on npm is **274 kB**
- **Simple**
  - refresh_token and access_token are auto refreshed in background
  - with the use of the Service Worker, you do not need to inject the access_token in every fetch, you have only to configure OidcTrustedDomains.js file
- **Multiple Authentication** :
  - You can authenticate many times to the same provider with different scope (for example you can acquire a new 'payment' scope for a payment)
  - You can authenticate to multiple different providers inside the same SPA (single page application) website
- **Flexible** :
  - Work with Service Worker (more secure) and without for older browser (less secure). 
  - You can disable Service Worker if you want (but less secure) and just use SessionStorage or LocalStorage mode.

<p align="center">
    <img src="./docs/img/schema_pcke_client_side_with_service_worker.png"
     alt="Schema Authorization Code Grant with pcke flow on the using service worker"
      />
  <br>
  The service worker catch <b>access_token</b> and <b>refresh_token</b> that will never be accessible to the client.
</p>

Works perfectly well with:

- [Auth0](https://auth0.com/)
- [Duende Identity Server](https://duendesoftware.com/)
- Azure AD
- Google
- AWS
- [Keycloak](https://www.keycloak.org/)
- etc., all OIDC providers

<p align="center">
    <img src="./docs/img/react-oidc-secure.PNG"
     alt="@axa-fr/oidc-client is one of the securest way to Authenticate."
      />
  <br>
  @axa-fr/oidc-client is one of the securest way to Authenticate.
</p>

<p align="center">
    <img src="./docs/img/react-oidc-lifetime.PNG"
     alt="Service Worker lifetime drawback. "
      />
  <br>
  Service Worker lifetime drawback.
</p>

<p align="center">
    <img src="./docs/img/react-oidc-silent.PNG"
     alt="Silent-Signing constraints. "
      />
  <br>
  Silent-Signing constraints.
</p>

<p align="center">
    <img src="./docs/img/react-oidc-cost.PNG"
     alt="@axa-fr/react-oidc is the simplest and cheapest."
      />
  <br>
  @axa-fr/react-oidc is the simplest and cheapest.
</p>

## Getting Started

### Getting Started with @axa-fr/oidc-client

```sh
npm install @axa-fr/oidc-client --save

# If you have a "public" folder, the 2 files will be created :
# ./public/OidcServiceWorker.js <-- will be updated at each "npm install"
# ./public/OidcTrustedDomains.js <-- won't be updated if already exist
```

More documentation :

- [`@axa-fr/oidc-client`](./packages/oidc-client#readme)

### Getting Started with @axa-fr/react-oidc

```sh
npm install @axa-fr/react-oidc --save

# If you have a "public" folder, the 2 files will be created :
# ./public/OidcServiceWorker.js <-- will be updated at each "npm install"
# ./public/OidcTrustedDomains.js <-- won't be updated if already exist
```

More documentation :

- [`@axa-fr/react-oidc`](./packages/react#readme)

## Run The Demos

```sh
git clone https://github.com/AxaFrance/oidc-client.git

# oidc client demo
cd oidc-client/examples/oidc-client-demo
pnpm install
pnpm start
# then navigate to http://localhost:5174

# react vite demo
cd oidc-client/examples/react-oidc-demo
pnpm install
pnpm start
# then navigate to http://localhost:4200

# react NextJS demo
cd oidc-client/examples/nextjs-demo
pnpm install
pnpm run dev
# then navigate to http://localhost:3001
```

## How It Works

These components encapsulate the use of "`@axa-fr/oidc-client`" in order to hide workflow complexity.
Internally for "`@axa-fr/react-oidc`", native History API is used to be router library agnostic.

More information about OIDC

- [French : Augmentez la sécurité et la simplicité de votre Système d’Information OpenID Connect](https://medium.com/just-tech-it-now/augmentez-la-s%C3%A9curit%C3%A9-et-la-simplicit%C3%A9-de-votre-syst%C3%A8me-dinformation-avec-oauth-2-0-cf0732d71284)
- [English : Increase the security and simplicity of your information system with OpenID Connect](https://medium.com/just-tech-it-now/increase-the-security-and-simplicity-of-your-information-system-with-openid-connect-fa8c26b99d6d)

## Why OIDC at Client side instead of BFF (Backend for Frontend) ?

We think that @axa-fr/oidc-client is a good choice for the following reasons :
- Secure by default with the use of the Service Worker. OIDC at Server Side from a BFF can be secure but with a bad configuration it can be very insecure. With OIDC Client you reuse the OIDC Server configuration which generally is well configured by OIDC security experts, so secure.
- With OIDC at Server side, It is more difficult to fine grain the scope of the token. With OIDC at Client side you can acquire a new token with a new scope for specific scenario (multiple authentication). You can fine tune token lifetime and scope for each scenario.
- Sometime your Web Application does not need a server, OIDC at client side is a good choice because you do not need to spend money for a server juste for Authentication. For example for a payment, you can retrieve only an access_token valid 2 minutes without any refresh_token.
- OIDC at Client side can be also a good choice for a fast time to market. You can start with OIDC at Client side and then migrate to OIDC at Server side if you need it. The two solutions are compatible.

## Migrations

- Migrating from v3 to v4 [`guide`](./MIGRATION_GUIDE_V3_TO_V4.md)
- Migrating from v3 to v5 [`guide`](./MIGRATION_GUIDE_V3_TO_V5.md)
- Migrating from v4 to v5 [`guide`](./MIGRATION_GUIDE_V4_TO_V5.md)
- Migrating from v5 to v6 [`guide`](./MIGRATION_GUIDE_V5_TO_V6.md)
- Migrating from v6 to v7 [`guide`](./MIGRATION_GUIDE_V6_TO_V7.md)

## Contribute

- [How to run the solution and to contribute](./CONTRIBUTING.md)
- [Please respect our code of conduct](./CODE_OF_CONDUCT.md)

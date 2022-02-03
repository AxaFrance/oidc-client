# @axa-fr/react-oidc

[![Build status](https://dev.azure.com/axaguildev/react-oidc/_apis/build/status/AxaGuilDEv.react-oidc?branch=master)](https://dev.azure.com/axaguildev/react-oidc/_build)
[![Quality Gate](https://sonarcloud.io/api/project_badges/measure?project=AxaGuilDEv_react-oidc&metric=alert_status)](https://sonarcloud.io/dashboard?id=AxaGuilDEv_react-oidc) [![Reliability](https://sonarcloud.io/api/project_badges/measure?project=AxaGuilDEv_react-oidc&metric=reliability_rating)](https://sonarcloud.io/component_measures?id=AxaGuilDEv_react-oidc&metric=reliability_rating) [![Security](https://sonarcloud.io/api/project_badges/measure?project=AxaGuilDEv_react-oidc&metric=security_rating)](https://sonarcloud.io/component_measures?id=AxaGuilDEv_react-oidc&metric=security_rating) [![Code Corevage](https://sonarcloud.io/api/project_badges/measure?project=AxaGuilDEv_react-oidc&metric=coverage)](https://sonarcloud.io/component_measures?id=AxaGuilDEv_react-oidc&metric=Coverage) [![Twitter](https://img.shields.io/twitter/follow/GuildDEvOpen?style=social)](https://twitter.com/intent/follow?screen_name=GuildDEvOpen)

<p align="center">
    <img src="./docs/img/introduction.gif"
     alt="Sample React Oicd"
      />
</p>

<p align="center">
  A set of react components and HOC to make Oidc (OpenID Connect) client easy. It aim to simplify OAuth authentication between multiples providers.
</p>

- [About](#about)
- [Getting Started](#getting-started)
- [How It Works](#how-it-works)
- Packages
  - [`@axa-fr/react-oidc-context`](./packages/context#readme.md) [![npm version](https://badge.fury.io/js/%40axa-fr%2Freact-oidc-context.svg)](https://badge.fury.io/js/%40axa-fr%2Freact-oidc-context)
  - [`@axa-fr/vanilla-oidc`](./packages/vanilla#readme.md) [![npm version](https://badge.fury.io/js/%40axa-fr%2Fvanilla-oidc.svg)](https://badge.fury.io/js/%40axa-fr%2Fvanilla-oidc)
  - [`@axa-fr/react-oidc-context-fetch`](./packages/context-fetch#readme.md) [![npm version](https://badge.fury.io/js/%40axa-fr%2Freact-oidc-context-fetch.svg)](https://badge.fury.io/js/%40axa-fr%2Freact-oidc-context-fetch) **Deprecated in v4**
  - [`@axa-fr/react-oidc-redux`](./packages/redux#readme.md) [![npm version](https://badge.fury.io/js/%40axa-fr%2Freact-oidc-redux.svg)](https://badge.fury.io/js/%40axa-fr%2Freact-oidc-redux) **Deprecated in v4**
  - [`@axa-fr/react-oidc-redux-fetch`](./packages/redux-fetch#readme.md) [![npm version](https://badge.fury.io/js/%40axa-fr%2Freact-oidc-redux-fetch.svg)](https://badge.fury.io/js/%40axa-fr%2Freact-oidc-redux-fetch) **Deprecated in v4**
  - [`@axa-fr/react-oidc-fetch-observable`](./packages/fetch-observable#readme.md) [![npm version](https://badge.fury.io/js/%40axa-fr%2Freact-oidc-fetch-observable.svg)](https://badge.fury.io/js/%40axa-fr%2Freact-oidc-fetch-observable) **Deprecated in v4**
- [Concepts](#concepts)
- [Contribute](#contribute)

## About

These components is used to manage client authentication.
It uses the libraries ["App-AuthJS"](https://github.com/openid/AppAuth-JS).

In the v4 we have chosen to remove a lot the surface API in order to simplify usage.
It prepare the comming V5 version which will hide tokens in a ServiceWorker (for more security secure).

## Getting Started

- [`@axa-fr/react-oidc-context`](./packages/context#readme)
- [`@axa-fr/vanilla-oidc`](./packages/vanilla#readme)

## Example

- [`create react app & context api`](./packages/context)

## How It Works

These components encapsulate the use of "AppAuth-JS" in order to hide workfow complexity.
Internally, native History API is used to be router library agnostic.

## Concept

A set of react components and HOC to make Oidc client easy!

The purpose of the component is :

- Simple set up
- React component protection (by composing)
- Standardize the "Routes" used by the oauth flow
- Manage the recovery of tokens and different exchanges with "openid connect" server
- Flexible : You can customize routes and redirect components if you need it
- HOC => override "fetch" in order to retrieve a new "fetch" that will be able to manage http 401 and http 403 response.

## Contribute

- [How to run the solution and to contribute](./CONTRIBUTING.md)
- [Please respect our code of conduct](./CODE_OF_CONDUCT.md)

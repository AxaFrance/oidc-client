# Contributing to @axa-fr/react-oidc

First, ensure you have the [latest `npm`](https://docs.npmjs.com/).

To get started with the repository:

```sh
git clone https://github.com/AxaGuilDEv/react-oidc.git
cd react-oidc/packages/react
npm install
npm start
```
You are now ready to contribute!

## Pull Request

Please respect the following [PULL_REQUEST_TEMPLATE.md](./PULL_REQUEST_TEMPLATE.md)

Packages are automaticaly published on npm when a PR is merged on main.

Example of commit messages :

To publish a patch version (0.0.x) :
- fix(oidc): my message (alpha) => will publish next patch as an alpha
- chore(oidc): my message (beta) => will publish next patch as an beta
- refactor(oidc): my message (release) => will publish next patch release (with automatic git tag and release)

To publish a minor version (0.x.0) :
- feat(oidc): my message (alpha) => will publish next minor as an alpha
- feat(oidc): my message (beta) => will publish next minor as an beta
- feat(oidc): my message (release) => will publish next minor release (with automatic git tag and release)

To publish a major version (x.0.0) :
- fix(oidc): my message containing BREACKING word (alpha) => will publish next major as an alpha
- fix(oidc): my message containing BREACKING word (beta) => will publish next major as an beta
- fix(oidc): my message containing BREACKING word (release) => will publish next major release (with automatic git tag and release)


## Issue

Please respect the following [ISSUE_TEMPLATE.md](./ISSUE_TEMPLATE.md)

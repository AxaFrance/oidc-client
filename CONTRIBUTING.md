# Contributing to @axa-fr/oidc-client

First, ensure you have Node.js 22.22.2+, 24.15.0+, or 26+ and the version of
[pnpm](https://pnpm.io/) specified in `package.json`.

The workspace uses TypeScript 7 for the `tsc` command through the
`@typescript/native` npm alias. The `typescript` dependency aliases
`@typescript/typescript6` to provide the compiler API required by typescript-eslint
and vite-plugin-dts. This follows the
[TypeScript side-by-side setup](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/#running-side-by-side-with-typescript-6-0).

To get started with the repository:

```sh
git clone https://github.com/AxaFrance/oidc-client.git

cd oidc-client
pnpm install

# oidc client demo
cd examples/oidc-client-demo
pnpm install
pnpm start
# then navigate to http://localhost:5174

# react vite demo
cd examples/react-oidc-demo
pnpm install
pnpm start
# then navigate to http://localhost:4200

# react NextJS demo
cd examples/nextjs-demo
pnpm install
pnpm run dev
# then navigate to http://localhost:3001
```

You are now ready to contribute!

## Pull Request

Please respect the following [PULL_REQUEST_TEMPLATE.md](./PULL_REQUEST_TEMPLATE.md)

Packages are automatically published on npm when a PR is merged on main.

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

# Changelog

## 7.22.18

- [5ee0cc8](https://github.com/AxaFrance/oidc-client/commit/5ee0cc8f6d823056da221ad081c3821ba9fac343) - fix(oidc): separate state, nonce and codeVerifier for each tab (release) (#1402), 2024-07-16 by _Miya_

## v7.22.17

- [b099078](https://github.com/AxaFrance/oidc-client/commit/b099078f9d4b61dffd03034f511a4f32e80977a8) - fix(oidc): clenup client internal promises when requests are finished (release) (#1417), 2024-07-15 by _wermanoid_
- [01f0714](https://github.com/AxaFrance/oidc-client/commit/01f0714241e6442e6b58fcba8b86804ed75cec09) - tests(domain): Be more explicit about intent of test, is to not throw, not return undefined. (#1413), 2024-07-15 by _Jason Finch_
- [b94fa5c](https://github.com/AxaFrance/oidc-client/commit/b94fa5ca90bd366c4f59a870c428f42872bfacaa) - docs: Minor language change. (#1412), 2024-07-15 by _Jason Finch_
- [7caee91](https://github.com/AxaFrance/oidc-client/commit/7caee919b4854526dad83203216965746baecabe) - build(job): Update job scripts to v4. (earlier versions are marked deprecated) (#1411), 2024-07-15 by _Jason Finch_
- [a46b1aa](https://github.com/AxaFrance/oidc-client/commit/a46b1aabe19db70beac342c557ae2c986d16eae7) - fix (FetchToken): Fix FetchToken param to be boolean (#1414), 2024-07-15 by _Jason Finch_
- [a989ed2](https://github.com/AxaFrance/oidc-client/commit/a989ed29f46b66483bc2c7c51e73bcc19b2c9736) - build(lint): Update lint step to run. (#1409), 2024-07-13 by _Jason Finch_

## v7.22.16

- [72a6373](https://github.com/AxaFrance/oidc-client/commit/72a6373402a53aaaf01ad7fac22f8ad8c6feaff0) - fix(oidc): improve error handling (release) (#1403), 2024-07-11 by _Miya_
- [c56ceb8](https://github.com/AxaFrance/oidc-client/commit/c56ceb815b28dd5990fe4a1679a61bcebc7e525a) - docs(readme): Update README.md (#1407), 2024-07-12 by _Jason Finch_

## v7.22.15

- [73eae7e](https://github.com/AxaFrance/oidc-client/commit/73eae7e9d68dea6ebec0ed82ba7873941c0e371e) - refactor(oidcServiceWorker): Extract GetCurrentDatabaseTokenEndpoint, add tests. (#1405) (release), 2024-07-11 by _Jason Finch_
- [e51aef2](https://github.com/AxaFrance/oidc-client/commit/e51aef268e783259c035e3ba58bf9aa16a111bea) - fix (Style): fix 'container' classname in demo. (#1401), 2024-07-11 by _Jason Finch_

## v7.22.14

- [25c55ee](https://github.com/AxaFrance/oidc-client/commit/25c55eeb7682356c13987a91d7b8645cca1b0ad5) - refactor(oidc): null coalescing (#1404) (release), 2024-07-11 by _Jason Finch_

## v7.22.13

- [95c814d](https://github.com/AxaFrance/oidc-client/commit/95c814dd9dd325a3a00c3a0dc049d301d983514e) - fix(ci): setup pnpm (release) (#1399), 2024-07-05 by _Guillaume Chervet_

## v7.22.12

## v7.22.11

## v7.22.10

- [6c80c5c](https://github.com/AxaFrance/oidc-client/commit/6c80c5cc77750aead50e62136a6594b05f21b42b) - fix(oidc): logout trigger login (release) (#1394), 2024-07-04 by _Guillaume Chervet_

## v7.22.9

- [77eb9e1](https://github.com/AxaFrance/oidc-client/commit/77eb9e1841814cfeb6c6672159740dad4c0a9d4d) - fix(oidc): MessageChannel is not closed after message is received (release) (#1396), 2024-07-02 by _radk0s_

## v7.22.8

- [c4cf94b](https://github.com/AxaFrance/oidc-client/commit/c4cf94b62a7b2c45cf0f94438a02f0cb5f06b9b0) - fix(oidc): remove dynamic web worker blocked by policies (release) (#1386), 2024-06-18 by _Guillaume Chervet_

## v7.22.7

- [9f4cbf4](https://github.com/AxaFrance/oidc-client/commit/9f4cbf414e1b41f448b2a36d759a035786d26668) - fix(oidc): 2 readmes with the same name (release) (#1377), 2024-06-07 by _meesvandongen_
- [0bfabd4](https://github.com/AxaFrance/oidc-client/commit/0bfabd41d67cad57415905b7ce729ee4fe85c8b4) - fix(oidc): session lost to quickly (alpha) (#1381), 2024-06-07 by _Guillaume Chervet_

## v7.22.6

- [bcba15b](https://github.com/AxaFrance/oidc-client/commit/bcba15b412063d139c0902de117b0516150c13a2) - fix(react-oidc): compatibility with react 19 (release) (#1372), 2024-05-22 by _Guillaume Chervet_
- [c49a857](https://github.com/AxaFrance/oidc-client/commit/c49a8572702c485c9a089b0f9aa11eb4bc6e7f1d) - refactor(test): add missing logout test case, 2024-05-22 by _Guillaume Chervet_

## v7.22.5

- [8d9fd95](https://github.com/AxaFrance/oidc-client/commit/8d9fd9550a74a771936f0e686eb31fe271cd912b) - fix(oidc): user loaded 401 when preload true and not serviceworder mode (release), 2024-05-19 by _Guillaume Chervet_
- [d764b2b](https://github.com/AxaFrance/oidc-client/commit/d764b2bd7319711c49a393c1fd3496d054661065) - refatcor(all): update librairies, 2024-05-18 by _Guillaume Chervet_

## v7.22.4

- [64c76e0](https://github.com/AxaFrance/oidc-client/commit/64c76e0b1f4fccf1c0ed93269a0307212be9d661) - feature(oidc):preload user (release) (#1352), 2024-04-23 by _Guillaume Chervet_

## v7.22.3

- [5af8075](https://github.com/AxaFrance/oidc-client/commit/5af807548e35c64da74fc3547e35c8ec512399ba) - fix(all): types import in index.ts for all typescript (release), 2024-04-18 by _Guillaume Chervet_

## v7.22.2

- [b17217d](https://github.com/AxaFrance/oidc-client/commit/b17217d6b829dee3b28f444fda099fce9c94bc41) - fix(react-oidc): unused var in User.txs (release), 2024-04-16 by _Guillaume Chervet_

## v7.22.1

- [be24658](https://github.com/AxaFrance/oidc-client/commit/be2465852e837b749abd3a86c5c0caa57a2ea8b6) - refactor(all): update libs (release), 2024-04-15 by _Guillaume Chervet_

## v7.22.0

- [032a00b](https://github.com/AxaFrance/oidc-client/commit/032a00b501557fe6b5be48e83e4914051ee2c7f0) - feat(oidc): control dpop injection (release) (#1342), 2024-04-10 by _Guillaume Chervet_

## v7.21.0

- [8335b5a](https://github.com/AxaFrance/oidc-client/commit/8335b5a6f5c02d320d642a022ff3828513f5a43e) - feat(dpop): add extras (alpha) (#1325) (release), 2024-03-28 by _Guillaume Chervet_

## v7.20.1

- [9a3ad3a](https://github.com/AxaFrance/oidc-client/commit/9a3ad3a474a66cc77fa2c3eb3eafa42f167f1e45) - feature(oidc): token renew only when required (release) (#1327), 2024-03-24 by _Guillaume Chervet_

## v7.20.0

- [44d15be](https://github.com/AxaFrance/oidc-client/commit/44d15be1c4d8f5069f15ddc5351e546fc5eb7730) - fix(oidc): userInfo 401 on first login (release), 2024-03-22 by _Guillaume Chervet_
- [c7793c9](https://github.com/AxaFrance/oidc-client/commit/c7793c9913128dbb82a60dff11261ca5b4749f0c) - feat(oidc-client): add dpop extras to claims (alpha), 2024-03-19 by _Guillaume Chervet_

## v7.19.6

- [b7568f8](https://github.com/AxaFrance/oidc-client/commit/b7568f8d73d21ba1b7cd4890bff2ad30941696e2) - fix(oidc-service-worker): normalize userinfo endpoint in service worker (#1320) (release), 2024-03-13 by _meesvandongen_

## v7.19.5

- [be24bba](https://github.com/AxaFrance/oidc-client/commit/be24bbab3d699ff003cb14302dedc3463b1f3a1b) - refactor(all): update build libraries (release), 2024-03-12 by _Guillaume Chervet_

## v7.19.4

- [7df257c](https://github.com/AxaFrance/oidc-client/commit/7df257ca7ba32a2605cd5d76881ea3aa50aba208) - refactor(all): update build libraries (release), 2024-03-12 by _Guillaume Chervet_

## v7.19.3

- [397629d](https://github.com/AxaFrance/oidc-client/commit/397629d2c9e1d58efab96c000247382cfc94ce24) - build(npm): bump vite from 5.0.12 to 5.1.5 (#1319), 2024-03-07 by _dependabot[bot]_

## v7.19.2

- [95be8f7](https://github.com/AxaFrance/oidc-client/commit/95be8f79a3fc399b05322d0197ab674cf272326a) - build(npm): bump vitest from 1.2.2 to 1.3.1 (#1315), 2024-03-07 by _dependabot[bot]_

## v7.19.1

- [7b2b21a](https://github.com/AxaFrance/oidc-client/commit/7b2b21a9837210d0caaea9e16cfea9e9daeb8364) - build(npm): bump rimraf from 5.0.1 to 5.0.5 (#1313) (release), 2024-03-04 by _dependabot[bot]_
- [d4c9ec6](https://github.com/AxaFrance/oidc-client/commit/d4c9ec6b8a4760c81f4d88bc72563cc810b52b00) - fix(oidc): when having multiple iframes, only the last one gets resolved (#1311) (alpha), 2024-02-28 by _Jean-Marc Rakotoarisoa_
- [db13d8b](https://github.com/AxaFrance/oidc-client/commit/db13d8bdfbd49e564452461aeefc6e3024ce4435) - doc(oidc-client-demo): fix workflow, 2024-02-23 by _Guillaume Chervet_
- [322c1f1](https://github.com/AxaFrance/oidc-client/commit/322c1f1fbd3563b27b01a6ca98c8d95eeef12038) - doc(oidc-client-demo): update content and CSP, 2024-02-23 by _Guillaume Chervet_
- [cf92792](https://github.com/AxaFrance/oidc-client/commit/cf92792db7ede5f35c3e2883f4353376e73ff7e3) - doc(oidc-client-demo): repair demo, 2024-02-23 by _Guillaume Chervet_
- [fa33e72](https://github.com/AxaFrance/oidc-client/commit/fa33e7250cd5d46c98940c999b8f701116f78446) - doc(oidc-client): update vanilla to add Hack game, 2024-02-23 by _Guillaume Chervet_

## v7.19.0

- [8f3940c](https://github.com/AxaFrance/oidc-client/commit/8f3940c42ad62264abfd61690777b602e0bdc31a) - feat(oidc): dpop inside serviceworker (#1306) (release), 2024-02-22 by _Guillaume Chervet_
- [4a5887f](https://github.com/AxaFrance/oidc-client/commit/4a5887f5e7b3d739d709c7bb4fb7a007ccb051a1) - fix(oidc-service-worker): remove sw unecessary log, 2024-02-19 by _Guillaume Chervet_

## v7.18.5

- [7a38d96](https://github.com/AxaFrance/oidc-client/commit/7a38d962b0e08837989a1d2affeb5e557dc09444) - fix(oidc): parse token with many \_ or - (#1302) (release), 2024-02-18 by _Guillaume Chervet_

## v7.18.4

- [b4e5ec8](https://github.com/AxaFrance/oidc-client/commit/b4e5ec834bdfedf8975b79086c2c0144f4e6e9b1) - fix(oidc-service-worker): set Bearer as default (release), 2024-02-17 by _Guillaume Chervet_

## v7.18.3

- [8eb75d3](https://github.com/AxaFrance/oidc-client/commit/8eb75d3f2036708d9c3067a2973a4d685d8b4923) - fix(oidc): logout continue to run before redirecting (#1301) (release), 2024-02-15 by _Guillaume Chervet_

## v7.18.2

- [77329ce](https://github.com/AxaFrance/oidc-client/commit/77329ce52a5fc7278ff35ccd13ca572ff7ebbf4d) - fix(oidc-service-worker): bad request on many token request at the same time (#1300) (release), 2024-02-15 by _Guillaume Chervet_

## v7.18.1

- [0d13cc2](https://github.com/AxaFrance/oidc-client/commit/0d13cc28a8cc40c610d3943d33fe8a7d4e28c32f) - fix(oidc): unload user on logout (#1296) (release), 2024-02-13 by _Guillaume Chervet_

## v7.18.0

- [5e35346](https://github.com/AxaFrance/oidc-client/commit/5e35346bfa477b560f5bde1afb2125a2c5f6e9c4) - feat(oidc): add extras to revoke access_token and refresh_tokens (#1295) (release), 2024-02-13 by _Guillaume Chervet_

## v7.17.4

- [91b11af](https://github.com/AxaFrance/oidc-client/commit/91b11afa983bf4bee8def95c4ee101ede5447dc9) - fix(oidc): resfreshTokenError not triggered when silentsignin disabled (release), 2024-02-11 by _Guillaume Chervet_

## v7.17.3

- [dbaf602](https://github.com/AxaFrance/oidc-client/commit/dbaf602d31e0b437285496e2711ff7cce5d8d3f7) - fix(react-oidc): typings user can be null (release), 2024-02-11 by _Guillaume Chervet_

## v7.17.2

- [c3d5c6b](https://github.com/AxaFrance/oidc-client/commit/c3d5c6b1a6a2a82450d134134513634031c1c338) - refactor(react-oidc): remove base64js dependencies (release), 2024-02-11 by _Guillaume Chervet_
- [2a7031b](https://github.com/AxaFrance/oidc-client/commit/2a7031bfdd5a7c638940ece97778988ead73cbdc) - Merge branch 'main' of https://github.com/AxaFrance/oidc-client, 2024-02-11 by _Guillaume Chervet_
- [3973497](https://github.com/AxaFrance/oidc-client/commit/397349749e9abb75a6910b3824786f3c688447fe) - Merge branch 'main' of https://github.com/AxaFrance/oidc-client, 2024-02-10 by _Guillaume Chervet_
- [d20953a](https://github.com/AxaFrance/oidc-client/commit/d20953a0180bdf3b8b6dd3247a025e3b4fc389f8) - refactor(oidc): remove base64.js dependencies (alpha), 2024-02-10 by _Guillaume Chervet_

## v7.17.1

- [2511648](https://github.com/AxaFrance/oidc-client/commit/251164830a9a1b976e8d6c743490795a028afa16) - refactor(oidc): remove base64.js dependency (#1292) (release), 2024-02-10 by _Guillaume Chervet_

## v7.17.0

- [a09e6fd](https://github.com/AxaFrance/oidc-client/commit/a09e6fda64aa210fe7f63d70b6c64af559012640) - feat(oidc): logout add extras parameter to avoid the page reload (release) (#1290), 2024-02-10 by _Guillaume Chervet_

## v7.16.0

- [6b9b524](https://github.com/AxaFrance/oidc-client/commit/6b9b524c54a18dca9cc5bab34f0d058716e9d116) - feat(react): expose dpop method generation (#1291) (release), 2024-02-10 by _Guillaume Chervet_

## v7.15.5

- [d79af9a](https://github.com/AxaFrance/oidc-client/commit/d79af9aba023faf78e9816c4d681413618bdd843) - refactor(all): updates dev libraries (release) (#1284), 2024-02-09 by _Guillaume Chervet_

## v7.15.4

- [f2d74fb](https://github.com/AxaFrance/oidc-client/commit/f2d74fba6d2e48e6d478aa69d261fe9cceb69bfa) - fix(oidc): eternal lock when refresh_token invalid and multiple tabs (#1281) (release), 2024-02-03 by _Guillaume Chervet_

## v7.15.3

- [7a5d32c](https://github.com/AxaFrance/oidc-client/commit/7a5d32cf650870a5b1c2910ceb0a3e6db4cec0b7) - fix(oidc): storage empty update message (release), 2024-02-03 by _Guillaume Chervet_

## v7.15.2

- [940ffac](https://github.com/AxaFrance/oidc-client/commit/940ffac724894460af13e4e4a0de5e691e487c74) - fix(oidc): json not valid add warning message (release) (#1258), 2024-02-03 by _Guillaume Chervet_
- [31f295c](https://github.com/AxaFrance/oidc-client/commit/31f295cb549bf55dfd5db1e1c71178363c7f2dae) - fix(logout): add event when same config name (alpha), 2024-02-02 by _Guillaume Chervet_
- [0a15e60](https://github.com/AxaFrance/oidc-client/commit/0a15e60f0e5c167a0418a972c6726eec72add447) - refactor(renew): clean an debug (alpha) (#1273), 2024-02-01 by _Guillaume Chervet_

## v7.15.1

- [5094e36](https://github.com/AxaFrance/oidc-client/commit/5094e36c1435684c5863e8d27eca59093aaec7b7) - fix(service-worker): unit test broken (release), 2024-01-30 by _Guillaume Chervet_

## v7.15.0

- [1676881](https://github.com/AxaFrance/oidc-client/commit/1676881f1db53cff6652ee7fe9658a437682231f) - feat(oidc): idToken can be null on a refresh (release) (#1271), 2024-01-29 by _Guillaume Chervet_

## v7.14.1

- [0fe53a6](https://github.com/AxaFrance/oidc-client/commit/0fe53a6b870c13c71330806a045896ea1e0a57e2) - fix(oidc): remove console.log (release), 2024-01-28 by _Guillaume Chervet_
- [b23d6a7](https://github.com/AxaFrance/oidc-client/commit/b23d6a7e1fc04ce43f489ac8977de9fe5affff73) - Merge branch 'main' of https://github.com/AxaFrance/oidc-client, 2024-01-28 by _Guillaume Chervet_
- [14ccbeb](https://github.com/AxaFrance/oidc-client/commit/14ccbeb83f1d7e790b496e571d424f615a39b43f) - fix(oidc): demo and remove console.log, 2024-01-28 by _Guillaume Chervet_
- [15eb259](https://github.com/AxaFrance/oidc-client/commit/15eb2592d9582cb43798a5d7fc988b3c349e5b43) - doc(oidc): Update README.md, 2024-01-26 by _Guillaume Chervet_

## v7.14.0

- [b0510eb](https://github.com/AxaFrance/oidc-client/commit/b0510eb8d7170e8e142cb2d9bec01f41f610ed51) - feat(oidc): add DPOP configuration (#1259) (release), 2024-01-26 by _Guillaume Chervet_

## v7.13.16

- [f2310bc](https://github.com/AxaFrance/oidc-client/commit/f2310bc917898b779a40edecf3dd73c21ec32b47) - fix(oidc): parseJwt fails for some JWT because of wrong use of replace (release) (#1269), 2024-01-25 by _Guillaume Chervet_

## v7.13.15

- [c56cc84](https://github.com/AxaFrance/oidc-client/commit/c56cc842d8da427b2aa88eb71f7d63937ea3c363) - fix(react-oidc): missing console.log in useOidcFetch (release), 2024-01-16 by _Guillaume Chervet_

## v7.13.14

- [3a1883c](https://github.com/AxaFrance/oidc-client/commit/3a1883c343c55637aa1ce5d118cc2841c76d8752) - build(npm): bump react-router-dom from 6.20.1 to 6.21.1 (#1252), 2024-01-02 by _dependabot[bot]_

## v7.13.13

- [1faaab4](https://github.com/AxaFrance/oidc-client/commit/1faaab4ecb86144ed6f3c1ed68b938804854bd36) - build(npm): bump next from 14.0.3 to 14.0.4 (#1255), 2024-01-02 by _dependabot[bot]_
- [d009de8](https://github.com/AxaFrance/oidc-client/commit/d009de8091ac256d1384466df9b3fe7de75a5629) - chore(ci): Update npm-publish.yml, 2023-12-28 by _Guillaume Chervet_

## v7.13.12

- [9ef56f1](https://github.com/AxaFrance/oidc-client/commit/9ef56f17793e1bfbd668d6f001125a8f773c2370) - fix(oidc): Handling of errors returned from authorize endpoint (#1250) (release), 2023-12-28 by _Guillaume Chervet_

## v7.13.11

- [529cabf](https://github.com/AxaFrance/oidc-client/commit/529cabfbe7ee602325ba0f70844c969176371746) - fix(oidc): DPOP type jit instead of jti (#1249) (release), 2023-12-20 by _Guillaume Chervet_

## v7.13.10

- [4b1a9a2](https://github.com/AxaFrance/oidc-client/commit/4b1a9a26eba51e24dd1c9c9fd0087ef0b3b1ce8b) - fix(oidc): crash when regex on userAgent empty result iOS (#1248) (release), 2023-12-20 by _Guillaume Chervet_

## v7.13.9

- [819962b](https://github.com/AxaFrance/oidc-client/commit/819962bae1d7c1e7fd997ede7bb42cce27ba76f3) - fix(oidc): renew with simple storage (#1246) (release), 2023-12-19 by _Guillaume Chervet_

## v7.13.8

- [b0cf4ad](https://github.com/AxaFrance/oidc-client/commit/b0cf4ad52df9c16c130cce791b05ceea7c4370c4) - fix(oidc): temp renew token fix (#1245) (release), 2023-12-18 by _Guillaume Chervet_

## v7.13.7

- [6667eab](https://github.com/AxaFrance/oidc-client/commit/6667eabc8c5cb0ff5874b6583b2223721bd18525) - fix(oidc): temporary fix on lock need to be continued but require refactor (release), 2023-12-15 by _Guillaume Chervet_
- [23c8715](https://github.com/AxaFrance/oidc-client/commit/23c87152e55c8d7f1c51a33032d48c751b15c4c5) - fix(ci): clean changelog generation, 2023-12-15 by _Guillaume Chervet_
- [9f1f7f6](https://github.com/AxaFrance/oidc-client/commit/9f1f7f684a6b344f59221caf3e3a14faef73a6bc) - fix(oidc): session storage for next (#1240) (alpha), 2023-12-12 by _Guillaume Chervet_
- [64a8df3](https://github.com/AxaFrance/oidc-client/commit/64a8df3281f95159a60e5f9ec61db315a8d20c7d) - fix(oidc-client): make locks work only ifAvailable (#1237)(alpha), 2023-12-09 by _abhilashlr_

# Changelog

## 7.27.11



## v7.27.10

- [93629d9](https://github.com/AxaFrance/oidc-client/commit/93629d928b045116487860230fc2cd7875930be4) - fix: exclude navigate-mode requests from destination bypass (#1683) (#1687) (release), 2026-06-13 by *Guillaume Chervet*
- [31d441d](https://github.com/AxaFrance/oidc-client/commit/31d441d3b37d92fd4f8daaa501b4c55ae1c58a0f) - chore: add copilot instruction, 2026-06-12 by *Guillaume Chervet*


## v7.27.9

- [4e9c33f](https://github.com/AxaFrance/oidc-client/commit/4e9c33f9c46d2a17a5c29103707dd743a5acc5ba) - fix(oidc): prevent storage poisoning on undefined setters (alpha) (#1674) (release), 2026-06-10 by *Andreas Adam*


## v7.27.8

- [c67eabf](https://github.com/AxaFrance/oidc-client/commit/c67eabfbe2bf437b490f37c63d58d79bdf82c4de) - Update all dependencies to latest versions (#1665) (release), 2026-05-15 by *Copilot*


## v7.27.7



## v7.27.6



## v7.27.5

- [debafc8](https://github.com/AxaFrance/oidc-client/commit/debafc81b9f6d24f2c2bfc81e160b1cc595cacc0) - Bypass non-OIDC requests in the service worker (#1663) (release), 2026-05-14 by *Copilot*


## v7.27.4

- [9d94b3d](https://github.com/AxaFrance/oidc-client/commit/9d94b3d64a0cec857106b15e87ddcd1777ef42d7) - chore(all): Update workspace libraries (#1659) (release), 2026-04-27 by *Copilot*
- [78a0bfa](https://github.com/AxaFrance/oidc-client/commit/78a0bfa6281c0891ce4b7abde786ffdcd119d964) - Remove sonar badges from all README.md files (#1658), 2026-04-24 by *Copilot*
- [a18f810](https://github.com/AxaFrance/oidc-client/commit/a18f81018dc8cd24620028b05912a46bb1f2ff72) - docs: remove twitter badge, add npm weekly downloads badges to READMEs (#1657), 2026-04-24 by *Copilot*
- [0691819](https://github.com/AxaFrance/oidc-client/commit/06918197a2ba6d549e2927cdf60a7019deb0fea7) - Remove sonar badges from README.md (#1656), 2026-04-24 by *Copilot*


## v7.27.3

- [3ae9f19](https://github.com/AxaFrance/oidc-client/commit/3ae9f19f7ff304a85de103424865ebc63675d866) - fix: cache service worker registration to prevent repeated register calls (#1655) (release), 2026-04-21 by *Copilot*


## v7.27.2

- [61b2ee6](https://github.com/AxaFrance/oidc-client/commit/61b2ee62093098e30cb15c9b2bb7102283876a3c) - fix(service-worker): add timeout to token renewal wait loop to prevent indefinite fetch blocking (#1654) (release), 2026-04-20 by *Copilot*


## v7.27.1

- [362cd3a](https://github.com/AxaFrance/oidc-client/commit/362cd3adfecb4056558d9f9b503f503c091b0b7a) - fix(oid-client): service worker update (#1649) (release), 2026-03-18 by *Guillaume Chervet*


## v7.27.0

- [48d3ad0](https://github.com/AxaFrance/oidc-client/commit/48d3ad028d7b8ccbd6504bb2682f72e0b079643c) - feat(oidc-client): Add a 'login_state_storage' option to allow storing the auth flow state separately to tokens (#1646) (release), 2026-03-11 by *Alex O'Callaghan*


## v7.26.8

- [7c5dd66](https://github.com/AxaFrance/oidc-client/commit/7c5dd6612ae7ef5c492845eeae65dfdd23a75842) - fix(oidc): infinite service worker reload loop on version change (#1647) (release), 2026-03-10 by *Copilot*


## v7.26.7

- [46bd6a8](https://github.com/AxaFrance/oidc-client/commit/46bd6a89b803ca9c2c9aedf0a0fa1d73d229b995) - docs: clarify that allowMultiTabLogin requires OIDC fetch wrapper for API calls (#1643) (release), 2026-02-21 by *Copilot*
- [f35ae01](https://github.com/AxaFrance/oidc-client/commit/f35ae0174664ea8abcc6c79b608958d0b2164636) - Fix `useOidcUser` stuck in Loading state after reloadOidcUser() (#1642), 2026-02-21 by *Copilot*


## v7.26.6

- [46d7460](https://github.com/AxaFrance/oidc-client/commit/46d746024d7420f8386f18217c77ff5bc6ccc83e) - Fix null extras values being encoded as literal "null" string in query params (#1640) (release), 2026-02-21 by *Copilot*


## v7.26.5

- [da37c1c](https://github.com/AxaFrance/oidc-client/commit/da37c1c29b79d20abc8aeeca17a18155f4274a7e) - fix(react-oidc): remove dangling `setLoading` call in OidcProvider (#1639) (release), 2026-02-21 by *Copilot*


## v7.26.4

- [9a44940](https://github.com/AxaFrance/oidc-client/commit/9a44940d0f65255618d7727d7033afa1dbab7239) - fix(oidc-client): sw with safari 17 (#1636) (release), 2026-02-12 by *Guillaume Chervet*


## v7.26.3



## v7.26.2



## v7.26.1

- [49975e2](https://github.com/AxaFrance/oidc-client/commit/49975e24a7dd49d7dd6ddcc86da4ea47d74cac98) - refactor(all): update libraries (release) (#1633), 2026-01-28 by *Guillaume Chervet*
- [2bb456e](https://github.com/AxaFrance/oidc-client/commit/2bb456ed057131748d2ff26169f166ffcd7e618b) - fix: do not handle all requests (#1625) (alpha), 2025-11-24 by *Andreas Adam*


## v7.26.0

- [b9656c2](https://github.com/AxaFrance/oidc-client/commit/b9656c2559993efe94a121c442000969b1eaba2b) - feat(react-oidc): enforce uniqueness of redirect_uri and silent_redirect_uri (#1606) (release), 2025-09-17 by *Jean-Marc Rakotoarisoa*
- [960a694](https://github.com/AxaFrance/oidc-client/commit/960a69472b75e12490025ee3b46d15643c0e35a6) - fix(oidc-client): Clear userInfo in storage in clearAsync function (#1603), 2025-09-17 by *Mérill Téterel*


## v7.25.16

- [c79907b](https://github.com/AxaFrance/oidc-client/commit/c79907b63af69352ed660e97d9e61265bc155131) - fix(oidc-client): renew token silent login (release) (#1598), 2025-09-04 by *Guillaume Chervet*


## v7.25.15

- [f4ce35e](https://github.com/AxaFrance/oidc-client/commit/f4ce35e4e272de9e4f4387494877bab5939fa1a9) - fix(oidc-client): implement consistent storage caching for userInfo and well-known configuration (release) (#1592), 2025-09-02 by *Michael Sverdlov*


## v7.25.14

- [f5b86ff](https://github.com/AxaFrance/oidc-client/commit/f5b86ffe656845c26b6f7bcf88da43cf8ece173e) - fix(renewTokens): prevent infinite loop on renew token flow (#1581) (release), 2025-08-02 by *Matheus Frigo*


## v7.25.13

- [31661bc](https://github.com/AxaFrance/oidc-client/commit/31661bc16d67866b6e8d5b978b117600b769fe28) - refcator(all): update dependencies (#1567) (release), 2025-05-05 by *Guillaume Chervet*


## v7.25.12

- [f19cca8](https://github.com/AxaFrance/oidc-client/commit/f19cca8c4a0aa24f5646e13c80610148037e3bad) - fix(oidc-service-worker): stream already consumed (#1558) (release), 2025-04-30 by *Guillaume Chervet*


## v7.25.11

- [e5e958a](https://github.com/AxaFrance/oidc-client/commit/e5e958a34f39ab349b34e094bc17f5df3b49b8f9) - fix(oidc-service-worker): missing body (#1556) (release), 2025-04-29 by *Guillaume Chervet*


## v7.25.10

- [dbb52da](https://github.com/AxaFrance/oidc-client/commit/dbb52dad456d2429d21fd5a645ff27d6b21e056a) - fix(serviceworker): ios (#1554) (release), 2025-04-24 by *Guillaume Chervet*
- [f2f447e](https://github.com/AxaFrance/oidc-client/commit/f2f447e34805822387281126b93ec39153fb5672) - refactor(all): updates libraries, 2025-04-14 by *Guillaume Chervet*


## v7.25.9

- [c1ece66](https://github.com/AxaFrance/oidc-client/commit/c1ece663131db50a8c1152b18be0d3d5f6a0025e) - fix(oidc): make bearer fetch works on safari back (release) (#1550), 2025-04-11 by *Guillaume Chervet*


## v7.25.8

- [4c85da7](https://github.com/AxaFrance/oidc-client/commit/4c85da7d0e0e802c95efe31c5de948ac5abd5494) - fix(oidc-service-worker): Error with latest Safari (#1547) (release), 2025-04-04 by *Guillaume Chervet*


## v7.25.7

- [930ad03](https://github.com/AxaFrance/oidc-client/commit/930ad0367cfcaa5bd15726c17501d70b0768ce5e) - fix(oidc-service-worker): fetch already consume (release) (#1534), 2025-04-01 by *Guillaume Chervet*


## v7.25.6

- [2cb8cde](https://github.com/AxaFrance/oidc-client/commit/2cb8cdeafdb39fadc19beb878808a5d2291cd6fa) - fix(oidc): multi-tab dpop not working with (#1531) (release), 2025-03-28 by *Guillaume Chervet*


## v7.25.5

- [d7567ba](https://github.com/AxaFrance/oidc-client/commit/d7567ba28c0dfe9b248be52ecfac4df6f98b397b) - feature(oidc-service-worker): multi tab auth (#1528) (release), 2025-03-27 by *Guillaume Chervet*


## v7.25.4

- [1b2fa1d](https://github.com/AxaFrance/oidc-client/commit/1b2fa1da513b419c2c28e67a331d12670b07a94d) - refactor(oidc): update librairie (release), 2025-03-25 by *Guillaume Chervet*


## v7.25.3

- [ca0f064](https://github.com/AxaFrance/oidc-client/commit/ca0f0645c52dd827b97912d5ee6f1836e05f56e1) - fix(oidc): lost session back (release) (#1514), 2025-02-06 by *Guillaume Chervet*


## v7.25.2

- [15900f4](https://github.com/AxaFrance/oidc-client/commit/15900f42e42539a5b12a4c23959ec95c695426d9) - fix(oidc): MonitorSession/CheckSession initializes only on one tab (release) (#1513), 2025-02-05 by *Guillaume Chervet*


## v7.25.1

- [f0641a6](https://github.com/AxaFrance/oidc-client/commit/f0641a6ff21a7cf600ee5e782a3e3114b462551c) - fix(oidc): remove use of localStorage for cache (release), 2025-02-05 by *Guillaume Chervet*


## v7.25.0

- [07754f5](https://github.com/AxaFrance/oidc-client/commit/07754f5643cbe21e6e6eb248b8a6398bd0de2fd7) - fix(oidc): refresh silent signin scope=null (release) (#1503), 2025-01-24 by *Guillaume Chervet*
- [2c08373](https://github.com/AxaFrance/oidc-client/commit/2c0837357b341eeeabbe16b40857240e7d2a596b) - feat(all): update libraries (#1494), 2025-01-12 by *Guillaume Chervet*


## v7.24.1

- [3fe0511](https://github.com/AxaFrance/oidc-client/commit/3fe05117c29704f9be56604eb9ffa7195bcdc517) - refactor(react-oidc): react 19 compatibility (#1493) (release), 2025-01-10 by *Guillaume Chervet*


## v7.24.0

- [de5da36](https://github.com/AxaFrance/oidc-client/commit/de5da362de4e3f10d46ffdfafd324e14e173b78c) - feat(scope): scope can be change dynamically (release) (#1489), 2025-01-03 by *Guillaume Chervet*


## v7.23.1

- [0f69a11](https://github.com/AxaFrance/oidc-client/commit/0f69a114564134dee63f78654b9af82f0b291ec9) - fix(oidc): login async promise (release), 2024-11-27 by *Guillaume Chervet*


## v7.23.0

- [30fda23](https://github.com/AxaFrance/oidc-client/commit/30fda231324b18bb026de30e537e0bce7cc3bbc1) - feat(oidc-react): add missing scope property in login route (release), 2024-11-22 by *Guillaume Chervet*
- [4d77aae](https://github.com/AxaFrance/oidc-client/commit/4d77aae5ec4564f1866ebc9ba5e9f2ad1bd51b63) - fix(oidc): dpop typo (#1482), 2024-11-08 by *Guillaume Chervet*
- [08a21f8](https://github.com/AxaFrance/oidc-client/commit/08a21f89842f1aa8123bfd1eea046a8f1d4a8e96) - fix(demo): better demo (#1480), 2024-11-05 by *Guillaume Chervet*


## v7.22.32

- [3f885fc](https://github.com/AxaFrance/oidc-client/commit/3f885fc158ded05ea37b9d7925bd801b63321231) - fix(oidc): remove console.log (release), 2024-10-04 by *Guillaume Chervet*


## v7.22.31

- [cc731c1](https://github.com/AxaFrance/oidc-client/commit/cc731c15f1d72ce4d21a7958ca15128ae1dcdd89) - fix(oidc): force sw update when new registration appears (release) (#1449), 2024-10-02 by *wermanoid*


## v7.22.30

- [8c98b27](https://github.com/AxaFrance/oidc-client/commit/8c98b2701e1118538455816ca458062cfc07d716) - fix(oidc): remove missing console.log (#1472) (release), 2024-10-01 by *Guillaume Chervet*


## v7.22.29

- [e297a7b](https://github.com/AxaFrance/oidc-client/commit/e297a7b5bd9d3eebb7cea443185039a7cb74d2f4) - fix(oidc): navigator locks null (#1466) (release), 2024-09-29 by *Guillaume Chervet*


## v7.22.28

- [346bdce](https://github.com/AxaFrance/oidc-client/commit/346bdce138a6b43ab4b31b56447161f9a6cdadeb) - fix(oidc): fetchWithTokens was using a snapshot of tokens (#1465) (release), 2024-09-29 by *Guillaume Chervet*


## v7.22.27

- [6354370](https://github.com/AxaFrance/oidc-client/commit/63543705c9b9a8182d47564bfc24a811c1f50e84) - fix(oidc): user reload time before expiration (release) (#1464), 2024-09-28 by *Guillaume Chervet*


## v7.22.26

- [10e7257](https://github.com/AxaFrance/oidc-client/commit/10e7257a0d2257bd8905b3b00ca1fe7ad757e74c) - fix(oidc): lock unexpected behavior (#1459) (release), 2024-09-27 by *Guillaume Chervet*


## v7.22.25

- [3a0d48e](https://github.com/AxaFrance/oidc-client/commit/3a0d48ea0d3609d31de0f45d6aebfb1a23b25e73) - fix(oidc): number timer increase (#1457) (release), 2024-09-26 by *Guillaume Chervet*


## v7.22.24

- [b34eabf](https://github.com/AxaFrance/oidc-client/commit/b34eabf39ce108f8de93a49f1a4d9ec6e46d642c) - refactor(all): update dependencies (#1446) (release), 2024-09-02 by *Guillaume Chervet*
- [35081e1](https://github.com/AxaFrance/oidc-client/commit/35081e16b947ebd490b83a1f6d6b9dc101363736) - Merge branch 'main' of https://github.com/AxaFrance/oidc-client into HEAD, 2024-08-25 by *Guillaume Chervet*
- [70dd233](https://github.com/AxaFrance/oidc-client/commit/70dd233f69f2b2a9c5da4a2514e2cc657cf435a2) - Merge branch 'main' of https://github.com/AxaFrance/oidc-client, 2024-08-25 by *Guillaume Chervet*
- [47f9de1](https://github.com/AxaFrance/oidc-client/commit/47f9de1f648838ae085c45a5dcd55687f80829c5) - fix(oidc): remove no-existing property add typings (release), 2024-08-25 by *Guillaume Chervet*


## v7.22.23

- [d15a57d](https://github.com/AxaFrance/oidc-client/commit/d15a57d98309db99d3bcd8d1a6a4fbeffe1b5402) - Fix(oidc): usage of config option service_worker_register (#1440) (release), 2024-08-25 by *Thomas Miliopoulos*


## v7.22.22

- [d213de1](https://github.com/AxaFrance/oidc-client/commit/d213de1a49d891cc1c0f399621f696ed861c145e) - doc(oidc) :Update README.md (release), 2024-08-20 by *Guillaume Chervet*
- [1159262](https://github.com/AxaFrance/oidc-client/commit/115926280965cffc5a4f7ea2234bf1a0017ff896) - fix(logout): should work correctly with multiple tabs (alpha) (#1435), 2024-08-13 by *wermanoid*
- [23ae6ba](https://github.com/AxaFrance/oidc-client/commit/23ae6ba287a85cc879c92228feb3855dcbe2930e) - fix(oidc): Add undefined as union type into arguments for login, logout, renewTokens (#1429) (alpha), 2024-08-02 by *ShimpeiKamiguchi*


## v7.22.21

- [318de92](https://github.com/AxaFrance/oidc-client/commit/318de922980c167dd9fc1a743d2dedd106b9a02d) - fix(oidc): Add null as union type into arguments for login, logout, renewTokens functions (#1427) (release), 2024-07-26 by *ShimpeiKamiguchi*


## v7.22.20

- [05ace2d](https://github.com/AxaFrance/oidc-client/commit/05ace2dce4a36493b1d127d049c3ef7d5ebd90b4) - fix(oidc): record tabIds when service worker receives init event (release), 2024-07-22 by *mkrzempek*
- [6b5f6b4](https://github.com/AxaFrance/oidc-client/commit/6b5f6b428aba70b32d5264b0de89752a00b352e3) - refactor(initWorker): null coalescing, 2024-07-21 by *Jason Finch*
- [34bd8e4](https://github.com/AxaFrance/oidc-client/commit/34bd8e4b3388761b2127a9c73980d74edac7b3ad) - refactor(parameters): Default parameters should be last.sonarlint(typescript:S1788), 2024-07-21 by *Jason Finch*
- [44fa6f2](https://github.com/AxaFrance/oidc-client/commit/44fa6f2678f989ee23a84a506aea3caf159b9c2c) - fix spelling `token_acquired`, 2024-07-21 by *Jason Finch*
- [32a2af3](https://github.com/AxaFrance/oidc-client/commit/32a2af3028cd69581d1ab0ee183c7b3146998b41) - chore(lint): Fix lint warnings., 2024-07-21 by *Jason Finch*


## v7.22.19

- [2cf0b62](https://github.com/AxaFrance/oidc-client/commit/2cf0b6243b39f3927d75fb80a96030259b7c16a2) - fix(oidc): autorenew from custom fetch was broken (release), 2024-07-20 by *Guillaume Chervet*
- [f1d9da4](https://github.com/AxaFrance/oidc-client/commit/f1d9da44647d5b754df9c73cadb899179a98982b) - fix(oidc): lint (alpha), 2024-07-19 by *Guillaume Chervet*
- [e4f4d97](https://github.com/AxaFrance/oidc-client/commit/e4f4d9774acb94f968b566b69cb8f11581a76830) - chore: apply prettier in repo, 2024-07-18 by *Alex Werman*
- [02b00e0](https://github.com/AxaFrance/oidc-client/commit/02b00e075aeb8a291e1fc72b28ffe4eab1787db4) - fix(eslint): Fix ESLint to run prettier, 2024-07-17 by *Jason Finch*
- [9191b0c](https://github.com/AxaFrance/oidc-client/commit/9191b0c2f95491fd12cf93673bb468d9b6d61774) - chore(packages): Bump packages for eslint/prettier, 2024-07-17 by *Jason Finch*
- [a082b20](https://github.com/AxaFrance/oidc-client/commit/a082b20a943ab6322e69c00770d8ba86c9b8eaa2) - fix (Lint): Fix lint errors after rebase., 2024-07-17 by *Jason Finch*
- [f6cf194](https://github.com/AxaFrance/oidc-client/commit/f6cf194d9c14d7eba20f23a89e215bb9cc6cacd1) - refactor(silentcallback): Catch any errors in async playCallbackAsync, 2024-07-13 by *Jason Finch*
- [8797330](https://github.com/AxaFrance/oidc-client/commit/8797330ea5060a77b8d10a352ff166a33210f6aa) - refactor(lint): Fix minor lint issues, 2024-07-13 by *Jason Finch*
- [bb7bc92](https://github.com/AxaFrance/oidc-client/commit/bb7bc929f7a1bc4f1d210216d89fad881056990f) - fix (lint): Fix all lint errors reporting by eslint., 2024-07-12 by *Jason Finch*
- [cd2f57e](https://github.com/AxaFrance/oidc-client/commit/cd2f57edb99e04495b9884723cd05277a45aad43) - fix(demo): Update configurations.ts, 2024-07-16 by *Guillaume Chervet*


## v7.22.18

- [5ee0cc8](https://github.com/AxaFrance/oidc-client/commit/5ee0cc8f6d823056da221ad081c3821ba9fac343) - fix(oidc): separate state, nonce and codeVerifier for each tab (release) (#1402), 2024-07-16 by *Miya*


## v7.22.17

- [b099078](https://github.com/AxaFrance/oidc-client/commit/b099078f9d4b61dffd03034f511a4f32e80977a8) - fix(oidc): clenup client internal promises when requests are finished (release) (#1417), 2024-07-15 by *wermanoid*
- [01f0714](https://github.com/AxaFrance/oidc-client/commit/01f0714241e6442e6b58fcba8b86804ed75cec09) - tests(domain): Be more explicit about intent of test, is to not throw, not return undefined. (#1413), 2024-07-15 by *Jason Finch*
- [b94fa5c](https://github.com/AxaFrance/oidc-client/commit/b94fa5ca90bd366c4f59a870c428f42872bfacaa) - docs: Minor language change. (#1412), 2024-07-15 by *Jason Finch*
- [7caee91](https://github.com/AxaFrance/oidc-client/commit/7caee919b4854526dad83203216965746baecabe) - build(job): Update job scripts to v4. (earlier versions are marked deprecated) (#1411), 2024-07-15 by *Jason Finch*
- [a46b1aa](https://github.com/AxaFrance/oidc-client/commit/a46b1aabe19db70beac342c557ae2c986d16eae7) - fix (FetchToken): Fix FetchToken param to be boolean (#1414), 2024-07-15 by *Jason Finch*
- [a989ed2](https://github.com/AxaFrance/oidc-client/commit/a989ed29f46b66483bc2c7c51e73bcc19b2c9736) - build(lint): Update lint step to run. (#1409), 2024-07-13 by *Jason Finch*


## v7.22.16

- [72a6373](https://github.com/AxaFrance/oidc-client/commit/72a6373402a53aaaf01ad7fac22f8ad8c6feaff0) - fix(oidc): improve error handling (release) (#1403), 2024-07-11 by *Miya*
- [c56ceb8](https://github.com/AxaFrance/oidc-client/commit/c56ceb815b28dd5990fe4a1679a61bcebc7e525a) - docs(readme): Update README.md (#1407), 2024-07-12 by *Jason Finch*




# FAQ (Frequently Asked Questions)

## How work silent signing ?

## Hard-reload in browser unregister ServiceWorker
https://github.com/AxaFrance/react-oidc/issues/1098


## window.crypto.subtle is unavailable
https://github.com/AxaFrance/react-oidc/issues/1028

## Why OIDC at Client side instead of BFF (Backend for Frontend) ?

We think that @axa-fr/oidc-client is a good choice for the following reasons :
- Secure by default with the use of the Service Worker. OIDC at Server Side from a BFF can be secure but with a bad configuration it can be very insecure. With OIDC Client you reuse the OIDC Server configuration which generally is well configured by OIDC security experts, so secure.
- With OIDC at Server side, It is more difficult to fine grain the scope of the token. With OIDC at Client side you can acquire a new token with a new scope for specific scenario (multiple authentication). You can fine tune token lifetime and scope for each scenario.
- Sometime your Web Application does not need a server, OIDC at client side is a good choice because you do not need to spend money for a server juste for Authentication. For example for a payment, you can retrieve only an access_token valid 2 minutes without any refresh_token.
- OIDC at Client side can be also a good choice for a fast time to market. You can start with OIDC at Client side and then migrate to OIDC at Server side if you need it. The two solutions are compatible.


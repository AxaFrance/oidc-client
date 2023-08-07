# FAQ (Frequently Asked Questions)

## Condition to make silent signing work 

Third party cookies are blocked by default on Safari. 
They will be on all browsers very soon.
Today, silent signing work on safari only if OIDC provider is on the same domain than client application. 
Third party cookies are blocked. They will be on all browsers very soon.

The only way to be sure to have silent signing working on all browsers, you need to have your OIDC provider on the same domain than your client application.

Example of domain that work:
- https://oidc-provider.axa.fr
- https://my-app.axa.fr

Silent Signing use cookies with your OIDC provider to restore the session and retrieve tokens.
It open in background an IFrame to a specific page to your OIDC provider.

## Condition to make Single Logout to work

Same constraint for Single Logout that for "silent signing".
*Single logout allow your to disconnect from multiple OIDC Client session in one action event if your are connected on different application.

## Condition to make Monitor Session to work

Same constraint for "monitorSession" that for "silent signing".

Monitor session allow you to be notified when your session is expired or when you are disconnected from your OIDC provider.

## Tokens are always refreshed in background every seconds

@axa-fr/oidc-client refresh automatically tokens in  background.
It refresh token before its expiration to have always a valid token.

If your tokens sessions Lifetime is too short, it will refresh it very often.
It start refreshing 120 seconds before expiration.

So set a session validity upper from 3 minutes is a good idea.

By default @axa-fr/oidc-client take the shortest lifetime between access_token and id_token.
You can use the option "token_renew_mode" to change this behavior.

 - **token_renew_mode**: String, // Optional, update tokens based on the selected token(s) lifetime: "access_token_or_id_token_invalid" (default), "access_token_invalid", "id_token_invalid"

## Hard-reload in browser unregister ServiceWorker
https://github.com/AxaFrance/react-oidc/issues/1098

## window.crypto.subtle is unavailable over HTTP

The library does not work over HTTP. You need to use HTTPS.
We think it is quite easy to setup nowadays event on local development.

https://github.com/AxaFrance/react-oidc/issues/1028

## Why OIDC at Client side instead of BFF (Backend for Frontend) ?

We think that @axa-fr/oidc-client is a good choice for the following reasons :
- Secure by default with the use of the Service Worker. OIDC at Server Side from a BFF can be secure but with a bad configuration it can be very insecure. With OIDC Client you reuse the OIDC Server configuration which generally is well configured by OIDC security experts, so secure.
- With OIDC at Server side, It is more difficult to fine grain the scope of the token. With OIDC at Client side you can acquire a new token with a new scope for specific scenario (multiple authentication). You can fine tune token lifetime and scope for each scenario.
- Sometime your Web Application does not need a server, OIDC at client side is a good choice because you do not need to spend money for a server juste for Authentication. For example for a payment, you can retrieve only an access_token valid 2 minutes without any refresh_token.
- OIDC at Client side can be also a good choice for a fast time to market. You can start with OIDC at Client side and then migrate to OIDC at Server side if you need it. The two solutions are compatible.

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
    <img src="./docs/img/react-oidc-cost.PNG"
     alt="@axa-fr/oidc-client is the simplest and cheapest."
      />
  <br>
  @axa-fr/oidc-client is the simplest and cheapest.
</p>

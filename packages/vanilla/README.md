# @axa-fr/vanilla-oidc

## About

Wrap of ["oidc client"](https://github.com/IdentityModel/oidc-client-js) library in order to simplify its use. All callback routes are managed by the same javascript application.
This library aim to simplify the migration of our all authentification system to OIDC using "implicit" flow.
The library is built in vanilla js in order to be used with old javascript librairies like : anuglarjs, jquery, etc.

## Getting Started

```sh
npm install @axa-fr/vanilla-oidc --save

```

### Application startup (index.js)

We advise to use the callback route bellow :

- www.your-app.fr/authentication/callback
- www.your-app.fr/authentication/silent_callback
- www.your-app.fr/authentication/not-authenticated
- www.your-app.fr/authentication/not-authorized

```html
<!--[if (IE)]>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/es6-promise/4.1.1/es6-promise.js"></script>
<![endif]-->
<script src="https://cdnjs.cloudflare.com/ajax/libs/oidc-client/1.6.1/oidc-client.js"></script>
<script src="https://rawcdn.githack.com/AxaGuilDEv/react-oidc/master/packages/vanilla/src/vanilla-oidc.js"></script>
```

"Authentificationprovider" accept the following properties :

```javascript
const configuration = {
  client_id: "implicit",
  redirect_uri: "http://localhost:3000/authentication/callback",
  response_type: "id_token token",
  post_logout_redirect_uri: "http://localhost:3000/",
  scope: "openid profile email",
  authority: "https://demo.identityserver.io",
  silent_redirect_uri: "http://localhost:3000/authentication/silent_callback",
  automaticSilentRenew: true,
  loadUserInfo: true,
  triggerAuthFlow: true
};

var modules = ["ms.experience.weather"];
var app = angular.module("ms.experience", modules);

app.factory("authentificationInterceptor", [
  "$location",
  function($location) {
    return {
      request: function(config) {
        // get the current user data
        var user = window.vanillaOidc.getUserSync();
        if (user && user.access_token) {
          config.headers.authorization = "Bearer " + user.access_token;
        }
        return config;
      },
      responseError: function(error) {
        if (error.status === 401) {
          // You can signinSilent and relplay the request http if you need it
          // return window.oidcWithRouter.signinSilent().then(function (user) {
          // TODO do what you want
          //});
        }
        if (error.status === 403) {
          // TODO do what you want
          // $location.url("/error403");
        }
      }
    };
  }
]);

app.config([
  "$httpProvider",
  function($httpProvider) {
    $httpProvider.interceptors.push("authentificationInterceptor");
  }
]);

app.run([function() {}]);

window.vanillaOidc.init(configuration).then(function(status) {
  if (status.type !== "callback") {
    if (!status.user) {
      // start the signin
      window.vanillaOidc.signinRedirect();
    } else {
      // start the angularjs application
      angular.bootstrap(document.getElementById("ms.experience.id"), [
        "ms.experience"
      ]);
    }
  }
});
```

All your server side callback route should redirect to your javascript application (configured with our library).

```csharp
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using System.Web.Routing;

namespace MS.Experiences.Web
{
    public class RouteConfig
    {
        public static void RegisterRoutes(RouteCollection routes)
        {
            routes.IgnoreRoute("{resource}.axd/{*pathInfo}");

            routes.MapRoute(
                name: "home",
                url: "",
                defaults: new { controller = "Home", action = "Index", id = UrlParameter.Optional }
            );

            routes.MapRoute(
                name: "silent_callback",
                url: "authentication/silent_callback",
                defaults: new { controller = "Home", action = "Index", id = UrlParameter.Optional }
            );
            routes.MapRoute(
                name: "callback",
                url: "authentication/callback",
                defaults: new { controller = "Home", action = "Index", id = UrlParameter.Optional }
            );

            routes.MapRoute(
                name: "Default",
                url: "{controller}/{action}/{id}",
                defaults: new { controller = "Home", action = "Index", id = UrlParameter.Optional }
            );
        }
    }
}
```

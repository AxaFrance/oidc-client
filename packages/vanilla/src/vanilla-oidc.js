/* eslint-disable */
window.vanillaOidc = (function(Oidc) {
  var userManager = null;
  var configuration = configuration;
  let state = { oidcUser: null };

  function init(config) {
    userManager = new Oidc.UserManager(config);
    configuration = config;
    var events = userManager.events;
    events.addUserLoaded(onUserLoaded);
    events.addSilentRenewError(onError);
    events.addUserUnloaded(onUserUnloaded);
    events.addUserSignedOut(onUserUnloaded);
    events.addAccessTokenExpired(onAccessTokenExpired);

    if (document.location.toString().includes(config.redirect_uri)) {
      return userManager
        .signinRedirectCallback()
        .then(function(user) {
          if (user.state.url) {
            document.location = user.state.url;
          }
        })
        .then(function() {
          return { type: "callback" };
        });
    } else if (
      document.location.toString().includes(config.silent_redirect_uri)
    ) {
      return userManager.signinSilentCallback().then(function() {
        return { type: "callback" };
      });
    }
    return userManager.getUser().then(function(user) {
      state.oidcUser = user;
      return { type: "user", user: user };
    });
  }

  function onUserLoaded(user) {
    state = {
      oidcUser: user
    };
    console.log(user);
  }

  function onUserUnloaded() {
    state = {
      oidcUser: null
    };
  }

  function onAccessTokenExpired() {
    state = {
      oidcUser: null
    };
    return userManager.signinSilent();
  }

  function onError(error) {
    state = {
      error: error
    };
  }

  var logout = function() {
    state = {
      oidcUser: null
    };
    var events = userManager.events;
    events.removeUserLoaded(onUserLoaded);
    events.removeSilentRenewError(onError);
    events.removeUserUnloaded(onUserUnloaded);
    events.removeUserSignedOut(onUserUnloaded);
    events.removeAccessTokenExpired(onAccessTokenExpired);
  };

  function signinSilent() {
    state = {
      oidcUser: null
    };
    return userManager.signinSilent();
  }

  function signinRedirect(url) {
    if (!url) {
      url = document.location.toString();
    }
    return userManager.signinRedirect({
      state: { url: url }
    });
  }

  return {
    state: state,
    signinRedirect: signinRedirect,
    signinSilent: signinSilent,
    logout: logout,
    init: init,
    getUserSync: function() {
      return state.oidcUser;
    }
  };
})(Oidc);

/* eslint-disable */
import { UserManager } from "oidc-client";

let _userManager = null;
let state = { oidcUser: null };
let _document = null;

const onUserLoaded = user => {
  state = {
    oidcUser: user
  };
};

const onUserUnloaded = () => {
  state = {
    oidcUser: null
  };
};

const onAccessTokenExpired = () => {
  state = {
    oidcUser: null
  };
  return _userManager.signinSilent();
};

const onError = error => {
  state = {
    error
  };
};

const init = (config, document = window.document) => {
  _userManager = new UserManager(config);
  const { events } = _userManager;
  events.addUserLoaded(onUserLoaded);
  events.addSilentRenewError(onError);
  events.addUserUnloaded(onUserUnloaded);
  events.addUserSignedOut(onUserUnloaded);
  events.addAccessTokenExpired(onAccessTokenExpired);
  _document = document;
  if (_document.location.toString().includes(config.redirect_uri)) {
    return _userManager
      .signinRedirectCallback()
      .then(user => {
        if (user.state.url) {
          _document.location = user.state.url;
        }
      })
      .then(() => {
        return { type: "callback" };
      });
  } else if (
    _document.location.toString().includes(config.silent_redirect_uri)
  ) {
    return _userManager.signinSilentCallback().then(() => {
      type: "callback";
    });
  }
  return _userManager.getUser().then(user => {
    state.oidcUser = user;
    return { type: "user", user };
  });
};

const logout = () => {
  state = {
    oidcUser: null
  };
  const { events } = _userManager;
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
  return _userManager.signinSilent();
}

function signinRedirect(url) {
  if (!url) {
    url = _document.location.toString();
  }
  return _userManager.signinRedirect({
    state: { url: url }
  });
}

export default {
  state,
  signinRedirect,
  signinSilent,
  logout,
  init,
  getUserSync() {
    return state.oidcUser;
  }
};

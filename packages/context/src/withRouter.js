import React from "react";

const generateKey = () =>
  Math.random()
    .toString(36)
    .substr(2, 6);

const withRouter = Component => props => {
  const history = window.history;
  history.push = function(url, stateHistory) {
    const key = generateKey();
    const state = stateHistory || this.state;
    this.pushState({ key, state }, null, url);
    window.dispatchEvent(new Event('popstate'));
  };
  const enhanceProps = {
    history,
    location: window.location,
    ...props
  };
  return <Component {...enhanceProps} />;
};

export default withRouter;

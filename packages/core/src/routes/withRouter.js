import React from 'react';

const generateKey = () =>
  Math.random()
    .toString(36)
    .substr(2, 6);

const withRouter = Component => props => {
  const { history } = window;
  history.push = (url, stateHistory) => {
    const key = generateKey();
    const state = stateHistory || window.history.state;
    window.history.pushState({ key, state }, null, url);
    window.dispatchEvent(new Event('popstate'));
  };
  const enhanceProps = {
    history,
    location: window.location,
    ...props,
  };
  return <Component {...enhanceProps} />;
};

export default withRouter;

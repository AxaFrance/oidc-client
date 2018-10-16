import React, { Component } from "react";
import logo from "./logo.svg";
import "./App.css";
import { Route, Switch, Link } from "react-router-dom";
import { OidcSecure, oidcSecure } from "@axa-fr/react-oidc-redux";
import { withAuthentication } from "@axa-fr/react-oidc-redux-fetch";
import { withFetchObservable } from "@axa-fr/react-oidc-fetch-observable";
import { flatMap } from "rxjs/operators";

import User from "./User";
import configuration from "./configuration";
import { compose, withProps } from "recompose";

const fetch = status => (url, options) => {
  return new Promise(resolve => {
    setTimeout(
      () =>
        resolve({
          status
        }),
      350
    );
  });
};

const enhance401 = compose(
  withAuthentication(fetch(401)),
  withProps(props => ({
    handleClick: e => {
      e.preventDefault();
      props
        .fetch("http://www.demo.url")
        .then(() => alert("fetch end"))
        .catch(e => alert(e));
    },
    handObservable: e => {
      e.preventDefault();
      props.fetchWithObservable("").suscribre(() => {});
    }
  }))
);

const Button401 = ({ handleClick }) => (
  <button onClick={handleClick} type="button">
    Simulate 401
  </button>
);

const Button401Enhance = enhance401(Button401);

const enhance403 = compose(
  withAuthentication(fetch(403)),
  withProps(props => ({
    handleClick: e => {
      e.preventDefault();
      props
        .fetch("http://www.demo.url")
        .then(() => alert("fetch end"))
        .catch(e => alert(e));
    }
  }))
);

const Button403 = ({ handleClick }) => (
  <button onClick={handleClick} type="button">
    Simulate 403
  </button>
);

const Button403Enhance = enhance403(Button403);

const enhanceObservable = compose(
  withAuthentication(global.fetch),
  withFetchObservable(global.fetch),
  withProps(props => ({
    handObservableClick: e => {
      e.preventDefault();
      props
        .fetchWithObservable(" http://www.mocky.io/v2/5bc6643f3200005e000b032b")
        .pipe(flatMap(r => r.json()))
        .subscribe(resp => {
          console.warn(resp);
          alert(JSON.stringify(resp));
        });
    }
  }))
);
const ButtonObservable = ({ handObservableClick }) => (
  <button onClick={handObservableClick} type="button">
    Simulate Observable
  </button>
);

const ButtonObservableEnhanced = enhanceObservable(ButtonObservable);

const Home = () => (
  <div className="App">
    <header className="App-header">
      <img src={logo} className="App-logo" alt="logo" />
      <h1 className="App-title">Home</h1>
    </header>
    <Link to="/protected1">protected1</Link>
    <span> - </span>
    <Link to="/protected2">protected2</Link>
    <p>Demo access_token is valid during 30 seconds</p>
    <Button403Enhance />
    <Button401Enhance />
    <ButtonObservableEnhanced />
  </div>
);

const ProtectedChild = () => (
  <OidcSecure isEnabled={configuration.isEnabled}>
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <h1 className="App-title">Protected 2</h1>
      </header>
      <Link to="/">Home</Link>
      <User />
    </div>
  </OidcSecure>
);

const NotProtectedChild = () => (
  <div className="App">
    <header className="App-header">
      <img src={logo} className="App-logo" alt="logo" />
      <h1 className="App-title">Protected 1</h1>
    </header>
    <Link to="/">Home</Link>
    <User />
  </div>
);

class App extends Component {
  render() {
    return (
      <Switch>
        <Route path="/protected1" component={oidcSecure(NotProtectedChild)} />
        <Route path="/protected2" component={ProtectedChild} />
        <Route path="/" component={Home} />
      </Switch>
    );
  }
}

export default App;

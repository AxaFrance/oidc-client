import React from "react";
import { render } from "react-dom";
import { BrowserRouter as Router } from "react-router-dom";
import { AuthenticationProvider, oidcLog } from "@axa-fr/react-oidc-context";
import Header from "./Layout/Header";
import Routes from "./Router";
import oidcConfiguration from "./configuration";

const App = () => (
  <div>
    <Router>
      <AuthenticationProvider
        configuration={oidcConfiguration}
        loggerLevel={oidcLog.DEBUG}
        isEnabled={true}
      >
        <Header />
        <Routes />
      </AuthenticationProvider>
    </Router>
  </div>
);

render(<App />, document.getElementById("root"));

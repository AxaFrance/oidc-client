# @axa-fr/react-oidc-redux-fetch

## About

This component allows by composition to improve "fetch" of new behavior. The "fetch" return to the same signature as "fetch". You do not have to use these components if they do not meet your needs. The purpose of these components is to avoid you always writing the same code and normalize the behavior (url, redirection, ect.) of your applications.

- withFetchRedirectionOn403
  - Allow to redirects to the unauthorized route
- withFetchSilentAuthenticateAndRetryOn401
  - Triggers authentication the update of the token if it has expired
- withFetchToken
  - Injects the token jwt in bearer mode to make the REST call to the server
- withAuthentication
  - Composition of the previous 3 behaviors.

## Getting Started

```sh
npm install @axa-fr/react-oidc-redux-fetch --save
```

```javascript
import { compose, lifecycle } from 'recompose';
import { withAuthentication } from '@axa-fr/react-oidc-redux-fetch';

const enhance = compose(
  withAuthentication,
  lifecycle({
    componentWillMount() {
      // This "fetch" manage more than the orginal fetch
      this.props
        .fetch('/yourapi')
        .then(function(response) {
          // Do Something
        })
        .then(function(body) {
          // Do Something else
        });
    }
  })
);

export default enhance(FleetDeclaration);
```

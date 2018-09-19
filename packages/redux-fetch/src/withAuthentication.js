import { compose } from 'recompose';
import { withFetchRedirectionOn403 } from '@axa-fr/react-oidc-fetch-core';
import withFetchSilentAuthenticateAndRetryOn401 from './withFetchSilentAuthenticateAndRetryOn401';
import withFetchToken from './withFetchToken';

const enhance = fetch =>
  compose(
    withFetchToken(fetch),
    withFetchSilentAuthenticateAndRetryOn401(),
    withFetchRedirectionOn403()
  );

export default enhance;

import { compose, withProps } from 'recompose';
import { withOidcUser } from '@axa-fr/react-oidc-context';
import { fetchToken } from '@axa-fr/react-oidc-fetch-core';

const enhance = fetch =>
  compose(
    withOidcUser,
    withProps(fetchToken(fetch))
  );

export default enhance;

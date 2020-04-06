import { compose, withProps } from 'recompose';
import { withOidcUser } from '@axa-fr/react-oidc-context';
import { fetchToken } from '@axa-fr/react-oidc-fetch-core';

type WindowFetch = typeof fetch;

const enhance = (fetch: WindowFetch) =>
  compose(
    withOidcUser,
    withProps(({ oidcUser }) => ({
      user: oidcUser,
    })),
    withProps(fetchToken(fetch))
  );

export default enhance;

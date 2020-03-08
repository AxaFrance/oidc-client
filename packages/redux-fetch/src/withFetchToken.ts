import { connect } from 'react-redux';
import { compose, withProps } from 'recompose';
import { fetchToken } from '@axa-fr/react-oidc-fetch-core';

const mapStateToProps = (state: any) => ({ user: state.oidc.user });

type WindowFetch = typeof fetch;

const enhance = (fetch: WindowFetch) =>
  compose(
    connect(
      mapStateToProps,
      null
    ),
    withProps(fetchToken(fetch))
  );

export default enhance;

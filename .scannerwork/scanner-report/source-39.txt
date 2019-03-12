import { connect } from 'react-redux';
import { compose, withProps } from 'recompose';
import { fetchToken } from '@axa-fr/react-oidc-fetch-core';

const mapStateToProps = state => ({ user: state.oidc.user });

const enhance = fetch =>
  compose(
    connect(
      mapStateToProps,
      null
    ),
    withProps(fetchToken(fetch))
  );

export default enhance;

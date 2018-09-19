import { connect } from 'react-redux';
import User from './User';

const mapStateToProps = (state, props) => {
  const user = state.oidc.user;
  const isAuthenticated = user !== null && !user.expired;
  return {
    isVisible: isAuthenticated,
    name: user && user.profile ? user.profile.name : '',
    profile: user && user.profile ? user.profile.prefered_username : '',
  };
};

const enhance = connect(mapStateToProps);

export default enhance(User);

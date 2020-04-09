// TODO: Remove this `raf` polyfill once the below issue is sorted
// https://github.com/facebookincubator/create-react-app/issues/3199#issuecomment-332842582
import Enzyme from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';

Enzyme.configure({ adapter: new Adapter() });

const throwError = message => {
  throw new Error(message);
};

global.console.error = throwError;
// Need nw PR to Remove recompose wich occurs warning with latest React package
// https://github.com/AxaGuilDEv/react-oidc/issues/430
// global.console.warn = throwError;

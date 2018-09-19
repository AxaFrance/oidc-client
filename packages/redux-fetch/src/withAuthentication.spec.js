import withAuthentication from './withAuthentication';

describe('redux-fetch.withAuthentication', () => {
  it('should return a function', () => {
    const enhance = withAuthentication();
    expect(typeof enhance).toBe('function');
  });
});

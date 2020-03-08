import withFetchToken from './withFetchToken';

describe('redux-fetch.withFetchToken', () => {
  it('should return a function', () => {
    const enhance = withFetchToken();
    expect(typeof enhance).toBe('function');
  });
});

import { fetchWithRedirectionOn401 } from './withFetchRedirectionOn401';

describe('fetch.withFetchRedirectionOn401', () => {
  it('should navigate on not-authenticated page', async () => {
    const history = { push: jest.fn() };
    const response = { status: 401 };
    const fetch = () =>
      new Promise(resolve => {
        resolve(response);
      });
    await fetchWithRedirectionOn401(fetch, history)();
    expect(history.push.mock.calls[0][0]).toBe('/authentication/not-authenticated');
    response.status = 200;
    await fetchWithRedirectionOn401(fetch, history)();
    expect(history.push.mock.calls).toHaveLength(1);
  });
});

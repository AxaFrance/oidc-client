import * as baseRouteService from './baseRouteService';

describe('BaseRouteService tests suite', () => {
  it('should get empty string if base route is not set', () => {
    expect(baseRouteService.getBaseRoute()).toBe('');
  });

  it('should be able to set base route', () => {
    const baseRoute = '/test';
    baseRouteService.setBaseRoute(baseRoute);
    expect(baseRouteService.getBaseRoute()).toBe(baseRoute);
  });
});

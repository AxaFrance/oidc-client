let baseRoute: string;

export const setBaseRoute = (baseRouteToSet: string) => {
  baseRoute = baseRouteToSet;
};

export const getBaseRoute = () => baseRoute || '';

import { getResourceConfiguration, getResourceContextName } from './resource';
import type { Database, OidcConfig } from './types';

export const getTokenContextEntries = (database: Database): Array<[string, OidcConfig]> =>
  Object.entries(database).flatMap(([key, configuration]): Array<[string, OidcConfig]> => [
    [key, configuration],
    ...Object.entries(configuration.resourceEntries ?? {}),
  ]);

export const getTokenContexts = (database: Database): OidcConfig[] =>
  getTokenContextEntries(database).map(([, configuration]) => configuration);

export const getOrCreateResourceContext = (
  configuration: OidcConfig,
  resource: string,
): OidcConfig => {
  getResourceConfiguration(configuration.oidcConfiguration?.resources, resource);
  configuration.resourceEntries ??= {};
  const name = getResourceContextName(configuration.configurationName, resource);
  configuration.resourceEntries[name] ??= {
    ...configuration,
    configurationName: name,
    resource,
    parentConfiguration: configuration,
    resourceEntries: undefined,
    authorizationScope: undefined,
    requestedScope: undefined,
    demonstratingProofOfPossessionApiNonce: null,
    refreshGrant: undefined,
    tokens: null,
    state: null,
    codeVerifier: null,
    nonce: null,
    status: null,
    hideAccessToken: true,
    generation: 0,
  };
  return configuration.resourceEntries[name];
};

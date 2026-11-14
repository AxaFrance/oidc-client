import { OidcError, OidcErrorCode } from './oidcError';
import {
  getResourceConfiguration,
  getResourceContextName,
  validateResourceIdentifier,
} from './protocol';
import { getParseQueryStringFromLocation } from './route-utils';
import type { OAuthParameters, OidcConfiguration } from './types';

export const RESOURCE_LOGIN_PARAMETER = '_oidc_resource';
const transactionPrefix = 'oidc.resource_transaction.';

export const resourceContextName = (name: string, resource?: string): string =>
  resource === undefined ? name : getResourceContextName(name, resource);

export const applyResourceParameters = (
  parameters: OAuthParameters,
  configuration: OidcConfiguration,
  resource?: string,
): OAuthParameters => {
  const selected = resource ?? configuration.resource;
  if (selected === undefined) return parameters;
  const resources = typeof selected === 'string' ? [selected] : selected;
  if (resources.length === 0) {
    throw new OidcError(OidcErrorCode.INVALID_RESOURCE, 'At least one resource is required.', {
      phase: 'login',
      retryable: false,
    });
  }
  for (const value of resources) {
    validateResourceIdentifier(value);
    if (configuration.resources) getResourceConfiguration(configuration.resources, value);
  }
  const supplied = parameters.resource;
  if (
    supplied !== undefined &&
    JSON.stringify(typeof supplied === 'string' ? [supplied] : supplied) !==
      JSON.stringify(resources)
  ) {
    throw new OidcError(
      OidcErrorCode.INVALID_RESOURCE,
      'Resource extras conflict with the selected resource.',
      {
        phase: 'login',
        retryable: false,
      },
    );
  }
  return { ...parameters, resource: selected };
};

export const rememberResourceTransaction = (
  configurationName: string,
  state: string,
  resource: string,
): void => {
  sessionStorage.setItem(`${transactionPrefix}${configurationName}.${state}`, resource);
};

export const getCallbackResource = (
  configurationName: string,
  href: string,
): string | undefined => {
  const { state } = getParseQueryStringFromLocation(href);
  return state
    ? (sessionStorage.getItem(`${transactionPrefix}${configurationName}.${state}`) ?? undefined)
    : undefined;
};

export const clearResourceTransaction = (configurationName: string, href: string): void => {
  const { state } = getParseQueryStringFromLocation(href);
  if (state) sessionStorage.removeItem(`${transactionPrefix}${configurationName}.${state}`);
};

export const cancelResourceTransactions = (configurationName: string, resource?: string): void => {
  const prefix = `${transactionPrefix}${configurationName}.`;
  for (const key of Object.keys(sessionStorage)) {
    if (
      key.startsWith(prefix) &&
      (resource === undefined || sessionStorage.getItem(key) === resource)
    ) {
      sessionStorage.removeItem(key);
    }
  }
};

import { type Fetch, isOidcError, OidcClient } from '@axa-fr/oidc-client';

import { inventoryResource, ordersResource, unsupportedResource } from './provider';

export interface ApiResult {
  api: string;
  resource: string;
  subject: string;
  clientId: string;
  tokenId: string;
  scopes: string[];
  tokenType: string;
}

/** Retries one API nonce challenge explicitly; the OIDC library does not retry HTTP API calls. */
export async function callApiAsync(fetch: Fetch, url: string): Promise<ApiResult> {
  let response = await fetch(url);
  if (response.status === 401 && response.headers.has('DPoP-Nonce')) response = await fetch(url);
  if (!response.ok) {
    const body: unknown = response.headers.get('content-type')?.includes('application/json')
      ? await response.json()
      : null;
    const detail =
      body &&
      typeof body === 'object' &&
      'error_description' in body &&
      typeof body.error_description === 'string'
        ? ` ${body.error_description}`
        : '';
    throw new Error(`API rejected the request (HTTP ${response.status}).${detail}`);
  }
  return response.json();
}

/** Runs the same resource operations for both browser demos without exposing token values. */
export async function runResourceActionAsync(
  client: OidcClient,
  action: 'call' | 'renew' | 'clear' | 'wrong-target' | 'provider-error',
  fetchers?: { orders: Fetch; inventory: Fetch },
): Promise<{ message: string; orders?: ApiResult; inventory?: ApiResult }> {
  const orders = fetchers?.orders ?? client.fetchForResource(ordersResource);
  const inventory = fetchers?.inventory ?? client.fetchForResource(inventoryResource);
  switch (action) {
    case 'call':
      return {
        message: 'Both APIs accepted their isolated resource tokens.',
        orders: await callApiAsync(orders, ordersResource + 'api/orders?limit=2'),
        inventory: await callApiAsync(inventory, inventoryResource + 'api/inventory'),
      };
    case 'renew':
      await client.getAccessTokenForResourceAsync(ordersResource, { forceRenew: true });
      return {
        message: 'Orders renewed; the Inventory entry was preserved.',
        orders: await callApiAsync(orders, ordersResource + 'api/orders?limit=2'),
      };
    case 'clear':
      await client.clearResourceTokensAsync(ordersResource);
      return { message: 'Orders cleared locally; Inventory remains available.' };
    case 'wrong-target':
      await orders(inventoryResource + 'api/inventory');
      throw new Error('The wrong-resource destination was unexpectedly accepted.');
    case 'provider-error':
      await client.getAccessTokenForResourceAsync(unsupportedResource);
      throw new Error('The unsupported provider resource was unexpectedly accepted.');
  }
}

/** Formats actionable errors without serializing tokens or exception causes. */
export function describeDemoError(error: unknown): string {
  if (isOidcError(error))
    return `${error.code}${error.oauthError ? ` (${error.oauthError})` : ''}: ${error.message}`;
  if (error instanceof Error) return error.message;
  return 'Unexpected demo failure; inspect the browser console.';
}

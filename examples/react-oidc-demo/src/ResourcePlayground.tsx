import { OidcClient } from '@axa-fr/oidc-client';
import { OidcSecure, useOidcFetchForResource } from '@axa-fr/react-oidc';
import { type ReactElement, useState } from 'react';

import { inventoryResource, ordersResource } from '../../shared/provider';
import {
  type ApiResult,
  describeDemoError,
  runResourceActionAsync,
} from '../../shared/resourcePlayground';
import { demoEnvironment } from './configurations';

function ResourceControls({ configurationName }: { configurationName: string }): ReactElement {
  const { fetch: orders } = useOidcFetchForResource(ordersResource, { configurationName });
  const { fetch: inventory } = useOidcFetchForResource(inventoryResource, { configurationName });
  const [message, setMessage] = useState('Ready to acquire separate API tokens.');
  const [apis, setApis] = useState<{ orders?: ApiResult; inventory?: ApiResult }>({});
  const [isBusy, setIsBusy] = useState(false);
  const run = async (action: Parameters<typeof runResourceActionAsync>[1]): Promise<void> => {
    setIsBusy(true);
    try {
      const result = await runResourceActionAsync(
        OidcClient.getOrThrow(configurationName),
        action,
        {
          orders,
          inventory,
        },
      );
      setApis(previous => ({
        orders: action === 'clear' ? undefined : (result.orders ?? previous.orders),
        inventory: result.inventory ?? previous.inventory,
      }));
      setMessage(result.message);
    } catch (error) {
      console.error('Resource demo failed:', describeDemoError(error));
      setMessage(describeDemoError(error));
    } finally {
      setIsBusy(false);
    }
  };
  return (
    <section className="container mt-3">
      <h1>RFC 8707 resource playground</h1>
      <p>
        Two API origins, isolated token entries, shared refresh rotation, and explicit destination
        checks.
      </p>
      <p>
        <button className="btn btn-primary me-2" disabled={isBusy} onClick={() => run('call')}>
          Call both APIs
        </button>
        <button className="btn btn-primary me-2" disabled={isBusy} onClick={() => run('renew')}>
          Renew Orders
        </button>
        <button className="btn btn-secondary me-2" disabled={isBusy} onClick={() => run('clear')}>
          Clear Orders
        </button>
        <button
          className="btn btn-warning me-2"
          disabled={isBusy}
          onClick={() => run('wrong-target')}
        >
          Test wrong destination
        </button>
        <button className="btn btn-warning" disabled={isBusy} onClick={() => run('provider-error')}>
          Test provider error
        </button>
      </p>
      <p role="status" data-testid="resource-status">
        {message}
      </p>
      <div className="row">
        {(['orders', 'inventory'] as const).map(api => (
          <section className="col-md-6" key={api}>
            <h2>{api === 'orders' ? 'Orders API' : 'Inventory API'}</h2>
            <pre data-testid={`${api}-result`}>
              {apis[api] ? JSON.stringify(apis[api], null, 2) : 'No acquired resource token.'}
            </pre>
          </section>
        ))}
      </div>
      <p>
        No access or refresh token values are displayed. API nonce challenges are retried once by
        this demo.
      </p>
    </section>
  );
}

/** Demonstrates resource hooks only against the configured local fixture. */
export function ResourcePlayground({
  configurationName = 'default',
}: {
  configurationName?: string;
}): ReactElement {
  if (demoEnvironment.provider !== 'openiddict') {
    return (
      <section className="container">
        <h1>RFC 8707 resource playground</h1>
        <p>
          Run the local OpenIddict server to exercise this page. The online Duende configuration is
          unchanged.
        </p>
      </section>
    );
  }
  return (
    <OidcSecure configurationName={configurationName}>
      <ResourceControls configurationName={configurationName} />
    </OidcSecure>
  );
}

import { afterEach, describe, expect, it, vi } from 'vitest';

import * as initWorker from './initWorker';
import { OidcClient } from './oidcClient';
import { ServiceWorkerMessageType } from './protocol';

const buildClient = (overrides: Partial<{ configurationName: string }> = {}) => {
  const oidc = {
    configuration: { client_id: 'demo-client' },
    configurationName: overrides.configurationName ?? 'demo',
  };
  return new OidcClient(oidc as never);
};

describe('OidcClient.signalServiceWorker', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('forwards the typed message to signalServiceWorkerAsync with the OIDC config', async () => {
    const expected = { configurationName: 'demo', state: 'restored-state' };
    const spy = vi
      .spyOn(initWorker, 'signalServiceWorkerAsync')
      .mockResolvedValue(expected as never);

    const client = buildClient();
    const response = await client.signalServiceWorker<{ state: string }>({
      type: ServiceWorkerMessageType.GET_STATE,
      configurationName: 'demo',
      data: null,
    });

    expect(response).toEqual(expected);
    expect(spy).toHaveBeenCalledOnce();
    expect(spy).toHaveBeenCalledWith(
      { client_id: 'demo-client' },
      'demo',
      expect.objectContaining({
        type: 'getState',
        data: null,
      }),
      undefined,
    );
  });

  it('propagates a custom timeout option', async () => {
    const spy = vi.spyOn(initWorker, 'signalServiceWorkerAsync').mockResolvedValue({} as never);

    const client = buildClient();
    await client.signalServiceWorker(
      { type: ServiceWorkerMessageType.CLEAR, configurationName: 'demo', data: { status: null } },
      { timeoutMs: 9000 },
    );

    expect(spy).toHaveBeenCalledWith(
      expect.anything(),
      'demo',
      expect.objectContaining({ type: 'clear' }),
      { timeoutMs: 9000 },
    );
  });

  it('rejects when the underlying helper rejects', async () => {
    const error = new Error('no SW');
    vi.spyOn(initWorker, 'signalServiceWorkerAsync').mockRejectedValue(error);

    const client = buildClient();

    await expect(
      client.signalServiceWorker({
        type: ServiceWorkerMessageType.GET_STATE,
        configurationName: 'demo',
        data: null,
      }),
    ).rejects.toBe(error);
  });
});

// Tests covering the AbortError handling added to initWorkerAsync.
// See https://github.com/AxaFrance/oidc-client/issues/1675
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { initWorkerAsync, registrationCache } from './initWorker';
import { OidcConfiguration } from './types';

const SERVICE_WORKER_RELATIVE_URL = '/OidcServiceWorker.js';

const buildConfiguration = (overrides: Partial<OidcConfiguration> = {}): OidcConfiguration => {
  return {
    client_id: 'test-client',
    redirect_uri: 'http://localhost/callback',
    scope: 'openid',
    authority: 'http://authority',
    service_worker_relative_url: SERVICE_WORKER_RELATIVE_URL,
    service_worker_activate: () => true,
    ...overrides,
  } as OidcConfiguration;
};

const createAbortError = (): DOMException => {
  // DOMException is available in the test environment (jsdom / happy-dom).
  return new DOMException('The operation was aborted.', 'AbortError');
};

describe('initWorkerAsync AbortError handling', () => {
  let originalNavigator: PropertyDescriptor | undefined;
  let originalWindow: PropertyDescriptor | undefined;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    registrationCache.clear();
    originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
    originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {},
    });
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {
        serviceWorker: {
          register: vi.fn(),
          ready: Promise.resolve({} as ServiceWorkerRegistration),
          controller: null,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        },
      },
    });
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    registrationCache.clear();
    if (originalNavigator) {
      Object.defineProperty(globalThis, 'navigator', originalNavigator);
    } else {
      delete (globalThis as { navigator?: unknown }).navigator;
    }
    if (originalWindow) {
      Object.defineProperty(globalThis, 'window', originalWindow);
    } else {
      delete (globalThis as { window?: unknown }).window;
    }
    vi.restoreAllMocks();
  });

  it('returns null when a custom service_worker_register rejects with an AbortError', async () => {
    const abortError = createAbortError();
    const service_worker_register = vi.fn(() => Promise.reject(abortError));

    const result = await initWorkerAsync(
      buildConfiguration({ service_worker_register }),
      'default',
    );

    expect(result).toBeNull();
    expect(service_worker_register).toHaveBeenCalledOnce();
    expect(registrationCache.has(SERVICE_WORKER_RELATIVE_URL)).toBe(false);
    expect(warnSpy).toHaveBeenCalled();
  });

  it('returns null when navigator.serviceWorker.register rejects with an AbortError', async () => {
    const abortError = createAbortError();
    (navigator.serviceWorker.register as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      () => Promise.reject(abortError),
    );

    const result = await initWorkerAsync(buildConfiguration(), 'default');

    expect(result).toBeNull();
    // The cache entry for the SW URL should have been cleared so a later retry is possible.
    expect(Array.from(registrationCache.keys())).toHaveLength(0);
    expect(warnSpy).toHaveBeenCalled();
  });

  it('also treats plain { name: "AbortError" } rejections as aborts', async () => {
    const plainAbort = { name: 'AbortError', message: 'aborted' };
    const service_worker_register = vi.fn(() => Promise.reject(plainAbort));

    const result = await initWorkerAsync(
      buildConfiguration({ service_worker_register }),
      'default',
    );

    expect(result).toBeNull();
    expect(registrationCache.has(SERVICE_WORKER_RELATIVE_URL)).toBe(false);
  });

  it('allows a subsequent call to retry registration after an AbortError', async () => {
    const abortError = createAbortError();
    const service_worker_register = vi
      .fn()
      .mockImplementationOnce(() => Promise.reject(abortError))
      // Returning a never-resolving promise on the retry is fine for the assertion below:
      // we only need to confirm that the function was called a second time after the
      // failed cache entry was cleared.
      .mockImplementationOnce(() => new Promise<ServiceWorkerRegistration>(() => {}));

    const configuration = buildConfiguration({ service_worker_register });

    const firstResult = await initWorkerAsync(configuration, 'default');
    expect(firstResult).toBeNull();
    expect(service_worker_register).toHaveBeenCalledTimes(1);

    // Kick off the second call (don't await – the mocked promise never resolves).
    void initWorkerAsync(configuration, 'default');
    // Allow the microtask queue to drain so the registration call is observed.
    await Promise.resolve();

    expect(service_worker_register).toHaveBeenCalledTimes(2);
  });

  it('propagates non-AbortError rejections to the caller', async () => {
    const genericError = new Error('boom');
    const service_worker_register = vi.fn(() => Promise.reject(genericError));

    await expect(
      initWorkerAsync(buildConfiguration({ service_worker_register }), 'default'),
    ).rejects.toBe(genericError);

    // Non-AbortError rejections keep the cache entry in place (existing behavior).
    expect(registrationCache.has(SERVICE_WORKER_RELATIVE_URL)).toBe(true);
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { initWorkerAsync, registrationCache } from './initWorker';
import type { OidcConfiguration } from './types';

const configuration = {
  service_worker_relative_url: '/OidcServiceWorker.js',
  service_worker_activate: () => true,
} as OidcConfiguration;

const createRegistration = () => ({
  update: vi.fn().mockResolvedValue(undefined),
  addEventListener: vi.fn(),
  installing: null as ServiceWorker | null,
  waiting: null,
});

describe('service worker update checks', () => {
  let registration: ReturnType<typeof createRegistration>;
  let register: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    registrationCache.clear();
    registration = createRegistration();
    register = vi.fn().mockResolvedValue(registration);
    vi.stubGlobal('window', {});
    vi.stubGlobal('navigator', {
      serviceWorker: {
        register,
        controller: {},
        ready: Promise.resolve(registration),
        addEventListener: vi.fn(),
      },
    });
    vi.spyOn(Date, 'now').mockReturnValue(0);
  });

  afterEach(() => {
    registrationCache.clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('bounds checks and listeners across repeated token synchronization and configurations', async () => {
    for (let tick = 0; tick < 30; tick++) {
      await initWorkerAsync(configuration, tick % 2 ? 'default' : 'another');
      vi.mocked(Date.now).mockReturnValue((tick + 1) * 1000);
    }
    expect(register).toHaveBeenCalledOnce();
    expect(registration.update).toHaveBeenCalledOnce();
    expect(registration.addEventListener).toHaveBeenCalledOnce();
    expect(registration.addEventListener).toHaveBeenCalledWith('updatefound', expect.any(Function));
  });

  it('bounds concurrent initialization while an update is pending', async () => {
    registration.update.mockReturnValue(new Promise(() => {}));
    const workers = await Promise.all(
      Array.from({ length: 10 }, () => initWorkerAsync(configuration, 'default')),
    );
    expect(workers.every(Boolean)).toBe(true);
    expect(registration.update).toHaveBeenCalledOnce();
  });

  it('checks again after an hour', async () => {
    await initWorkerAsync(configuration, 'default');
    vi.mocked(Date.now).mockReturnValue(60 * 60 * 1000 - 1);
    await initWorkerAsync(configuration, 'default');
    expect(registration.update).toHaveBeenCalledOnce();
    vi.mocked(Date.now).mockReturnValue(60 * 60 * 1000);
    await initWorkerAsync(configuration, 'default');
    expect(registration.update).toHaveBeenCalledTimes(2);
  });

  it('bounds failed checks and retries after the interval without blocking initialization', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    registration.update.mockRejectedValue(new Error('offline'));
    await expect(initWorkerAsync(configuration, 'default')).resolves.toBeTruthy();
    await initWorkerAsync(configuration, 'default');
    expect(registration.update).toHaveBeenCalledOnce();
    vi.mocked(Date.now).mockReturnValue(60 * 60 * 1000);
    await initWorkerAsync(configuration, 'default');
    expect(registration.update).toHaveBeenCalledTimes(2);
  });

  it('checks and observes a replacement registration immediately', async () => {
    await initWorkerAsync(configuration, 'default');
    const replacement = createRegistration();
    registrationCache.clear();
    register.mockResolvedValue(replacement);
    await initWorkerAsync(configuration, 'default');
    expect(replacement.update).toHaveBeenCalledOnce();
    expect(replacement.addEventListener).toHaveBeenCalledOnce();
  });

  it('still claims a callback page without a controller', async () => {
    const values = new Map<string, string>();
    vi.stubGlobal('sessionStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    });
    const postMessage = vi.fn((_data, ports) => {
      Object.defineProperty(navigator.serviceWorker, 'controller', {
        value: {},
        configurable: true,
      });
      ports[0].postMessage({});
    });
    Object.assign(registration, { active: { postMessage } });
    Object.defineProperty(navigator.serviceWorker, 'controller', {
      value: null,
      configurable: true,
    });

    await expect(initWorkerAsync(configuration, 'default')).resolves.toBeTruthy();

    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'claim' }),
      expect.any(Array),
    );
    expect(registration.update).toHaveBeenCalledOnce();
  });

  it('observes installing workers once and still discovers replacements during the interval', async () => {
    const installing = { addEventListener: vi.fn() };
    registration.installing = installing as unknown as ServiceWorker;
    await initWorkerAsync(configuration, 'default');
    await initWorkerAsync(configuration, 'default');
    expect(installing.addEventListener).toHaveBeenCalledOnce();
    const replacement = { addEventListener: vi.fn() };
    registration.installing = replacement as unknown as ServiceWorker;
    const onUpdateFound = registration.addEventListener.mock.calls[0][1];
    onUpdateFound();
    expect(replacement.addEventListener).toHaveBeenCalledWith('statechange', expect.any(Function));
    expect(registration.update).toHaveBeenCalledOnce();
  });
});

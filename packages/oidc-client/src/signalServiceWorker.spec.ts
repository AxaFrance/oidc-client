import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as initWorkerModule from './initWorker';
import { OidcClient } from './oidcClient';

vi.mock('./initWorker', () => ({
  initWorkerAsync: vi.fn(),
  getTabId: vi.fn(() => 'mock-tab-id'),
}));

vi.mock('./oidc.js', () => {
  const oidcInstances: Record<string, any> = {};
  class MockOidc {
    configuration: any;
    configurationName: string;
    tokens = null;
    events: any[] = [];
    userInfo = null;

    constructor(configuration: any, configurationName: string) {
      this.configuration = configuration;
      this.configurationName = configurationName;
      oidcInstances[configurationName] = this;
    }

    static getOrCreate = (_getFetch: any, _location: any) => (configuration: any, name: string) =>
      new MockOidc(configuration, name);

    static get(name = 'default') {
      if (!oidcInstances[name]) {
        throw new Error(`OIDC library does seem initialized.`);
      }
      return oidcInstances[name];
    }

    static eventNames = {};

    subscribeEvents = vi.fn(() => 'sub-id');
    removeEventSubscription = vi.fn();
    publishEvent = vi.fn();
    tryKeepExistingSessionAsync = vi.fn();
    loginAsync = vi.fn();
    logoutAsync = vi.fn();
    silentLoginCallbackAsync = vi.fn();
    renewTokensAsync = vi.fn();
    loginCallbackWithAutoTokensRenewAsync = vi.fn();
    generateDemonstrationOfProofOfPossessionAsync = vi.fn();
    userInfoAsync = vi.fn();
  }

  return { Oidc: MockOidc, LoginCallback: {}, getFetchDefault: () => fetch };
});

describe('OidcClient.signalServiceWorker', () => {
  let client: OidcClient;
  const mockSignalServiceWorker = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Create an OidcClient via getOrCreate so the mock Oidc is registered
    const factory = OidcClient.getOrCreate(() => fetch, {
      getCurrentHref: () => '',
      getOrigin: () => '',
    } as any);
    client = factory(
      {
        client_id: 'test',
        redirect_uri: 'http://localhost/callback',
        scope: 'openid',
        authority: 'https://auth.example.com',
        service_worker_relative_url: '/sw.js',
        service_worker_activate: () => true,
      },
      'test-config',
    );
  });

  it('should return null when service worker is not available', async () => {
    vi.mocked(initWorkerModule.initWorkerAsync).mockResolvedValue(null);

    const result = await client.signalServiceWorker('clear', { status: 'logout' });
    expect(result).toBeNull();
  });

  it('should delegate to signalServiceWorker on the worker', async () => {
    mockSignalServiceWorker.mockResolvedValue({ configurationName: 'test-config' });

    vi.mocked(initWorkerModule.initWorkerAsync).mockResolvedValue({
      clearAsync: vi.fn(),
      initAsync: vi.fn(),
      startKeepAliveServiceWorker: vi.fn(),
      setSessionStateAsync: vi.fn(),
      getSessionStateAsync: vi.fn(),
      setNonceAsync: vi.fn(),
      getNonceAsync: vi.fn(),
      setLoginParams: vi.fn(),
      getLoginParams: vi.fn(),
      getStateAsync: vi.fn(),
      setStateAsync: vi.fn(),
      getCodeVerifierAsync: vi.fn(),
      setCodeVerifierAsync: vi.fn(),
      setDemonstratingProofOfPossessionNonce: vi.fn(),
      getDemonstratingProofOfPossessionNonce: vi.fn(),
      setDemonstratingProofOfPossessionJwkAsync: vi.fn(),
      getDemonstratingProofOfPossessionJwkAsync: vi.fn(),
      signalServiceWorker: mockSignalServiceWorker,
    });

    const result = await client.signalServiceWorker('clear', { status: 'logout' });

    expect(mockSignalServiceWorker).toHaveBeenCalledWith('clear', { status: 'logout' });
    expect(result).toEqual({ configurationName: 'test-config' });
  });

  it('should pass empty data when none is provided', async () => {
    mockSignalServiceWorker.mockResolvedValue({ configurationName: 'test-config' });

    vi.mocked(initWorkerModule.initWorkerAsync).mockResolvedValue({
      clearAsync: vi.fn(),
      initAsync: vi.fn(),
      startKeepAliveServiceWorker: vi.fn(),
      setSessionStateAsync: vi.fn(),
      getSessionStateAsync: vi.fn(),
      setNonceAsync: vi.fn(),
      getNonceAsync: vi.fn(),
      setLoginParams: vi.fn(),
      getLoginParams: vi.fn(),
      getStateAsync: vi.fn(),
      setStateAsync: vi.fn(),
      getCodeVerifierAsync: vi.fn(),
      setCodeVerifierAsync: vi.fn(),
      setDemonstratingProofOfPossessionNonce: vi.fn(),
      getDemonstratingProofOfPossessionNonce: vi.fn(),
      setDemonstratingProofOfPossessionJwkAsync: vi.fn(),
      getDemonstratingProofOfPossessionJwkAsync: vi.fn(),
      signalServiceWorker: mockSignalServiceWorker,
    });

    await client.signalServiceWorker('getState');

    expect(mockSignalServiceWorker).toHaveBeenCalledWith('getState', {});
  });
});

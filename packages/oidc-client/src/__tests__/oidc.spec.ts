import { afterEach, describe, expect, it, Mock, vi } from 'vitest';

import * as initWorker from '../initWorker';
import { Oidc, OidcAuthorizationServiceConfiguration } from '../oidc';
import { AuthorityConfiguration, OidcConfiguration, TokenAutomaticRenewMode } from '../types';

vi.mock('../initWorker');

describe.only('OIDC service', () => {
  const authorityConfigurationMock: AuthorityConfiguration = {
    issuer: 'test_issuer',
    authorization_endpoint: 'test_authorization_endpoint',
    token_endpoint: 'test_token_endpoint',
    revocation_endpoint: 'test_revocation_endpoint',
    end_session_endpoint: 'test_end_session_endpoint', // optional
    userinfo_endpoint: 'test_userinfo_endpoint', // optional
    check_session_iframe: 'test_check_session_iframe', // optional
  };

  const oidcConfigMock: OidcConfiguration = {
    client_id: 'test_client_id',
    redirect_uri: 'test_redirect_uri',
    silent_redirect_uri: 'test_silent_redirect_uri', // optional
    silent_login_uri: 'test_silent_login_uri', // optional
    silent_login_timeout: 1000, // optional
    scope: 'openid tenant_id email profile offline_access',
    authority: 'test_authority',
    authority_time_cache_wellknowurl_in_second: 1000, // optional
    authority_timeout_wellknowurl_in_millisecond: 1000, // optional
    authority_configuration: undefined, // optional
    refresh_time_before_tokens_expiration_in_second: 1000, // optional
    token_automatic_renew_mode: TokenAutomaticRenewMode.AutomaticBeforeTokenExpiration, // optional
    token_request_timeout: 1000, // optional
    service_worker_relative_url: 'test_service_worker_relative_url', // optional
    service_worker_register: vi.fn().mockResolvedValue({} as ServiceWorkerRegistration), // optional
    service_worker_keep_alive_path: 'test_service_worker_keep_alive_path', // optional
    service_worker_activate: () => true, // optional
    service_worker_only: true, // optional
    service_worker_convert_all_requests_to_cors: true, // optional
    service_worker_update_require_callback: vi.fn().mockResolvedValue(void 0), // optional
    extras: {}, // optional
    token_request_extras: {}, // optional
    // storage?: Storage;
    monitor_session: true, // optional
    token_renew_mode: 'test_token_renew_mode', // optional
    logout_tokens_to_invalidate: ['access_token', 'refresh_token'], // optional
    // demonstrating_proof_of_possession: false, // optional
    // demonstrating_proof_of_possession_configuration?: DemonstratingProofOfPossessionConfiguration;
    preload_user_info: false, // optional
  };

  const oidcConfigMockWithAuthorityConfiguration: OidcConfiguration = {
    ...oidcConfigMock,
    authority_configuration: authorityConfigurationMock,
  };

  const fetchMock = vi.fn();

  const createStorageMock = (): Storage => {
    const storage = {
      getItem(key: string) {
        const value = this[key];
        return typeof value === 'undefined' ? null : value;
      },
      setItem(key: string, value: unknown) {
        this[key] = value;
        this.length = Object.keys(this).length - 6; // kind'a ignore mock methods and props
      },
      removeItem: function (key: string) {
        return delete this[key];
      },
      length: 0,
      key: () => {
        return null;
      },
      clear() {
        window.localStorage = window.sessionStorage = createStorageMock();
      },
    };

    return storage;
  };

  window.localStorage = window.sessionStorage = createStorageMock();

  afterEach(() => {
    vi.clearAllMocks();

    window.localStorage.clear();
  });

  describe('init flow', () => {
    it('should create new oidc instance', async () => {
      const sut = new Oidc(
        oidcConfigMockWithAuthorityConfiguration,
        'test_oidc_client_id',
        () => fetchMock,
      );

      expect(sut).toBeDefined();
    });

    it('should init oidc instance with predefined authority_configuration', async () => {
      const sut = new Oidc(
        oidcConfigMockWithAuthorityConfiguration,
        'test_oidc_client_id',
        () => fetchMock,
      );

      expect(sut.initPromise).toBeDefined();

      const result = await sut.initPromise;

      expect(sut.initPromise).toBeNull();

      expect(result).toEqual(new OidcAuthorizationServiceConfiguration(authorityConfigurationMock));
    });

    it('should init oidc instance with fetched authority_configuration and enabled service worker', async () => {
      fetchMock.mockResolvedValue({
        status: 200,
        json: vi.fn().mockResolvedValue(authorityConfigurationMock),
      });

      // we don't care about the return value of initWorker.initWorkerAsync
      // as it is used only as boolean flag to set storage to local storage or not
      (initWorker.initWorkerAsync as Mock<any, any>).mockResolvedValue({});

      const sut = new Oidc(oidcConfigMock, 'test_oidc_client_id', () => fetchMock);

      expect(sut.initPromise).toBeDefined();

      const result = await sut.initPromise;

      expect(result).toEqual(new OidcAuthorizationServiceConfiguration(authorityConfigurationMock));

      expect(sut.initPromise).toBeNull();

      // oh this side effects... can we avoid them and make it better?
      const localCache = JSON.parse(
        window.localStorage.getItem(`oidc.server:${oidcConfigMock.authority}`),
      ).result;

      expect(localCache).toEqual(authorityConfigurationMock);
      expect(fetchMock).toHaveBeenCalledOnce();
      expect(fetchMock).toHaveBeenCalledWith(
        'test_authority/.well-known/openid-configuration',
        expect.anything(),
      );
    });

    // TODO: cache.ts has second level side-effect, so this test is impacted by previous one
    // as it is not possible to refresh/clear that cache at current moment of time
    it.skip('should take authority_configuration from local storage on subsequent initAsync calls', async () => {
      fetchMock.mockResolvedValue({
        status: 200,
        json: vi.fn().mockResolvedValue(authorityConfigurationMock),
      });

      // we don't care about the return value of initWorker.initWorkerAsync
      // as it is used only as boolean flag to set storage to local storage or not
      (initWorker.initWorkerAsync as Mock<any, any>).mockResolvedValue({});

      const sut = new Oidc(oidcConfigMock, 'test_oidc_client_id', () => fetchMock);

      await sut.initPromise;

      // internal cache.ts makes some wildest magic,
      // so any subsequential call could obtain the authority_configuration from internal cache or null
      // no other options. Sounds like a bug. What's a point of localStorage/sessionStorage cache then?
      expect(fetchMock).toHaveBeenCalledOnce();

      // const secondCallResult = await sut.initAsync(oidcConfigMock.authority, null);

      // expect(fetchMock).toHaveBeenCalledOnce();
      // expect(secondCallResult).toEqual(new OidcAuthorizationServiceConfiguration(authorityConfigurationMock));
    });
  });
});

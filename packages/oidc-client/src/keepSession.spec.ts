import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { eventNames } from './events';
import * as sessions from './initSession';
import * as workers from './initWorker';
import Oidc from './oidc';
import { type Tokens } from './parseTokens';
import * as renewal from './renewTokens';
import timer from './timer';

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  workers.registrationCache.clear();
});

describe.each(['service worker', 'browser storage'])('session restoration with %s', mode => {
  const tokens: Tokens = {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    idToken: 'id-token',
    accessTokenPayload: null,
    idTokenPayload: null,
    expiresAt: 2000000000,
    issuedAt: 1900000000,
  };
  const server = { checkSessionIframe: 'https://issuer.example.com/check-session' };
  const loginParams = { extras: { audience: 'api' }, scope: 'openid profile' };

  const createOidc = (storage: Storage, loginStateStorage: Storage) => ({
    configuration: {
      authority: 'https://issuer.example.com',
      client_id: 'client',
      redirect_uri: 'https://app.example.com/callback',
      scope: 'openid',
      storage,
      login_state_storage: loginStateStorage,
      preload_user_info: true,
      service_worker_relative_url: mode === 'service worker' ? '/OidcServiceWorker.js' : null,
      service_worker_activate: () => true,
    },
    configurationName: 'default',
    tokens: null as Tokens | null,
    userInfo: { sub: 'previous-user' },
    timeoutId: null as ReturnType<typeof timer.setTimeout> | null,
    checkSessionIFrame: { stop: vi.fn() },
    tryKeepExistingSessionPromise: null,
    initAsync: vi.fn().mockResolvedValue(server),
    startCheckSessionAsync: vi.fn().mockResolvedValue(undefined),
    userInfoAsync: vi.fn().mockResolvedValue({ sub: 'user' }),
    publishEvent: vi.fn(),
  });

  let oidc: ReturnType<typeof createOidc>;
  let loginStateStorage: Storage;
  let getSessionState: ReturnType<typeof vi.fn<() => Promise<string>>>;
  let clearWorker: ReturnType<typeof vi.fn<() => Promise<void>>>;
  let restore: () => Promise<boolean>;

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.spyOn(timer, 'setTimeout').mockImplementation(setTimeout);
    vi.spyOn(timer, 'clearTimeout').mockImplementation(clearTimeout);
    vi.spyOn(renewal, 'autoRenewTokens');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    workers.registrationCache.clear();

    const storage = {} as Storage;
    loginStateStorage = {} as Storage;
    oidc = createOidc(storage, loginStateStorage);
    restore = () => Oidc.prototype.tryKeepExistingSessionAsync.call(oidc as unknown as Oidc);
    getSessionState = vi.fn().mockResolvedValue('session-state');
    clearWorker = vi.fn().mockResolvedValue(undefined);

    const session = sessions.initSession('default', storage, loginStateStorage);
    session.setTokens({ ...tokens });

    if (mode === 'service worker') {
      // Keep the real worker login-metadata reader; only worker messaging is mocked.
      const registration = {
        addEventListener: vi.fn(),
        update: vi.fn().mockResolvedValue(undefined),
      };
      vi.stubGlobal('window', {});
      vi.stubGlobal('localStorage', loginStateStorage);
      vi.stubGlobal('navigator', {
        serviceWorker: {
          controller: {},
          register: vi.fn().mockResolvedValue(registration),
          ready: Promise.resolve(registration),
          addEventListener: vi.fn(),
        },
      });
      const worker = await workers.initWorkerAsync(oidc.configuration, 'default');
      vi.spyOn(workers, 'initWorkerAsync').mockResolvedValue({
        ...worker,
        initAsync: vi.fn().mockResolvedValue({ tokens: { ...tokens } }),
        startKeepAliveServiceWorker: vi.fn(),
        getSessionStateAsync: getSessionState,
        clearAsync: clearWorker,
      });
    } else {
      vi.spyOn(workers, 'initWorkerAsync').mockResolvedValue(null);
      vi.spyOn(sessions, 'initSession').mockReturnValue({
        ...session,
        getSessionStateAsync: getSessionState,
      });
    }
  });

  it.each([undefined, '', 'null', 'undefined', '{invalid-json'])(
    'restores tokens when persisted login metadata is %s',
    async metadata => {
      if (metadata !== undefined) {
        loginStateStorage['oidc.login.default'] = metadata;
      }

      await expect(restore()).resolves.toBe(true);

      expect(oidc.tokens).toEqual(tokens);
      expect(renewal.autoRenewTokens).toHaveBeenCalledWith(
        oidc,
        tokens.expiresAt,
        undefined,
        undefined,
      );
      expect(vi.getTimerCount()).toBe(1);
      expect(oidc.startCheckSessionAsync).toHaveBeenCalledWith(
        server.checkSessionIframe,
        'client',
        'session-state',
      );
      expect(oidc.userInfoAsync).toHaveBeenCalledOnce();
      expect(oidc.publishEvent).toHaveBeenCalledWith(
        eventNames.tryKeepExistingSessionAsync_end,
        expect.objectContaining({ success: true }),
      );
      expect(clearWorker).not.toHaveBeenCalled();
    },
  );

  it('preserves stored extras and scope when starting renewal', async () => {
    loginStateStorage['oidc.login.default'] = JSON.stringify(loginParams);

    await expect(restore()).resolves.toBe(true);

    expect(renewal.autoRenewTokens).toHaveBeenCalledWith(
      oidc,
      tokens.expiresAt,
      loginParams.extras,
      loginParams.scope,
    );
    expect(clearWorker).not.toHaveBeenCalled();
  });

  it.each(['session state', 'session monitoring', 'user info'])(
    'clears page state on a %s failure and allows a successful retry',
    async stage => {
      loginStateStorage['oidc.login.default'] = JSON.stringify(loginParams);
      const error = new Error(`${stage} failed`);
      const failingStep =
        stage === 'session state'
          ? getSessionState
          : stage === 'session monitoring'
            ? oidc.startCheckSessionAsync
            : oidc.userInfoAsync;
      failingStep.mockRejectedValueOnce(error);

      await expect(restore()).resolves.toBe(false);

      expect(renewal.autoRenewTokens).toHaveBeenCalledOnce();
      expect(oidc.tokens).toBeNull();
      expect(oidc.userInfo).toBeNull();
      expect(oidc.timeoutId).toBeNull();
      expect(oidc.checkSessionIFrame.stop).toHaveBeenCalledOnce();
      expect(vi.getTimerCount()).toBe(0);
      expect(oidc.publishEvent).toHaveBeenCalledWith(
        eventNames.tryKeepExistingSessionAsync_error,
        expect.any(String),
      );

      await expect(restore()).resolves.toBe(true);

      expect(workers.initWorkerAsync).toHaveBeenCalledTimes(2);
      expect(oidc.tokens).toEqual(tokens);
      expect(vi.getTimerCount()).toBe(1);
    },
  );

  it('handles a restoration failure before a renewal timer or session monitor exists', async () => {
    oidc.checkSessionIFrame = null;
    oidc.initAsync.mockRejectedValueOnce(new Error('discovery failed'));

    await expect(restore()).resolves.toBe(false);

    expect(oidc.tokens).toBeNull();
    expect(oidc.userInfo).toBeNull();
    expect(oidc.timeoutId).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
    expect(clearWorker).not.toHaveBeenCalled();
  });

  if (mode === 'service worker') {
    it.each([false, true])(
      'clears page state before worker cleanup completes (cleanup rejects: %s)',
      async rejects => {
        loginStateStorage['oidc.login.default'] = JSON.stringify(loginParams);
        oidc.userInfoAsync.mockRejectedValueOnce(new Error('user info failed'));
        let finishCleanup: () => void;
        let pageStateBeforeCleanup: unknown;
        const cleanupError = new Error('worker cleanup failed');
        clearWorker.mockImplementationOnce(() => {
          pageStateBeforeCleanup = {
            tokens: oidc.tokens,
            userInfo: oidc.userInfo,
            timeoutId: oidc.timeoutId,
            monitorStopCount: oidc.checkSessionIFrame.stop.mock.calls.length,
            timerCount: vi.getTimerCount(),
          };
          return new Promise<void>((resolve, reject) => {
            finishCleanup = () => (rejects ? reject(cleanupError) : resolve());
          });
        });

        const restoring = restore();
        const result = rejects
          ? expect(restoring).rejects.toBe(cleanupError)
          : expect(restoring).resolves.toBe(false);
        await vi.waitFor(() => expect(clearWorker).toHaveBeenCalledOnce());
        finishCleanup();
        await result;

        expect(pageStateBeforeCleanup).toEqual({
          tokens: null,
          userInfo: null,
          timeoutId: null,
          monitorStopCount: 1,
          timerCount: 0,
        });
        expect(oidc.tokens).toBeNull();
        expect(oidc.userInfo).toBeNull();
        expect(oidc.timeoutId).toBeNull();
        expect(vi.getTimerCount()).toBe(0);

        await expect(restore()).resolves.toBe(true);
        expect(workers.initWorkerAsync).toHaveBeenCalledTimes(2);
        expect(oidc.tokens).toEqual(tokens);
      },
    );
  }
});

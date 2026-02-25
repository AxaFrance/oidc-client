import { describe, expect, it, beforeEach } from 'vitest';
import { initSession } from './initSession';

const makeStorage = (): Storage => {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      for (const key of Object.keys(store)) {
        delete store[key];
      }
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
    [Symbol.iterator]: function* () {
      yield* Object.entries(store);
    },
  } as unknown as Storage;
};

describe('initSession', () => {
  const configName = 'default';

  describe('single storage (existing behaviour)', () => {
    let storage: Storage;
    let session: ReturnType<typeof initSession>;

    beforeEach(() => {
      storage = makeStorage();
      session = initSession(configName, storage);
    });

    it('stores tokens in storage', () => {
      session.setTokens({ accessToken: 'at', idToken: 'id' });
      expect(storage[`oidc.${configName}`]).toContain('accessToken');
    });

    it('stores login params in same storage', () => {
      session.setLoginParams({ callbackPath: '/callback', extras: null, scope: 'openid' });
      expect(storage[`oidc.login.${configName}`]).toBeTruthy();
    });

    it('stores state in same storage', async () => {
      await session.setStateAsync('abc123');
      expect(storage[`oidc.state.${configName}`]).toBe('abc123');
    });

    it('stores code verifier in same storage', async () => {
      await session.setCodeVerifierAsync('verifier');
      expect(storage[`oidc.code_verifier.${configName}`]).toBe('verifier');
    });

    it('stores nonce in same storage', async () => {
      await session.setNonceAsync({ nonce: 'nonce-value' });
      expect(storage[`oidc.nonce.${configName}`]).toBe('nonce-value');
    });

    it('clearAsync nulls the tokens entry', async () => {
      session.setTokens({ accessToken: 'at' });
      await session.clearAsync('LOGGED_OUT');
      const stored = JSON.parse(storage[`oidc.${configName}`]);
      expect(stored.tokens).toBeNull();
    });
  });

  describe('dual storage — login state in separate storage', () => {
    let tokenStorage: Storage;
    let loginStateStorage: Storage;
    let session: ReturnType<typeof initSession>;

    beforeEach(() => {
      tokenStorage = makeStorage();
      loginStateStorage = makeStorage();
      session = initSession(configName, tokenStorage, loginStateStorage);
    });

    it('stores tokens in tokenStorage, not loginStateStorage', () => {
      session.setTokens({ accessToken: 'at', idToken: 'id' });
      expect(tokenStorage[`oidc.${configName}`]).toContain('accessToken');
      expect(loginStateStorage[`oidc.${configName}`]).toBeUndefined();
    });

    it('stores login params in loginStateStorage, not tokenStorage', () => {
      session.setLoginParams({ callbackPath: '/callback', extras: null, scope: 'openid' });
      expect(loginStateStorage[`oidc.login.${configName}`]).toBeTruthy();
      expect(tokenStorage[`oidc.login.${configName}`]).toBeUndefined();
    });

    it('stores state in loginStateStorage, not tokenStorage', async () => {
      await session.setStateAsync('abc123');
      expect(loginStateStorage[`oidc.state.${configName}`]).toBe('abc123');
      expect(tokenStorage[`oidc.state.${configName}`]).toBeUndefined();
    });

    it('retrieves state from loginStateStorage', async () => {
      await session.setStateAsync('state-value');
      const retrieved = await session.getStateAsync();
      expect(retrieved).toBe('state-value');
    });

    it('stores code verifier in loginStateStorage, not tokenStorage', async () => {
      await session.setCodeVerifierAsync('verifier');
      expect(loginStateStorage[`oidc.code_verifier.${configName}`]).toBe('verifier');
      expect(tokenStorage[`oidc.code_verifier.${configName}`]).toBeUndefined();
    });

    it('retrieves code verifier from loginStateStorage', async () => {
      await session.setCodeVerifierAsync('cv-value');
      const retrieved = await session.getCodeVerifierAsync();
      expect(retrieved).toBe('cv-value');
    });

    it('stores nonce in loginStateStorage, not tokenStorage', async () => {
      await session.setNonceAsync({ nonce: 'nonce-value' });
      expect(loginStateStorage[`oidc.nonce.${configName}`]).toBe('nonce-value');
      expect(tokenStorage[`oidc.nonce.${configName}`]).toBeUndefined();
    });

    it('retrieves nonce from loginStateStorage', async () => {
      await session.setNonceAsync({ nonce: 'nonce-value' });
      const { nonce } = await session.getNonceAsync();
      expect(nonce).toBe('nonce-value');
    });

    it('stores session_state in tokenStorage, not loginStateStorage', async () => {
      await session.setSessionStateAsync('ss-value');
      expect(tokenStorage[`oidc.session_state.${configName}`]).toBe('ss-value');
      expect(loginStateStorage[`oidc.session_state.${configName}`]).toBeUndefined();
    });

    it('clearAsync nulls tokens in tokenStorage', async () => {
      session.setTokens({ accessToken: 'at' });
      await session.clearAsync('LOGGED_OUT');
      const stored = JSON.parse(tokenStorage[`oidc.${configName}`]);
      expect(stored.tokens).toBeNull();
    });

    it('clearAsync removes login state keys from loginStateStorage', async () => {
      session.setLoginParams({ callbackPath: '/callback', extras: null, scope: 'openid' });
      await session.setStateAsync('abc');
      await session.setCodeVerifierAsync('verifier');
      await session.setNonceAsync({ nonce: 'n' });

      await session.clearAsync('LOGGED_OUT');

      expect(loginStateStorage[`oidc.login.${configName}`]).toBeUndefined();
      expect(loginStateStorage[`oidc.state.${configName}`]).toBeUndefined();
      expect(loginStateStorage[`oidc.code_verifier.${configName}`]).toBeUndefined();
      expect(loginStateStorage[`oidc.nonce.${configName}`]).toBeUndefined();
    });

    it('clearAsync does not remove login state from tokenStorage when storages differ', async () => {
      tokenStorage[`oidc.login.${configName}`] = 'should-not-be-touched';
      await session.clearAsync('LOGGED_OUT');
      expect(tokenStorage[`oidc.login.${configName}`]).toBe('should-not-be-touched');
    });
  });

  describe('two-tab isolation', () => {
    it('two sessions sharing tokenStorage but with independent loginStateStorages do not overwrite each other', async () => {
      const sharedTokenStorage = makeStorage();
      const tab1LoginStorage = makeStorage();
      const tab2LoginStorage = makeStorage();

      const tab1 = initSession(configName, sharedTokenStorage, tab1LoginStorage);
      const tab2 = initSession(configName, sharedTokenStorage, tab2LoginStorage);

      await tab1.setStateAsync('state-tab1');
      await tab2.setStateAsync('state-tab2');

      expect(await tab1.getStateAsync()).toBe('state-tab1');
      expect(await tab2.getStateAsync()).toBe('state-tab2');
    });

    it('two sessions sharing tokenStorage but with independent loginStateStorages have isolated nonces', async () => {
      const sharedTokenStorage = makeStorage();
      const tab1LoginStorage = makeStorage();
      const tab2LoginStorage = makeStorage();

      const tab1 = initSession(configName, sharedTokenStorage, tab1LoginStorage);
      const tab2 = initSession(configName, sharedTokenStorage, tab2LoginStorage);

      await tab1.setNonceAsync({ nonce: 'nonce-tab1' });
      await tab2.setNonceAsync({ nonce: 'nonce-tab2' });

      const { nonce: nonce1 } = await tab1.getNonceAsync();
      const { nonce: nonce2 } = await tab2.getNonceAsync();
      expect(nonce1).toBe('nonce-tab1');
      expect(nonce2).toBe('nonce-tab2');
    });

    it('token updates from one tab are visible to the other via shared tokenStorage', async () => {
      const sharedTokenStorage = makeStorage();

      const tab1 = initSession(configName, sharedTokenStorage, makeStorage());
      const tab2 = initSession(configName, sharedTokenStorage, makeStorage());

      tab1.setTokens({ accessToken: 'new-at', idToken: 'new-id' });

      const tokensJson = tab2.getTokens();
      expect(tokensJson).not.toBeNull();
      const parsed = JSON.parse(tokensJson!);
      expect(parsed.tokens.accessToken).toBe('new-at');
    });
  });
});

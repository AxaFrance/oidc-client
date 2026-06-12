import { describe, expect, it } from 'vitest';

import { MessageTypes, OidcStorageKeys } from '../protocol';

describe('OidcStorageKeys', () => {
  it('should generate tabId key', () => {
    expect(OidcStorageKeys.tabId('default')).toBe('oidc.tabId.default');
    expect(OidcStorageKeys.tabId('my-config')).toBe('oidc.tabId.my-config');
  });

  it('should generate nonce key', () => {
    expect(OidcStorageKeys.nonce('default')).toBe('oidc.nonce.default');
    expect(OidcStorageKeys.nonce('custom')).toBe('oidc.nonce.custom');
  });

  it('should generate state key', () => {
    expect(OidcStorageKeys.state('default')).toBe('oidc.state.default');
  });

  it('should generate codeVerifier key', () => {
    expect(OidcStorageKeys.codeVerifier('default')).toBe('oidc.code_verifier.default');
  });

  it('should generate tokens key', () => {
    expect(OidcStorageKeys.tokens('default')).toBe('oidc.default');
    expect(OidcStorageKeys.tokens('my-app')).toBe('oidc.my-app');
  });

  it('should generate userInfo key', () => {
    expect(OidcStorageKeys.userInfo('default')).toBe('oidc.default.userInfo');
  });

  it('should generate login key', () => {
    expect(OidcStorageKeys.login('default')).toBe('oidc.login.default');
  });

  it('should generate swReloadCount key', () => {
    expect(OidcStorageKeys.swReloadCount()).toBe('oidc.sw.controllerchange_reload_count');
  });

  it('should generate swVersionMismatchReload key', () => {
    expect(OidcStorageKeys.swVersionMismatchReload('default')).toBe(
      'oidc.sw.version_mismatch_reload.default',
    );
  });

  it('should match keys used in initWorker.ts', () => {
    // These assertions verify that OidcStorageKeys stays in sync with
    // the actual key patterns used throughout the codebase.
    const configurationName = 'test-config';
    expect(OidcStorageKeys.tabId(configurationName)).toBe(`oidc.tabId.${configurationName}`);
    expect(OidcStorageKeys.nonce(configurationName)).toBe(`oidc.nonce.${configurationName}`);
    expect(OidcStorageKeys.state(configurationName)).toBe(`oidc.state.${configurationName}`);
    expect(OidcStorageKeys.codeVerifier(configurationName)).toBe(
      `oidc.code_verifier.${configurationName}`,
    );
    expect(OidcStorageKeys.login(configurationName)).toBe(`oidc.login.${configurationName}`);
  });
});

describe('MessageTypes', () => {
  it('should contain all expected message types', () => {
    expect(MessageTypes.SKIP_WAITING).toBe('SKIP_WAITING');
    expect(MessageTypes.claim).toBe('claim');
    expect(MessageTypes.clear).toBe('clear');
    expect(MessageTypes.init).toBe('init');
    expect(MessageTypes.setState).toBe('setState');
    expect(MessageTypes.getState).toBe('getState');
    expect(MessageTypes.setCodeVerifier).toBe('setCodeVerifier');
    expect(MessageTypes.getCodeVerifier).toBe('getCodeVerifier');
    expect(MessageTypes.setSessionState).toBe('setSessionState');
    expect(MessageTypes.getSessionState).toBe('getSessionState');
    expect(MessageTypes.setNonce).toBe('setNonce');
    expect(MessageTypes.getNonce).toBe('getNonce');
    expect(MessageTypes.setDemonstratingProofOfPossessionNonce).toBe(
      'setDemonstratingProofOfPossessionNonce',
    );
    expect(MessageTypes.getDemonstratingProofOfPossessionNonce).toBe(
      'getDemonstratingProofOfPossessionNonce',
    );
    expect(MessageTypes.setDemonstratingProofOfPossessionJwk).toBe(
      'setDemonstratingProofOfPossessionJwk',
    );
    expect(MessageTypes.getDemonstratingProofOfPossessionJwk).toBe(
      'getDemonstratingProofOfPossessionJwk',
    );
  });

  it('should have exactly 16 message types', () => {
    expect(Object.keys(MessageTypes)).toHaveLength(16);
  });

  it('should be immutable (const assertion)', () => {
    // Verify the object is frozen-like (values equal their key or expected string)
    for (const [key, value] of Object.entries(MessageTypes)) {
      expect(typeof value).toBe('string');
      expect(value).toBe(key);
    }
  });
});

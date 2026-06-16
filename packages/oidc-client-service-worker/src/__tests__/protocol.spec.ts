import { describe, expect, it } from 'vitest';

import { TOKEN } from '../constants';
import {
  buildDpopSecuredPlaceholder,
  buildSecuredTokenPlaceholder,
  buildStorageKey,
  DPOP_TOKEN_PLACEHOLDER_PREFIX,
  isServiceWorkerMessageType,
  PROTOCOL_VERSION,
  ServiceWorkerMessageType,
  STORAGE_KEY_PREFIX,
  SW_CONTROLLER_CHANGE_RELOAD_COUNT_KEY,
  TOKEN_PLACEHOLDERS,
} from '../protocol';

describe('service worker protocol – public surface', () => {
  it('exposes a stable PROTOCOL_VERSION', () => {
    expect(PROTOCOL_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('keeps every documented message type accessible by canonical key', () => {
    expect(ServiceWorkerMessageType).toEqual({
      SKIP_WAITING: 'SKIP_WAITING',
      CLAIM: 'claim',
      CLEAR: 'clear',
      INIT: 'init',
      SET_STATE: 'setState',
      GET_STATE: 'getState',
      SET_CODE_VERIFIER: 'setCodeVerifier',
      GET_CODE_VERIFIER: 'getCodeVerifier',
      SET_SESSION_STATE: 'setSessionState',
      GET_SESSION_STATE: 'getSessionState',
      SET_NONCE: 'setNonce',
      GET_NONCE: 'getNonce',
      SET_DPOP_NONCE: 'setDemonstratingProofOfPossessionNonce',
      GET_DPOP_NONCE: 'getDemonstratingProofOfPossessionNonce',
      SET_DPOP_JWK: 'setDemonstratingProofOfPossessionJwk',
      GET_DPOP_JWK: 'getDemonstratingProofOfPossessionJwk',
    });
  });

  it('matches the internal TOKEN constants used by the service worker', () => {
    expect(TOKEN_PLACEHOLDERS.ACCESS_TOKEN).toBe(TOKEN.ACCESS_TOKEN);
    expect(TOKEN_PLACEHOLDERS.REFRESH_TOKEN).toBe(TOKEN.REFRESH_TOKEN);
    expect(TOKEN_PLACEHOLDERS.NONCE_TOKEN).toBe(TOKEN.NONCE_TOKEN);
    expect(TOKEN_PLACEHOLDERS.CODE_VERIFIER).toBe(TOKEN.CODE_VERIFIER);
  });
});

describe('buildSecuredTokenPlaceholder', () => {
  it('produces the same placeholder format the service worker emits', () => {
    expect(buildSecuredTokenPlaceholder(TOKEN_PLACEHOLDERS.ACCESS_TOKEN, 'demo', 'tab-1')).toBe(
      'ACCESS_TOKEN_SECURED_BY_OIDC_SERVICE_WORKER_demo#tabId=tab-1',
    );
  });

  it('defaults the tab id to "default"', () => {
    expect(buildSecuredTokenPlaceholder(TOKEN_PLACEHOLDERS.REFRESH_TOKEN, 'demo')).toBe(
      'REFRESH_TOKEN_SECURED_BY_OIDC_SERVICE_WORKER_demo#tabId=default',
    );
  });
});

describe('buildDpopSecuredPlaceholder', () => {
  it('uses the documented DPoP prefix', () => {
    expect(buildDpopSecuredPlaceholder('demo', 'tab-2')).toBe(
      `${DPOP_TOKEN_PLACEHOLDER_PREFIX}_demo#tabId=tab-2`,
    );
  });
});

describe('buildStorageKey', () => {
  it.each([
    [STORAGE_KEY_PREFIX.STATE, 'demo', 'oidc.state.demo'],
    [STORAGE_KEY_PREFIX.NONCE, 'demo', 'oidc.nonce.demo'],
    [STORAGE_KEY_PREFIX.CODE_VERIFIER, 'demo', 'oidc.code_verifier.demo'],
    [STORAGE_KEY_PREFIX.LOGIN_PARAMS, 'demo', 'oidc.login.demo'],
    [STORAGE_KEY_PREFIX.TAB_ID, 'demo', 'oidc.tabId.demo'],
    [STORAGE_KEY_PREFIX.SW_VERSION_MISMATCH_RELOAD, 'demo', 'oidc.sw.version_mismatch_reload.demo'],
  ])('builds %s + %s into %s', (prefix, configurationName, expected) => {
    expect(buildStorageKey(prefix, configurationName)).toBe(expected);
  });

  it('exposes the SW controllerchange reload counter key', () => {
    expect(SW_CONTROLLER_CHANGE_RELOAD_COUNT_KEY).toBe('oidc.sw.controllerchange_reload_count');
  });
});

describe('isServiceWorkerMessageType', () => {
  it.each(Object.values(ServiceWorkerMessageType))(
    'returns true for known message type "%s"',
    type => {
      expect(isServiceWorkerMessageType(type)).toBe(true);
    },
  );

  it.each(['unknown', '', 42, null, undefined, {}])(
    'returns false for invalid message type %p',
    value => {
      expect(isServiceWorkerMessageType(value)).toBe(false);
    },
  );
});

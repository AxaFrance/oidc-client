import { describe, expect, it } from 'vitest';

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
} from './protocol';

describe('public oidc-client protocol surface', () => {
  it('exposes a stable PROTOCOL_VERSION', () => {
    expect(PROTOCOL_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('matches the wire-level message types documented in PROTOCOL.md', () => {
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

  it('exposes the token placeholders the service worker emits', () => {
    expect(TOKEN_PLACEHOLDERS).toEqual({
      ACCESS_TOKEN: 'ACCESS_TOKEN_SECURED_BY_OIDC_SERVICE_WORKER',
      REFRESH_TOKEN: 'REFRESH_TOKEN_SECURED_BY_OIDC_SERVICE_WORKER',
      NONCE_TOKEN: 'NONCE_SECURED_BY_OIDC_SERVICE_WORKER',
      CODE_VERIFIER: 'CODE_VERIFIER_SECURED_BY_OIDC_SERVICE_WORKER',
    });
    expect(DPOP_TOKEN_PLACEHOLDER_PREFIX).toBe('DPOP_SECURED_BY_OIDC_SERVICE_WORKER');
  });
});

describe('protocol helpers', () => {
  it('builds secured token placeholders that match the SW output', () => {
    expect(buildSecuredTokenPlaceholder(TOKEN_PLACEHOLDERS.ACCESS_TOKEN, 'demo', 'tab-1')).toBe(
      'ACCESS_TOKEN_SECURED_BY_OIDC_SERVICE_WORKER_demo#tabId=tab-1',
    );
    expect(buildSecuredTokenPlaceholder(TOKEN_PLACEHOLDERS.NONCE_TOKEN, 'demo')).toBe(
      'NONCE_SECURED_BY_OIDC_SERVICE_WORKER_demo#tabId=default',
    );
  });

  it('builds DPoP placeholders that match the SW output', () => {
    expect(buildDpopSecuredPlaceholder('demo', 'tab-2')).toBe(
      `${DPOP_TOKEN_PLACEHOLDER_PREFIX}_demo#tabId=tab-2`,
    );
  });

  it.each([
    [STORAGE_KEY_PREFIX.STATE, 'demo', 'oidc.state.demo'],
    [STORAGE_KEY_PREFIX.NONCE, 'demo', 'oidc.nonce.demo'],
    [STORAGE_KEY_PREFIX.CODE_VERIFIER, 'demo', 'oidc.code_verifier.demo'],
    [STORAGE_KEY_PREFIX.LOGIN_PARAMS, 'demo', 'oidc.login.demo'],
    [STORAGE_KEY_PREFIX.TAB_ID, 'demo', 'oidc.tabId.demo'],
  ])('combines storage prefix %s + %s into %s', (prefix, configurationName, expected) => {
    expect(buildStorageKey(prefix, configurationName)).toBe(expected);
  });

  it('exposes the SW controllerchange reload counter key', () => {
    expect(SW_CONTROLLER_CHANGE_RELOAD_COUNT_KEY).toBe('oidc.sw.controllerchange_reload_count');
  });

  it.each(Object.values(ServiceWorkerMessageType))(
    'recognises "%s" as a known message type',
    type => {
      expect(isServiceWorkerMessageType(type)).toBe(true);
    },
  );

  it.each(['unknown', '', 42, null, undefined, {}])(
    'rejects %p as not a known message type',
    value => {
      expect(isServiceWorkerMessageType(value)).toBe(false);
    },
  );
});

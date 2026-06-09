// Guarded writes to storage. Assigning `undefined` or `null` through bracket
// notation (or `setItem`) coerces the value to the literal strings
// `"undefined"` / `"null"`, which then poison the next `JSON.parse` read.
// See https://github.com/AxaFrance/oidc-client/issues/1257 (and #871, #1274).
const writeJson = (storage: Storage, key: string, value: unknown) => {
  if (value === undefined || value === null) {
    delete storage[key];
    return;
  }
  storage[key] = JSON.stringify(value);
};

const writeRaw = (storage: Storage, key: string, value: string | null | undefined) => {
  if (value === undefined || value === null) {
    delete storage[key];
    return;
  }
  storage[key] = value;
};

const parseJsonOrNull = <T = unknown>(raw: unknown): T | null => {
  if (typeof raw !== 'string') {
    return null;
  }
  // Defence in depth against pre-existing poisoned values written by older
  // versions of this library before the setter guards above were in place.
  if (raw === 'undefined' || raw === 'null' || raw === '') {
    return null;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

export const initSession = (
  configurationName,
  storage = sessionStorage,
  loginStateStorage?: Storage,
) => {
  const loginStorage = loginStateStorage ?? storage;

  const clearAsync = status => {
    writeJson(storage, `oidc.${configurationName}`, { tokens: null, status });
    delete storage[`oidc.${configurationName}.userInfo`];
    if (loginStateStorage && loginStateStorage !== storage) {
      delete loginStorage[`oidc.login.${configurationName}`];
      delete loginStorage[`oidc.state.${configurationName}`];
      delete loginStorage[`oidc.code_verifier.${configurationName}`];
      delete loginStorage[`oidc.nonce.${configurationName}`];
    }
    return Promise.resolve();
  };

  const initAsync = async () => {
    const existing = parseJsonOrNull(storage[`oidc.${configurationName}`]) as {
      tokens: any;
      status: any;
    } | null;
    if (!existing) {
      writeJson(storage, `oidc.${configurationName}`, { tokens: null, status: null });
      return { tokens: null, status: null };
    }
    return Promise.resolve({ tokens: existing.tokens, status: existing.status });
  };

  const setTokens = tokens => {
    writeJson(storage, `oidc.${configurationName}`, { tokens });
  };

  const setSessionStateAsync = async sessionState => {
    writeRaw(storage, `oidc.session_state.${configurationName}`, sessionState);
  };

  const getSessionStateAsync = async () => {
    return storage[`oidc.session_state.${configurationName}`];
  };

  const setNonceAsync = nonce => {
    writeRaw(loginStorage, `oidc.nonce.${configurationName}`, nonce?.nonce);
  };

  const setDemonstratingProofOfPossessionJwkAsync = (jwk: JsonWebKey) => {
    writeJson(storage, `oidc.jwk.${configurationName}`, jwk);
  };

  const getDemonstratingProofOfPossessionJwkAsync = () => {
    return parseJsonOrNull<JsonWebKey>(storage[`oidc.jwk.${configurationName}`]);
  };

  const getNonceAsync = async () => {
    // @ts-ignore
    return { nonce: loginStorage[`oidc.nonce.${configurationName}`] };
  };

  const setDemonstratingProofOfPossessionNonce = async (dpopNonce: string) => {
    writeRaw(storage, `oidc.dpop_nonce.${configurationName}`, dpopNonce);
  };

  const getDemonstratingProofOfPossessionNonce = (): string => {
    return storage[`oidc.dpop_nonce.${configurationName}`];
  };

  const getTokens = () => {
    const parsed = parseJsonOrNull(storage[`oidc.${configurationName}`]) as {
      tokens: any;
    } | null;
    if (!parsed) {
      return null;
    }
    return JSON.stringify({ tokens: parsed.tokens });
  };

  const getLoginParamsCache = {};
  const setLoginParams = data => {
    if (data === undefined || data === null) {
      delete getLoginParamsCache[configurationName];
      delete loginStorage[`oidc.login.${configurationName}`];
      return;
    }
    getLoginParamsCache[configurationName] = data;
    writeJson(loginStorage, `oidc.login.${configurationName}`, data);
  };
  const getLoginParams = () => {
    if (getLoginParamsCache[configurationName]) {
      return getLoginParamsCache[configurationName];
    }
    const parsed = parseJsonOrNull(loginStorage[`oidc.login.${configurationName}`]);
    if (parsed === null) {
      console.warn(
        `storage[oidc.login.${configurationName}] is empty, you should have an bad OIDC or code configuration somewhere.`,
      );
      return null;
    }
    getLoginParamsCache[configurationName] = parsed;
    return parsed;
  };

  const getStateAsync = async () => {
    return loginStorage[`oidc.state.${configurationName}`];
  };

  const setStateAsync = async (state: string) => {
    writeRaw(loginStorage, `oidc.state.${configurationName}`, state);
  };

  const getCodeVerifierAsync = async () => {
    return loginStorage[`oidc.code_verifier.${configurationName}`];
  };

  const setCodeVerifierAsync = async codeVerifier => {
    writeRaw(loginStorage, `oidc.code_verifier.${configurationName}`, codeVerifier);
  };

  return {
    clearAsync,
    initAsync,
    setTokens,
    getTokens,
    setSessionStateAsync,
    getSessionStateAsync,
    setNonceAsync,
    getNonceAsync,
    setLoginParams,
    getLoginParams,
    getStateAsync,
    setStateAsync,
    getCodeVerifierAsync,
    setCodeVerifierAsync,
    setDemonstratingProofOfPossessionNonce,
    getDemonstratingProofOfPossessionNonce,
    setDemonstratingProofOfPossessionJwkAsync,
    getDemonstratingProofOfPossessionJwkAsync,
  };
};

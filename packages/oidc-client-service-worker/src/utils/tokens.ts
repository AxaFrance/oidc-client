/* eslint-disable simple-import-sort/exports */
import { TOKEN, TokenRenewMode } from '../constants';
import { getResourceConfiguration } from '../resource';
import {
  AccessTokenPayload,
  IdTokenPayload,
  OidcConfig,
  OidcConfiguration,
  OidcServerConfiguration,
  Tokens,
} from '../types';

export const parseJwt = (payload: string) => {
  return JSON.parse(b64DecodeUnicode(payload.replaceAll(/-/g, '+').replaceAll(/_/g, '/')));
};
function b64DecodeUnicode(str: string) {
  return decodeURIComponent(
    Array.prototype.map
      .call(atob(str), c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join(''),
  );
}

function computeTimeLeft(refreshTimeBeforeTokensExpirationInSecond: number, expiresAt: number) {
  const currentTimeUnixSecond = new Date().getTime() / 1000;
  return Math.round(expiresAt - refreshTimeBeforeTokensExpirationInSecond - currentTimeUnixSecond);
}

function isTokensValid(tokens: Tokens | null) {
  if (!tokens) {
    return false;
  }
  return computeTimeLeft(0, tokens.expiresAt) > 0;
}

const extractTokenPayload = (token?: string) => {
  try {
    if (!token) {
      return null;
    }
    const parts = token.split('.');
    return parts.length === 3 ? parseJwt(parts[1]) : null;
  } catch (e) {
    console.warn(e);
  }
  return null;
};

// https://openid.net/specs/openid-connect-core-1_0.html#IDTokenValidation (excluding rules #1, #4, #5, #7, #8, #12, and #13 which did not apply).
// https://github.com/openid/AppAuth-JS/issues/65
const isTokensOidcValid = (
  tokens: Tokens,
  nonce: string | null,
  oidcServerConfiguration: OidcServerConfiguration,
): { isValid: boolean; reason: string } => {
  if (tokens.idTokenPayload) {
    const idTokenPayload = tokens.idTokenPayload;
    // 2: The Issuer Identifier for the OpenID Provider (which is typically obtained during Discovery) MUST exactly match the value of the iss (issuer) Claim.
    if (idTokenPayload && oidcServerConfiguration.issuer !== idTokenPayload.iss) {
      return {
        isValid: false,
        reason: `Issuer does not match (oidcServerConfiguration issuer) ${oidcServerConfiguration.issuer} !== (idTokenPayload issuer) ${idTokenPayload.iss}`,
      };
    }
    // 3: The Client MUST validate that the aud (audience) Claim contains its client_id value registered at the Issuer identified by the iss (issuer) Claim as an audience. The aud (audience) Claim MAY contain an array with more than one element. The ID Token MUST be rejected if the ID Token does not list the Client as a valid audience, or if it contains additional audiences not trusted by the Client.

    // 6: If the ID Token is received via direct communication between the Client and the Token Endpoint (which it is in this flow), the TLS server validation MAY be used to validate the issuer in place of checking the token signature. The Client MUST validate the signature of all other ID Tokens according to JWS [JWS] using the algorithm specified in the JWT alg Header Parameter. The Client MUST use the keys provided by the Issuer.

    // 9: The current time MUST be before the time represented by the exp Claim.
    const currentTimeUnixSecond = new Date().getTime() / 1000;
    if (idTokenPayload && idTokenPayload.exp && idTokenPayload.exp < currentTimeUnixSecond) {
      return {
        isValid: false,
        reason: `Token expired at (idTokenPayload exp) ${idTokenPayload.exp} < (currentTimeUnixSecond) ${currentTimeUnixSecond}`,
      };
    }
    // 10: The iat Claim can be used to reject tokens that were issued too far away from the current time, limiting the amount of time that nonces need to be stored to prevent attacks. The acceptable range is Client specific.
    const timeInSevenDays = 60 * 60 * 24 * 7;
    if (
      idTokenPayload &&
      idTokenPayload.iat &&
      idTokenPayload.iat + timeInSevenDays < currentTimeUnixSecond
    ) {
      return {
        isValid: false,
        reason: `Token is used from too long time (idTokenPayload iat + timeInSevenDays) ${idTokenPayload.iat + timeInSevenDays} < (currentTimeUnixSecond) ${currentTimeUnixSecond}`,
      };
    }
    // 11: If a nonce value was sent in the Authentication Request, a nonce Claim MUST be present and its value checked to verify that it is the same value as the one that was sent in the Authentication Request. The Client SHOULD check the nonce value for replay attacks. The precise method for detecting replay attacks is Client specific.
    if (idTokenPayload && nonce && idTokenPayload.nonce && idTokenPayload.nonce !== nonce) {
      return {
        isValid: false,
        reason: `Nonce does not match (nonce) ${nonce} !== (idTokenPayload nonce) ${idTokenPayload.nonce}`,
      };
    }
  }
  return { isValid: true, reason: '' };
};

function extractedIssueAt(
  tokens: Tokens,
  accessTokenPayload: AccessTokenPayload | null,
  _idTokenPayload: IdTokenPayload,
) {
  if (!tokens.issued_at) {
    if (accessTokenPayload && accessTokenPayload.iat) {
      return accessTokenPayload.iat;
    } else if (_idTokenPayload && _idTokenPayload.iat) {
      return _idTokenPayload.iat;
    } else {
      const currentTimeUnixSecond = new Date().getTime() / 1000;
      return currentTimeUnixSecond;
    }
  } else if (typeof tokens.issued_at == 'string') {
    return parseInt(tokens.issued_at, 10);
  }
  return tokens.issued_at;
}

function _hideTokens(
  tokens: Tokens,
  currentDatabaseElement: OidcConfig,
  configurationName: string,
  isAuthorizationCode = false,
) {
  const hasNewIdToken = typeof tokens.id_token === 'string' && tokens.id_token.length > 0;
  const parent = currentDatabaseElement.parentConfiguration;
  if (
    currentDatabaseElement.resource &&
    currentDatabaseElement.refreshGrant === currentDatabaseElement &&
    tokens.refresh_token &&
    tokens.refresh_token === parent?.tokens?.refresh_token
  ) {
    throw new Error(
      'The provider reused a refresh token across separate authorization transactions; use a multi-resource authorization grant instead.',
    );
  }
  if (!tokens.issued_at) {
    const currentTimeUnixSecond = new Date().getTime() / 1000;
    tokens.issued_at = currentTimeUnixSecond;
  } else if (typeof tokens.issued_at == 'string') {
    tokens.issued_at = parseInt(tokens.issued_at, 10);
  }

  const accessTokenPayload = extractTokenPayload(tokens.access_token);
  if (
    currentDatabaseElement.resource ||
    currentDatabaseElement.oidcConfiguration?.resources?.length
  ) {
    tokens.scope ??=
      currentDatabaseElement.requestedScope ??
      currentDatabaseElement.tokens?.scope ??
      currentDatabaseElement.oidcConfiguration?.scope;
  }
  const secureTokens = {
    ...tokens,
    accessTokenPayload,
  };
  if (currentDatabaseElement.hideAccessToken) {
    secureTokens.access_token = `${TOKEN.ACCESS_TOKEN}_${configurationName}`;
  }
  tokens.accessTokenPayload = accessTokenPayload;

  // When id_token is not rotated we reuse old id_token
  const oldTokens = currentDatabaseElement.tokens;
  let id_token: string | null;
  if (oldTokens != null && 'id_token' in oldTokens && !('id_token' in tokens)) {
    id_token = oldTokens.id_token;
  } else {
    id_token = tokens.id_token;
  }
  tokens.id_token = id_token;

  let _idTokenPayload = null;
  if (id_token) {
    _idTokenPayload = extractTokenPayload(id_token);
    tokens.idTokenPayload = _idTokenPayload != null ? { ..._idTokenPayload } : null;
    if (_idTokenPayload && _idTokenPayload.nonce && currentDatabaseElement.nonce != null) {
      const keyNonce = `${TOKEN.NONCE_TOKEN}_${currentDatabaseElement.configurationName}`;
      _idTokenPayload.nonce = keyNonce;
    }
    secureTokens.idTokenPayload =
      currentDatabaseElement.resource && !hasNewIdToken ? null : _idTokenPayload;
  }
  if (
    currentDatabaseElement.resource &&
    isAuthorizationCode &&
    (!hasNewIdToken ||
      typeof tokens.idTokenPayload?.sub !== 'string' ||
      !tokens.idTokenPayload.sub ||
      (currentDatabaseElement.nonce &&
        tokens.idTokenPayload.nonce !== currentDatabaseElement.nonce.nonce))
  ) {
    throw new Error(
      'Resource authorization requires a fresh ID token with the expected subject and nonce.',
    );
  }
  if (tokens.refresh_token) {
    secureTokens.refresh_token = `${TOKEN.REFRESH_TOKEN}_${(currentDatabaseElement.refreshGrant ?? currentDatabaseElement).configurationName}`;
  }

  tokens.issued_at = extractedIssueAt(tokens, accessTokenPayload, _idTokenPayload);

  const expireIn =
    typeof tokens.expires_in == 'string' ? parseInt(tokens.expires_in, 10) : tokens.expires_in;

  const idTokenExpiresAt =
    _idTokenPayload && _idTokenPayload.exp ? _idTokenPayload.exp : Number.MAX_VALUE;
  const accessTokenExpiresAt =
    accessTokenPayload && accessTokenPayload.exp
      ? accessTokenPayload.exp
      : tokens.issued_at + expireIn;

  let expiresAt: number;
  const tokenRenewMode = currentDatabaseElement.resource
    ? TokenRenewMode.access_token_invalid
    : (currentDatabaseElement.oidcConfiguration as OidcConfiguration).token_renew_mode;
  if (tokenRenewMode === TokenRenewMode.access_token_invalid) {
    expiresAt = accessTokenExpiresAt;
  } else if (tokenRenewMode === TokenRenewMode.id_token_invalid) {
    expiresAt = idTokenExpiresAt;
  } else {
    expiresAt = idTokenExpiresAt < accessTokenExpiresAt ? idTokenExpiresAt : accessTokenExpiresAt;
  }
  secureTokens.expiresAt = expiresAt;

  tokens.expiresAt = expiresAt;
  const nonce = currentDatabaseElement.nonce ? currentDatabaseElement.nonce.nonce : null;
  const { isValid, reason } = isTokensOidcValid(
    currentDatabaseElement.resource && !hasNewIdToken
      ? { ...tokens, idTokenPayload: undefined }
      : tokens,
    nonce as string,
    currentDatabaseElement.oidcServerConfiguration as OidcServerConfiguration,
  ); // TODO: Type assertion, could be null.
  if (!isValid) {
    throw Error(`Tokens are not OpenID valid, reason: ${reason}`);
  }
  if (currentDatabaseElement.resource) {
    if (
      typeof tokens.access_token !== 'string' ||
      !tokens.access_token ||
      !Number.isFinite(expiresAt) ||
      !Number.isFinite(tokens.issued_at) ||
      (tokens.refresh_token != null &&
        (typeof tokens.refresh_token !== 'string' || !tokens.refresh_token))
    ) {
      throw new Error('The provider did not return a usable resource token response.');
    }
    const resource = getResourceConfiguration(
      currentDatabaseElement.oidcConfiguration?.resources,
      currentDatabaseElement.resource,
    );
    tokens.scope ??=
      currentDatabaseElement.requestedScope ??
      resource.scope ??
      currentDatabaseElement.oidcConfiguration?.scope;
    secureTokens.scope = tokens.scope;
    if (
      resource.scope &&
      !resource.scope
        .split(/\s+/)
        .filter(Boolean)
        .every(scope => (tokens.scope ?? '').split(/\s+/).includes(scope))
    ) {
      throw new Error('The provider did not grant the required resource scopes.');
    }
    const parentSubject = currentDatabaseElement.parentConfiguration?.tokens?.idTokenPayload?.sub;
    const subject = tokens.idTokenPayload?.sub ?? oldTokens?.idTokenPayload?.sub ?? parentSubject;
    if (typeof parentSubject !== 'string' || subject !== parentSubject) {
      throw new Error('Resource authorization must preserve the authenticated subject.');
    }
    if (
      (accessTokenPayload?.iss !== undefined &&
        accessTokenPayload.iss !== currentDatabaseElement.oidcServerConfiguration?.issuer) ||
      (accessTokenPayload &&
        resource.audiences &&
        !resource.audiences.some(audience =>
          (typeof accessTokenPayload.aud === 'string'
            ? [accessTokenPayload.aud]
            : (accessTokenPayload.aud ?? [])
          ).includes(audience),
        ))
    )
      throw new Error('Resource token issuer or configured audience does not match.');
  }

  // When refresh_token is not rotated we reuse old refresh_token
  if (oldTokens != null && 'refresh_token' in oldTokens && !('refresh_token' in tokens)) {
    const refreshToken = oldTokens.refresh_token;

    currentDatabaseElement.tokens = {
      ...tokens,
      refresh_token: refreshToken,
    };
  } else {
    currentDatabaseElement.tokens = tokens;
  }

  currentDatabaseElement.status = 'LOGGED_IN';
  if (currentDatabaseElement.resource) {
    const grant = currentDatabaseElement.refreshGrant ?? currentDatabaseElement;
    const subject =
      tokens.idTokenPayload?.sub ??
      grant.tokens?.idTokenPayload?.sub ??
      currentDatabaseElement.parentConfiguration?.tokens?.idTokenPayload?.sub;
    if (typeof subject !== 'string')
      throw new Error('Resource tokens require an authenticated OIDC subject.');
    if (grant !== currentDatabaseElement && tokens.refresh_token && grant.tokens) {
      grant.tokens.refresh_token = tokens.refresh_token;
    }
    const resourceContext = {
      resource: currentDatabaseElement.resource,
      issuer: currentDatabaseElement.oidcServerConfiguration!.issuer,
      clientId: currentDatabaseElement.oidcConfiguration!.client_id!,
      configurationName: currentDatabaseElement.configurationName.split('#')[0],
      subject,
      grantResource: grant.resource ?? null,
    };
    currentDatabaseElement.tokens!.resourceContext = resourceContext;
    secureTokens.resourceContext = resourceContext;
  }
  return secureTokens;
}

const demonstratingProofOfPossessionNonceResponseHeader = 'DPoP-Nonce';
function hideTokens(
  currentDatabaseElement: OidcConfig,
  isCurrent: () => boolean = () => true,
  isGrantCurrent: () => boolean = isCurrent,
  isAuthorizationCode = false,
) {
  const configurationName = currentDatabaseElement.configurationName;
  return (response: Response) => {
    if (response.status !== 200) {
      return response;
    }
    const newHeaders = new Headers(response.headers);
    if (
      response.headers.has(demonstratingProofOfPossessionNonceResponseHeader) &&
      isGrantCurrent()
    ) {
      currentDatabaseElement.demonstratingProofOfPossessionNonce = response.headers.get(
        demonstratingProofOfPossessionNonceResponseHeader,
      );
      if (
        currentDatabaseElement.refreshGrant &&
        currentDatabaseElement.refreshGrant !== currentDatabaseElement
      ) {
        currentDatabaseElement.refreshGrant.demonstratingProofOfPossessionNonce =
          currentDatabaseElement.demonstratingProofOfPossessionNonce;
      }
      newHeaders.delete(demonstratingProofOfPossessionNonceResponseHeader);
    }

    return response.json().then<Response>((tokens: Tokens) => {
      const grant = currentDatabaseElement.refreshGrant;
      if (
        currentDatabaseElement.resource &&
        grant &&
        isGrantCurrent() &&
        grant.tokens &&
        typeof tokens.refresh_token === 'string' &&
        tokens.refresh_token &&
        (grant !== currentDatabaseElement ||
          tokens.refresh_token !==
            currentDatabaseElement.parentConfiguration?.tokens?.refresh_token)
      ) {
        grant.tokens.refresh_token = tokens.refresh_token;
      }
      if (!isCurrent()) {
        throw new Error('The token transaction was cleared before its response.');
      }
      const secureTokens = _hideTokens(
        tokens,
        currentDatabaseElement,
        configurationName,
        isAuthorizationCode,
      );
      const body = JSON.stringify(secureTokens);
      return new Response(body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    });
  };
}

export {
  b64DecodeUnicode,
  computeTimeLeft,
  isTokensValid,
  extractTokenPayload,
  isTokensOidcValid,
  hideTokens,
  _hideTokens,
};

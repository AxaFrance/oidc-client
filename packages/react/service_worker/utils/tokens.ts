import { TOKEN, TokenRenewMode } from '../constants';
import { OidcConfig, OidcConfiguration, OidcServerConfiguration, Tokens } from '../types';
import { countLetter } from './strings';

function parseJwt(token: string) {
  return JSON.parse(
    b64DecodeUnicode(token.split('.')[1].replace('-', '+').replace('_', '/'))
  );
}
function b64DecodeUnicode(str: string) {
  return decodeURIComponent(
    Array.prototype.map
      .call(
        atob(str),
        (c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
      )
      .join('')
  );
}

function computeTimeLeft(
  refreshTimeBeforeTokensExpirationInSecond: number,
  expiresAt: number
) {
  const currentTimeUnixSecond = new Date().getTime() / 1000;
  return Math.round(
    expiresAt -
      refreshTimeBeforeTokensExpirationInSecond -
      currentTimeUnixSecond
  );
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
    if (countLetter(token, '.') === 2) {
      return parseJwt(token);
    } else {
      return null;
    }
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
  oidcServerConfiguration: OidcServerConfiguration
): { isValid: boolean; reason: string } => {
  if (tokens.idTokenPayload) {
    const idTokenPayload = tokens.idTokenPayload;
    // 2: The Issuer Identifier for the OpenID Provider (which is typically obtained during Discovery) MUST exactly match the value of the iss (issuer) Claim.
    if (oidcServerConfiguration.issuer !== idTokenPayload.iss) {
      return { isValid: false, reason: 'Issuer does not match' };
    }
    // 3: The Client MUST validate that the aud (audience) Claim contains its client_id value registered at the Issuer identified by the iss (issuer) Claim as an audience. The aud (audience) Claim MAY contain an array with more than one element. The ID Token MUST be rejected if the ID Token does not list the Client as a valid audience, or if it contains additional audiences not trusted by the Client.

    // 6: If the ID Token is received via direct communication between the Client and the Token Endpoint (which it is in this flow), the TLS server validation MAY be used to validate the issuer in place of checking the token signature. The Client MUST validate the signature of all other ID Tokens according to JWS [JWS] using the algorithm specified in the JWT alg Header Parameter. The Client MUST use the keys provided by the Issuer.

    // 9: The current time MUST be before the time represented by the exp Claim.
    const currentTimeUnixSecond = new Date().getTime() / 1000;
    if (idTokenPayload.exp && idTokenPayload.exp < currentTimeUnixSecond) {
      return { isValid: false, reason: 'Token expired' };
    }
    // 10: The iat Claim can be used to reject tokens that were issued too far away from the current time, limiting the amount of time that nonces need to be stored to prevent attacks. The acceptable range is Client specific.
    const timeInSevenDays = 60 * 60 * 24 * 7;
    if (
      idTokenPayload.iat &&
      idTokenPayload.iat + timeInSevenDays < currentTimeUnixSecond
    ) {
      return { isValid: false, reason: 'Token is used from too long time' };
    }
    // 11: If a nonce value was sent in the Authentication Request, a nonce Claim MUST be present and its value checked to verify that it is the same value as the one that was sent in the Authentication Request. The Client SHOULD check the nonce value for replay attacks. The precise method for detecting replay attacks is Client specific.
    if (idTokenPayload.nonce && idTokenPayload.nonce !== nonce) {
      return { isValid: false, reason: 'Nonce does not match' };
    }
  }
  return { isValid: true, reason: '' };
};

function hideTokens(currentDatabaseElement: OidcConfig) {
  const configurationName = currentDatabaseElement.configurationName;
  return (response: Response) => {
    if (response.status !== 200) {
      return response;
    }
    return response.json().then<Response>((tokens: Tokens) => {
      if (!tokens.issued_at) {
        const currentTimeUnixSecond = new Date().getTime() / 1000;
        tokens.issued_at = currentTimeUnixSecond;
      }

      const accessTokenPayload = extractTokenPayload(tokens.access_token);
      const secureTokens = {
        ...tokens,
        access_token: TOKEN.ACCESS_TOKEN + '_' + configurationName,
        accessTokenPayload,
      };
      tokens.accessTokenPayload = accessTokenPayload;

      let _idTokenPayload = null;
      if (tokens.id_token) {
        _idTokenPayload = extractTokenPayload(tokens.id_token);
        tokens.idTokenPayload = { ..._idTokenPayload };
        if (_idTokenPayload.nonce && currentDatabaseElement.nonce != null) {
          const keyNonce =
            TOKEN.NONCE_TOKEN + '_' + currentDatabaseElement.configurationName;
          _idTokenPayload.nonce = keyNonce;
        }
        secureTokens.idTokenPayload = _idTokenPayload;
      }
      if (tokens.refresh_token) {
        secureTokens.refresh_token =
          TOKEN.REFRESH_TOKEN + '_' + configurationName;
      }

      const idTokenExpiresAt =
        _idTokenPayload && _idTokenPayload.exp
          ? _idTokenPayload.exp
          : Number.MAX_VALUE;
      const accessTokenExpiresAt =
        accessTokenPayload && accessTokenPayload.exp
          ? accessTokenPayload.exp
          : tokens.issued_at + tokens.expires_in;

      let expiresAt: number;
      const tokenRenewMode = (
        currentDatabaseElement.oidcConfiguration as OidcConfiguration
      ).token_renew_mode;
      if (tokenRenewMode === TokenRenewMode.access_token_invalid) {
        expiresAt = accessTokenExpiresAt;
      } else if (tokenRenewMode === TokenRenewMode.id_token_invalid) {
        expiresAt = idTokenExpiresAt;
      } else {
        expiresAt =
          idTokenExpiresAt < accessTokenExpiresAt
            ? idTokenExpiresAt
            : accessTokenExpiresAt;
      }
      secureTokens.expiresAt = expiresAt;

      tokens.expiresAt = expiresAt;
      const nonce = currentDatabaseElement.nonce
        ? currentDatabaseElement.nonce.nonce
        : null;
      const { isValid, reason } = isTokensOidcValid(
        tokens,
        nonce,
        currentDatabaseElement.oidcServerConfiguration as OidcServerConfiguration
      ); //TODO: Type assertion, could be null.
      if (!isValid) {
        throw Error(`Tokens are not OpenID valid, reason: ${reason}`);
      }

      // When refresh_token is not rotated we reuse ald refresh_token
      if (
        currentDatabaseElement.tokens != null &&
        'refresh_token' in currentDatabaseElement.tokens &&
        !('refresh_token' in tokens)
      ) {
        const refreshToken = currentDatabaseElement.tokens.refresh_token;

        currentDatabaseElement.tokens = {
          ...tokens,
          refresh_token: refreshToken,
        };
      } else {
        currentDatabaseElement.tokens = tokens;
      }

      currentDatabaseElement.status = 'LOGGED_IN';
      const body = JSON.stringify(secureTokens);
      return new Response(body, response);
    });
  };
}

export {
  b64DecodeUnicode,
  computeTimeLeft,
  isTokensValid,
  extractTokenPayload,
  isTokensOidcValid,
  hideTokens
};

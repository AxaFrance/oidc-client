import { sleepAsync } from './initWorker.js';

const b64DecodeUnicode = (str) =>
    decodeURIComponent(Array.prototype.map.call(atob(str), (c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
const parseJwt = (token) => JSON.parse(b64DecodeUnicode(token.split('.')[1].replace('-', '+').replace('_', '/')));

const extractTokenPayload = (token) => {
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

const countLetter = (str, find) => {
    return (str.split(find)).length - 1;
};

export type Tokens = {
    refreshToken: string;
    idTokenPayload:any;
    idToken:string;
    accessTokenPayload:any;
    accessToken:string;
    expiresAt: number;
    issuedAt: number;
};

export type TokenRenewModeType = {
    access_token_or_id_token_invalid: string;
    access_token_invalid:string;
    id_token_invalid: string;
}

export const TokenRenewMode = {
    access_token_or_id_token_invalid: 'access_token_or_id_token_invalid',
    access_token_invalid: 'access_token_invalid',
    id_token_invalid: 'id_token_invalid',
};

export const setTokens = (tokens, oldTokens = null, tokenRenewMode: string):Tokens => {
    if (!tokens) {
        return null;
    }
    let accessTokenPayload;

    if (!tokens.issuedAt) {
        const currentTimeUnixSecond = new Date().getTime() / 1000;
        tokens.issuedAt = currentTimeUnixSecond;
    }

    if (tokens.accessTokenPayload !== undefined) {
        accessTokenPayload = tokens.accessTokenPayload;
    } else {
        accessTokenPayload = extractTokenPayload(tokens.accessToken);
    }
    const _idTokenPayload = tokens.idTokenPayload ? tokens.idTokenPayload : extractTokenPayload(tokens.idToken);

    const idTokenExpireAt = (_idTokenPayload && _idTokenPayload.exp) ? _idTokenPayload.exp : Number.MAX_VALUE;
    const accessTokenExpiresAt = (accessTokenPayload && accessTokenPayload.exp) ? accessTokenPayload.exp : tokens.issuedAt + tokens.expiresIn;

    let expiresAt;

    if (tokenRenewMode === TokenRenewMode.access_token_invalid) {
        expiresAt = accessTokenExpiresAt;
    } else if (tokenRenewMode === TokenRenewMode.id_token_invalid) {
        expiresAt = idTokenExpireAt;
    } else {
        expiresAt = idTokenExpireAt < accessTokenExpiresAt ? idTokenExpireAt : accessTokenExpiresAt;
    }

    const newTokens = { ...tokens, idTokenPayload: _idTokenPayload, accessTokenPayload, expiresAt };
    // When refresh_token is not rotated we reuse ald refresh_token
    if (oldTokens != null && 'refreshToken' in oldTokens && !('refreshToken' in tokens)) {
        const refreshToken = oldTokens.refreshToken;
        return { ...newTokens, refreshToken };
    }

    return newTokens;
};

export const parseOriginalTokens = (tokens, oldTokens, tokenRenewMode: string) => {
    if (!tokens) {
        return null;
    }
    if (!tokens.issued_at) {
        const currentTimeUnixSecond = new Date().getTime() / 1000;
        tokens.issued_at = currentTimeUnixSecond;
    }

    const data = {
        accessToken: tokens.access_token,
        expiresIn: tokens.expires_in,
        idToken: tokens.id_token,
        scope: tokens.scope,
        tokenType: tokens.token_type,
        issuedAt: tokens.issued_at,
    };

    if ('refresh_token' in tokens) {
        // @ts-ignore
        data.refreshToken = tokens.refresh_token;
    }

    if (tokens.accessTokenPayload !== undefined) {
        // @ts-ignore
        data.accessTokenPayload = tokens.accessTokenPayload;
    }

    if (tokens.idTokenPayload !== undefined) {
        // @ts-ignore
        data.idTokenPayload = tokens.idTokenPayload;
    }

    return setTokens(data, oldTokens, tokenRenewMode);
};

export const computeTimeLeft = (refreshTimeBeforeTokensExpirationInSecond, expiresAt) => {
    const currentTimeUnixSecond = new Date().getTime() / 1000;
    return Math.round(((expiresAt - refreshTimeBeforeTokensExpirationInSecond) - currentTimeUnixSecond));
};

export const isTokensValid = (tokens) => {
    if (!tokens) {
        return false;
    }
    return computeTimeLeft(0, tokens.expiresAt) > 0;
};

export type ValidToken = {
    isTokensValid: boolean;
    tokens: Tokens;
    numberWaited: number;
}

export interface OidcToken{
    tokens?: Tokens;
}

export const getValidTokenAsync = async (oidc: OidcToken, waitMs = 200, numberWait = 50): Promise<ValidToken> => {
    let numberWaitTemp = numberWait;
    while (!isTokensValid(oidc.tokens) && numberWaitTemp > 0) {
        await sleepAsync(waitMs);
        numberWaitTemp = numberWaitTemp - 1;
    }
    const isValid = isTokensValid(oidc.tokens);
    return {
        isTokensValid: isValid,
        tokens: oidc.tokens,
        numberWaited: numberWaitTemp - numberWait,
    };
};

// https://openid.net/specs/openid-connect-core-1_0.html#IDTokenValidation (excluding rules #1, #4, #5, #7, #8, #12, and #13 which did not apply).
// https://github.com/openid/AppAuth-JS/issues/65
export const isTokensOidcValid = (tokens, nonce, oidcServerConfiguration) => {
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
        if (idTokenPayload.iat && (idTokenPayload.iat + timeInSevenDays) < currentTimeUnixSecond) {
            return { isValid: false, reason: 'Token is used from too long time' };
        }
        // 11: If a nonce value was sent in the Authentication Request, a nonce Claim MUST be present and its value checked to verify that it is the same value as the one that was sent in the Authentication Request. The Client SHOULD check the nonce value for replay attacks. The precise method for detecting replay attacks is Client specific.
        if (idTokenPayload.nonce && idTokenPayload.nonce !== nonce) {
            return { isValid: false, reason: 'Nonce does not match' };
        }
    }
    return { isValid: true, reason: '' };
};

const idTokenPayload = (token) => {
    if(!token){
        return null;
    }
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(jsonPayload);
}

const countLetter = (str, find)=> {
    return (str.split(find)).length - 1;
}

const extractAccessTokenPayload = tokens => {
    if(tokens.accessTokenPayload)
    {
        return tokens.accessTokenPayload;
    }
    const accessToken = tokens.accessToken;
    try{
        if (!accessToken || countLetter(accessToken,'.') !== 2) {
            return null;
        }
        return JSON.parse(atob(accessToken.split('.')[1]));
    } catch (e) {
        console.warn(e);
    }
    return null;
};


export const setTokens = (tokens, oldTokens=null) =>{
    
    if(!tokens){
        return null;
    }
    let accessTokenPayload;

    if(!tokens.issuedAt) {
        const currentTimeUnixSecond = new Date().getTime() /1000;
        tokens.issuedAt = currentTimeUnixSecond;
    }

    if(tokens.accessTokenPayload !== undefined) {
        accessTokenPayload = tokens.accessTokenPayload;
    }
    else {
        accessTokenPayload = extractAccessTokenPayload(tokens);
    }
    const _idTokenPayload = tokens.idTokenPayload ? tokens.idTokenPayload : idTokenPayload(tokens.idToken);

    const idTokenExipreAt =(_idTokenPayload && _idTokenPayload.exp) ? _idTokenPayload.exp: Number.MAX_VALUE;
    const accessTokenExpiresAt =  (accessTokenPayload && accessTokenPayload.exp)? accessTokenPayload.exp : tokens.issuedAt + tokens.expiresIn;
    const expiresAt = idTokenExipreAt < accessTokenExpiresAt ? idTokenExipreAt : accessTokenExpiresAt;
    
    const newTokens = {...tokens, idTokenPayload: _idTokenPayload, accessTokenPayload, expiresAt};
    // When refresh_token is not rotated we reuse ald refresh_token
    if(oldTokens != null && "refreshToken" in oldTokens && !("refreshToken" in tokens)){
        const refreshToken = oldTokens.refreshToken
        return {...newTokens, refreshToken};
    } 
    
    return newTokens;
}



export const parseOriginalTokens= (tokens, oldTokens) =>{
    if(!tokens){
        return null;
    }
    if(!tokens.issued_at) {
        const currentTimeUnixSecond = new Date().getTime() /1000;
        tokens.issued_at = currentTimeUnixSecond;
    }
    
    const data = {
        accessToken: tokens.access_token,
        expiresIn: tokens.expires_in,
        idToken: tokens.id_token,
        scope: tokens.scope,
        tokenType: tokens.token_type,
        issuedAt: tokens.issued_at
    };

    if("refresh_token" in tokens) {
        // @ts-ignore
        data.refreshToken= tokens.refresh_token;
    }


    if(tokens.accessTokenPayload !== undefined){
        // @ts-ignore
        data.accessTokenPayload = tokens.accessTokenPayload;
    }

    if(tokens.idTokenPayload !== undefined){
        // @ts-ignore
        data.idTokenPayload = tokens.idTokenPayload;
    }

    return setTokens(data, oldTokens);
}

export const computeTimeLeft = (refreshTimeBeforeTokensExpirationInSecond, expiresAt)=>{
    const currentTimeUnixSecond = new Date().getTime() /1000;
    return Math.round(((expiresAt - refreshTimeBeforeTokensExpirationInSecond) - currentTimeUnixSecond));
}

export const isTokensValid= (tokens) =>{
    if(!tokens){
        return false;
    }
    return computeTimeLeft(0, tokens.expiresAt) > 0;
}

// https://openid.net/specs/openid-connect-core-1_0.html#IDTokenValidation (excluding rules #1, #4, #5, #7, #8, #12, and #13 which did not apply).
// https://github.com/openid/AppAuth-JS/issues/65
export const isTokensOidcValid =(tokens, nonce, oidcServerConfiguration) =>{
    if(tokens.idTokenPayload) {
        const idTokenPayload = tokens.idTokenPayload;
        // 2: The Issuer Identifier for the OpenID Provider (which is typically obtained during Discovery) MUST exactly match the value of the iss (issuer) Claim.
        if(oidcServerConfiguration.issuer !==  idTokenPayload.iss){
            return false;
        }
        // 3: The Client MUST validate that the aud (audience) Claim contains its client_id value registered at the Issuer identified by the iss (issuer) Claim as an audience. The aud (audience) Claim MAY contain an array with more than one element. The ID Token MUST be rejected if the ID Token does not list the Client as a valid audience, or if it contains additional audiences not trusted by the Client.
        
        // 6: If the ID Token is received via direct communication between the Client and the Token Endpoint (which it is in this flow), the TLS server validation MAY be used to validate the issuer in place of checking the token signature. The Client MUST validate the signature of all other ID Tokens according to JWS [JWS] using the algorithm specified in the JWT alg Header Parameter. The Client MUST use the keys provided by the Issuer.
        
        // 9: The current time MUST be before the time represented by the exp Claim.
        const currentTimeUnixSecond = new Date().getTime() /1000;
        if(idTokenPayload.exp && idTokenPayload.exp < currentTimeUnixSecond) {
            return false;
        }
        // 10: The iat Claim can be used to reject tokens that were issued too far away from the current time, limiting the amount of time that nonces need to be stored to prevent attacks. The acceptable range is Client specific.
        const timeInSevenDays = 60 * 60 * 24 * 7;
        if(idTokenPayload.iat && (idTokenPayload.iat + timeInSevenDays) < currentTimeUnixSecond) {
            return false;
        }
        // 11: If a nonce value was sent in the Authentication Request, a nonce Claim MUST be present and its value checked to verify that it is the same value as the one that was sent in the Authentication Request. The Client SHOULD check the nonce value for replay attacks. The precise method for detecting replay attacks is Client specific.
        if (idTokenPayload.nonce && idTokenPayload.nonce !== nonce) {
            return false;
        }
    }
    return true;
}
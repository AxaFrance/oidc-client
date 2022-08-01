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


export const setTokens = (tokens) =>{
    
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
    const _idTokenPayload = idTokenPayload(tokens.idToken);

    const idTokenExipreAt =(_idTokenPayload && _idTokenPayload.exp) ? _idTokenPayload.exp: Number.MAX_VALUE;
    const accessTokenExpiresAt =  (accessTokenPayload && accessTokenPayload.exp)? accessTokenPayload.exp : tokens.issuedAt + tokens.expiresIn;
    const expiresAt = idTokenExipreAt < accessTokenExpiresAt ? idTokenExipreAt : accessTokenExpiresAt;
    
    return {...tokens, idTokenPayload: _idTokenPayload, accessTokenPayload, expiresAt};
}


export const parseOriginalTokens= (tokens) =>{
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
        refreshToken: tokens.refresh_token,
        scope: tokens.scope,
        tokenType: tokens.token_type,
        issuedAt: tokens.issued_at
    };


    if(tokens.accessTokenPayload !== undefined){
        // @ts-ignore
        data.accessTokenPayload = tokens.accessTokenPayload;
    }

    if(tokens.idTokenPayload !== undefined){
        // @ts-ignore
        data.idTokenPayload = tokens.idTokenPayload;
    }

    return setTokens(data);
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
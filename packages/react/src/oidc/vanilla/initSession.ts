const initCookieHelper = () => {
  
  const set = (name, value, stringify =true) => {
    value = stringify ? JSON.stringify(value) : value
    document.cookie = name + "=" + value + "; path=/";
  }
  
  const get = (name) => {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
  
    for(let i=0;i < ca.length;i++) {
        let c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1,c.length);
        if (c.indexOf(nameEQ) == 0) {
          return c.substring(nameEQ.length,c.length);
        }
    }
    return null;
  }
  
  const erase = (name) => {   
    document.cookie = name +'=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
  }

  const hasJsonStructure = (cookieStr) =>  {
    if (typeof cookieStr !== 'string') return false;
    try {
        const result = JSON.parse(cookieStr);
        const type = Object.prototype.toString.call(result);
        return type === '[object Object]' 
            || type === '[object Array]';
    } catch (err) {
        return false;
    }
  }

  return { set, erase, get, hasJsonStructure };
};

export const initSession = (configurationName, redirectUri, storage =sessionStorage, cookiePath=null) => {
    const cookieHelper = initCookieHelper();

    const saveItemsAsync =(items) =>{
      storage[`oidc_items.${configurationName}:${redirectUri}`] = JSON.stringify(items);
      return Promise.resolve();
    }

    const loadItemsAsync=() =>{
      return Promise.resolve(JSON.parse(storage[`oidc_items.${configurationName}:${redirectUri}`]));
    }

    const clearAsync=(status) => {
        if (!cookiePath) {
          storage[`oidc.${configurationName}:${redirectUri}`] = JSON.stringify({tokens:null, status});
          return Promise.resolve();
        }
      
  
        cookieHelper.set(`${cookiePath}.accessToken`, {tokens:null, status});

        // needed to make logout work
        cookieHelper.erase(`${cookiePath}.accessToken`);
        cookieHelper.erase(`${cookiePath}.idToken`);
        cookieHelper.erase(`${cookiePath}.refreshToken`);
        cookieHelper.erase(`rest`);
        return Promise.resolve();
    }
  

    const initAsync=async () => {

      if(cookiePath && !cookieHelper.get(`${cookiePath}.accessToken`) ) {
          // needed to make logout work(only deleting the cookies leads to screen flash)
          // cookieHelper.set(`${cookiePath}.accessToken`, {tokens:null, status:null});
          return {tokens:null, status:null};
      }

      if (cookiePath) {
        const accessToken = cookieHelper.get(`${cookiePath}.accessToken`);
        const idToken = cookieHelper.get(`${cookiePath}.idToken`);
        const refreshToken = cookieHelper.get(`${cookiePath}.refreshToken`);
        const rest = JSON.parse(cookieHelper.get('rest'));
        
        return Promise.resolve({ tokens : {
          accessToken,
          idToken,
          refreshToken,
          ...rest
        }, status: cookieHelper.hasJsonStructure(accessToken) ? JSON.parse(accessToken).status : null  });
      }

      if(!storage[`oidc.${configurationName}:${redirectUri}`]){
        storage[`oidc.${configurationName}:${redirectUri}`] = JSON.stringify({tokens:null, status:null});
        return {tokens:null, status:null};
      }
      const data = JSON.parse(storage[`oidc.${configurationName}:${redirectUri}`]);
      return Promise.resolve({ tokens : data.tokens, status: data.status });
    }

    const setTokens = (tokens) => {

        if (!cookiePath) {
          storage[`oidc.${configurationName}:${redirectUri}`] = JSON.stringify({tokens});
          return
        }
      
        const { 
          accessToken,
          idToken,
          refreshToken,
          accessTokenPayload,
          expiresIn,
          expiresAt,
          idTokenPayload,
          issuedAt,
          tokenType,
          scope,
        }: {
          [key: string]: string | number | any
        } = {...tokens };

        if (accessToken) cookieHelper.set(`${cookiePath}.accessToken`, accessToken, false);
        if (idToken) cookieHelper.set(`${cookiePath}.idToken`, idToken, false);
        if (refreshToken) cookieHelper.set(`${cookiePath}.refreshToken`, refreshToken, false);
        
        cookieHelper.set('rest', {
          accessTokenPayload,
          expiresIn,
          expiresAt,
          idTokenPayload,
          issuedAt,
          scope,
          tokenType,
        });
    }

    const setSessionState = (sessionState) => {
        storage[`oidc.session_state.${configurationName}:${redirectUri}`] = sessionState;
    }
    
    const getSessionState= () => {
        return storage[`oidc.session_state.${configurationName}:${redirectUri}`];
    }

    const setNonceAsync = (nonce) => {
        localStorage[`oidc.nonce.${configurationName}:${redirectUri}`] = nonce.nonce;
    }

    const getNonceAsync= async () => {
        // @ts-ignore
        const result =  {nonce: localStorage[`oidc.nonce.${configurationName}:${redirectUri}`]};
        return result;
    }

    const getTokens = () => {
        if(cookiePath && !cookieHelper.get(`${cookiePath}.accessToken`)) {
            return null;
        }
        if (cookiePath) {
          const accessToken = cookieHelper.get(`${cookiePath}.accessToken`);
          const idToken = cookieHelper.get(`${cookiePath}.idToken`);
          const refreshToken = cookieHelper.get(`${cookiePath}.refreshToken`);
          const rest = JSON.parse(cookieHelper.get('rest'));

          return JSON.stringify({
            tokens: {
              ...rest,
              accessToken,
              idToken,
              refreshToken
            }
          });
        }

        if(!storage[`oidc.${configurationName}:${redirectUri}`]){
          return null;
        }

        return JSON.stringify({ tokens : JSON.parse(storage[`oidc.${configurationName}:${redirectUri}`]).tokens });
    }

    return {
        saveItemsAsync, 
        loadItemsAsync, 
        clearAsync, 
        initAsync, 
        setTokens, 
        getTokens, 
        setSessionState, 
        getSessionState,
        setNonceAsync,
        getNonceAsync
    };
}

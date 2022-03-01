import { useEffect, useState} from "react";
import Oidc from "./vanilla/oidc";

export const useOidcUser =(configurationName="default") => {
    const [oidcUser, setOidcUser] = useState(null);
    const [isOidcUserLoading, setIsOidcUserLoading] = useState(false);
    const getOidc =  Oidc.get;
    useEffect(() => {
        let isMounted = true;
        const oidc = getOidc(configurationName);
        if(oidc && oidc.tokens) {
            setIsOidcUserLoading(true);
            getOidc().userInfoAsync()
                .then((info) => {
                    if (isMounted) {
                        setOidcUser(info);
                        setIsOidcUserLoading(false);
                    }
                })
        }
        return  () => { isMounted = false };
    }, [])
    
    let isLogged = false;
    const oidc = getOidc(configurationName);
    if(oidc){
        isLogged = oidc.tokens != null;
    }
    
    return {oidcUser, isOidcUserLoading, isLogged: isLogged}
}
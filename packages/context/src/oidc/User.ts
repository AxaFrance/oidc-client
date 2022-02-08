import {useContext, useEffect, useState} from "react";
import {OidcContext} from "./OidcProvider";

export const useOidcUser =(configurationName="default") => {
    const [oidcUser, setOidcUser] = useState(null);
    const [isOidcUserLoading, setIsOidcUserLoading] = useState(false);
    const {getOidc} = useContext(OidcContext);
    useEffect(() => {
        let isMounted = true;
        if(getOidc(configurationName).tokens) {
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
    return {oidcUser, isOidcUserLoading, isLogged: getOidc().tokens != null}
}
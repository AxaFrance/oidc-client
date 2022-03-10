import React, { useEffect, useState, PropsWithChildren} from 'react';
import {getCustomHistory} from "../routes/withRouter";
import AuthenticatingError from "./AuthenticateError.component";
import Oidc from "../../vanilla/oidc";

const CallBackSuccess = () =>  (<div className="oidc-callback">
  <div className="oidc-callback__container">
    <h1 className="oidc-callback__title">Authentification terminée</h1>
    <p className="oidc-callback__content">Vous allez être redirigé sur votre application.</p>
  </div>
</div>);

const CallbackManager: PropsWithChildren<any> = ({callBackError, callBackSuccess, configurationName }) => {
  const getOidc =  Oidc.get;
  const [error, setError] = useState(false);
  const [isLoading, setLoading] = useState(true);

  const CallbackErrorComponent = callBackError || AuthenticatingError;
  const CallbackSuccessComponent = callBackSuccess || CallBackSuccess;
  
  useEffect(() => {
    let isMounted = true;
    const playCallbackAsync = async () => {
     
      try {
        const state = await getOidc(configurationName).loginCallbackWithAutoTokensRenewAsync();
        if (state != null && isMounted) {
          const history = getCustomHistory()
          history.replaceState(decodeURIComponent(state))
        }
      } catch (error) {
        if(isMounted) {
          setLoading(false);
          setError(true);
        }
      }
    };
    playCallbackAsync();
    return  () => {
      isMounted = false;
    };
  },[]);
  
  if(isLoading){
    return null;
  }

  if(error){
    return <CallbackErrorComponent />
  }
  
  return <CallbackSuccessComponent />;
};

export default CallbackManager;

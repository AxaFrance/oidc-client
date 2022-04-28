import React, {useEffect, useState, ComponentType} from 'react';
import {getCustomHistory} from "../routes/withRouter";
import AuthenticatingError from "./AuthenticateError.component";
import Oidc from "../../vanilla/oidc";

export const CallBackSuccess: ComponentType<any> = () =>  (<div className="oidc-callback">
  <div className="oidc-callback__container">
    <h1 className="oidc-callback__title">Authentication complete</h1>
    <p className="oidc-callback__content">You will be redirected to your application.</p>
  </div>
</div>);

const CallbackManager: ComponentType<any> = ({callBackError, callBackSuccess, configurationName }) => {
  const getOidc =  Oidc.get;
  const [error, setError] = useState(false);

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
          setError(true);
        }
      }
    };
    playCallbackAsync();
    return  () => {
      isMounted = false;
    };
  },[]);
  
  if(error){
    return <CallbackErrorComponent configurationName={configurationName} />
  }
  
  return <CallbackSuccessComponent configurationName={configurationName} />;
};

export default CallbackManager;

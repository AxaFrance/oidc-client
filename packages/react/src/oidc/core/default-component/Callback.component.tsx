import React, {useEffect, useState, ComponentType} from 'react';
import AuthenticatingError from "./AuthenticateError.component";
import Oidc from "../../vanilla/oidc";
import {getCustomHistory} from "../routes/withRouter";

export const CallBackSuccess: ComponentType<any> = () =>  (<div className="oidc-callback">
  <div className="oidc-callback__container">
    <h1 className="oidc-callback__title">Authentication complete</h1>
    <p className="oidc-callback__content">You will be redirected to your application.</p>
  </div>
</div>);

const CallbackManager: ComponentType<any> = ({callBackError, callBackSuccess, configurationName, withCustomHistory }) => {

  const [error, setError] = useState(false);
  useEffect(() => {
    let isMounted = true;
    const playCallbackAsync = async () => {
      const getOidc =  Oidc.get;
      try {
        const {callbackPath} = await getOidc(configurationName).loginCallbackWithAutoTokensRenewAsync();
        const history = (withCustomHistory)? withCustomHistory(): getCustomHistory();
        history.replaceState(callbackPath || "/")
      } catch (error) {
          if(isMounted) {
            setError(true);
          }
      }
    };
    playCallbackAsync();
    return () => {
      isMounted = false;
    };
  },[]);

  const CallbackErrorComponent = callBackError || AuthenticatingError;
  const CallbackSuccessComponent = callBackSuccess || CallBackSuccess;

  if(error){
    return <CallbackErrorComponent configurationName={configurationName} />
  }
  
  return <CallbackSuccessComponent configurationName={configurationName} />;
};

export default CallbackManager;

import React, { useEffect, useContext, useState, PropsWithChildren} from 'react';
import  {OidcContext} from "../../OidcProvider";
import withRouter from "../routes/withRouter";

const CallBackSuccess = () =>  (<div className="oidc-callback">
<div className="oidc-callback__container">
  <h1 className="oidc-callback__title">Authentification terminée</h1>
  <p className="oidc-callback__content">Vous allez être redirigé sur votre application.</p>
</div>
</div>);

const CallBackError = () =>  (<div className="oidc-callback">
<div className="oidc-callback__container">
  <h1 className="oidc-callback__title">Authentification terminée</h1>
  <p className="oidc-callback__content">Vous allez être redirigé sur votre application.</p>
</div>
</div>);

const CallbackManager: PropsWithChildren<any> = ({history, callBackError, callBackSuccess }) => { 
  const {getOidc} = useContext(OidcContext);
  const [error, setError] = useState(false);

  const CallbackErrorComponent = callBackError || CallBackError;
  const CallbackSuccessComponent = callBackSuccess || CallBackSuccess;
  
  useEffect(() => {
    const playCallback = async () => {
        try {
          const state = await getOidc().loginCallbackWithAutoTokensRenewAsync();
          if (state != null){
            history.replaceState(decodeURIComponent(state))
          }
          
        } catch (error) {
          setError(true)
        }
      };
      playCallback()
  },[]);

  if(error){
    return <CallbackErrorComponent />
  }
  
  return <CallbackSuccessComponent />;
};

export default withRouter(CallbackManager);

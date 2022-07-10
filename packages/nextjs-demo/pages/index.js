import Head from 'next/head'
import { OidcSecure, useOidcAccessToken, useOidcIdToken, useOidcUser, OidcUserStatus} from '@axa-fr/react-oidc';


const DisplayUserInfo = () => {
  const{ oidcUser, oidcUserLoadingState } = useOidcUser();

  switch (oidcUserLoadingState){
      case OidcUserStatus.Loading:
          return <p>User Information are loading</p>;
      case OidcUserStatus.Unauthenticated:
          return <p>you are not authenticated</p>;
      case OidcUserStatus.LoadingError:
          return <p>Fail to load user information</p>;
      default:
          return (
              <div className="card text-white bg-success mb-3">
                  <div className="card-body">
                      <h5 className="card-title">User information</h5>
                      <p className="card-text">{JSON.stringify(oidcUser)}</p>
                  </div>
              </div>
          );
  }
};

export const Profile = () => {

  return (
     <div className="container mt-3">
         <DisplayAccessToken/>
         <DisplayIdToken/>
         <DisplayUserInfo/>
      </div>
  );
}

const DisplayAccessToken = () => {
  const{ accessToken, accessTokenPayload } = useOidcAccessToken();

  if(!accessToken){
      return <p>you are not authenticated</p>
  }
  return (
      <div className="card text-white bg-info mb-3">
          <div className="card-body">
              <h5 className="card-title">Access Token</h5>
              <p style={{color:'red', "backgroundColor": 'white'}}>Please consider to configure the ServiceWorker in order to protect your application from XSRF attacks. "access_token" and "refresh_token" will never be accessible from your client side javascript.</p>
              {<p className="card-text">Access Token: {JSON.stringify(accessToken)}</p>}
              {accessTokenPayload != null && <p className="card-text">Access Token Payload: {JSON.stringify(accessTokenPayload)}</p>}
          </div>
      </div>
  )
};


const DisplayIdToken =() => {
  const{ idToken, idTokenPayload } = useOidcIdToken();

  if(!idToken){
      return <p>you are not authenticated</p>
  }

  return (
      <div className="card text-white bg-info mb-3">
          <div className="card-body">
              <h5 className="card-title">ID Token</h5>
              {<p className="card-text">IdToken: {JSON.stringify(idToken)}</p>}
              {idTokenPayload != null && <p className="card-text">IdToken Payload: {JSON.stringify(idTokenPayload)}</p>}
          </div>
      </div>
  );
}

export default function Home({}) {


  return (
    <div className="container">
      <Head>
        <title>Create Next App</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
      
        <h1 className="title">
          Welcome to <a href="https://github.com/AxaGuilDEv/react-oidc">Next.js @axa-fr/react-oidc demo!</a>
        </h1>
        <OidcSecure>
           <Profile/>
        </OidcSecure>
      </main>
          
      <footer>

      </footer>

      <style jsx>{`
        .container {
          min-height: 100vh;
          padding: 0 0.5rem;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
        }

        main {
          padding: 5rem 0;
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
        }

        footer {
          width: 100%;
          height: 100px;
          border-top: 1px solid #eaeaea;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        footer img {
          margin-left: 0.5rem;
        }

        footer a {
          display: flex;
          justify-content: center;
          align-items: center;
        }

        a {
          color: inherit;
          text-decoration: none;
        }

        .title a {
          color: #0070f3;
          text-decoration: none;
        }

        .title a:hover,
        .title a:focus,
        .title a:active {
          text-decoration: underline;
        }

        .title {
          margin: 0;
          line-height: 1.15;
          font-size: 4rem;
        }

        .title,
        .description {
          text-align: center;
        }

        .description {
          line-height: 1.5;
          font-size: 1.5rem;
        }

        code {
          background: #fafafa;
          border-radius: 5px;
          padding: 0.75rem;
          font-size: 1.1rem;
          font-family: Menlo, Monaco, Lucida Console, Liberation Mono,
            DejaVu Sans Mono, Bitstream Vera Sans Mono, Courier New, monospace;
        }

        .grid {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-wrap: wrap;

          max-width: 800px;
          margin-top: 3rem;
        }

        .card {
          margin: 1rem;
          flex-basis: 45%;
          padding: 1.5rem;
          text-align: left;
          color: inherit;
          text-decoration: none;
          border: 1px solid #eaeaea;
          border-radius: 10px;
          transition: color 0.15s ease, border-color 0.15s ease;
        }

        .card:hover,
        .card:focus,
        .card:active {
          color: #0070f3;
          border-color: #0070f3;
        }

        .card h3 {
          margin: 0 0 1rem 0;
          font-size: 1.5rem;
        }

        .card p {
          margin: 0;
          font-size: 1.25rem;
          line-height: 1.5;
        }

        .logo {
          height: 1em;
        }

        @media (max-width: 600px) {
          .grid {
            width: 100%;
            flex-direction: column;
          }
        }
      `}</style>

      <style jsx global>{`
        html,
        body {
          padding: 0;
          margin: 0;
          font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto,
            Oxygen, Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue,
            sans-serif;
        }

        * {
          box-sizing: border-box;
        }
      `}</style>
    </div>
  )
}

import Layout from '../components/layout';

Home.getLayout = function getLayout(page) {
  return (
    <Layout>
      {page}
    </Layout>
  )
}
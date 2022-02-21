// __tests__/fetch.test.js
import React from 'react'
import {rest} from 'msw'
import {setupServer} from 'msw/node'
import {render, fireEvent, waitFor, screen} from '@testing-library/react'
import '@testing-library/jest-dom'
import App from "./App";

const server = setupServer(
    rest.get('https://demo.identityserver.io/.well-known/o', (req, res, ctx) => {
        return res(ctx.json({
            "issuer":"https://demo.identityserver.io",
            "jwks_uri":"https://demo.identityserver.io/.well-known/openid-configuration/jwks",
            "authorization_endpoint":"https://demo.identityserver.io/connect/authorize",
            "token_endpoint":"https://demo.identityserver.io/connect/token",
            "userinfo_endpoint":"https://demo.identityserver.io/connect/userinfo",
            "end_session_endpoint":"https://demo.identityserver.io/connect/endsession",
            "check_session_iframe":"https://demo.identityserver.io/connect/checksession",
            "revocation_endpoint":"https://demo.identityserver.io/connect/revocation",
            "introspection_endpoint":"https://demo.identityserver.io/connect/introspect",
            "device_authorization_endpoint":"https://demo.identityserver.io/connect/deviceauthorization","frontchannel_logout_supported":true,"frontchannel_logout_session_supported":true,"backchannel_logout_supported":true,"backchannel_logout_session_supported":true,"scopes_supported":["openid","profile","email","api","api.scope1","api.scope2","scope2","policyserver.runtime","policyserver.management","offline_access"],"claims_supported":["sub","name","family_name","given_name","middle_name","nickname","preferred_username","profile","picture","website","gender","birthdate","zoneinfo","locale","updated_at","email","email_verified"],"grant_types_supported":["authorization_code","client_credentials","refresh_token","implicit","password","urn:ietf:params:oauth:grant-type:device_code"],"response_types_supported":["code","token","id_token","id_token token","code id_token","code token","code id_token token"],"response_modes_supported":["form_post","query","fragment"],"token_endpoint_auth_methods_supported":["client_secret_basic","client_secret_post"],"id_token_signing_alg_values_supported":["RS256"],"subject_types_supported":["public"],"code_challenge_methods_supported":["plain","S256"],"request_parameter_supported":true}))
    }),
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

test('loads and displays greeting', async () => {
    const {debug, getByText, rerender} =render(<App />)
   // debug()

    //rerender(<App/>)
    //rerender(<App/>)
    //await waitFor(() => getByText('Home'));
    
    //fireEvent.click(screen.getByText('Login'));

    //await waitFor(() => screen.getByRole('heading'))

   // expect(screen.getByRole('heading')).toHaveTextContent('hello there')
    //expect(screen.getByRole('button')).toBeDisabled()
})

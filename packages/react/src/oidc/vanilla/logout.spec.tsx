import React from 'react'
import {rest} from 'msw'
import {setupServer} from 'msw/node'
import '@testing-library/jest-dom'
import { logoutAsync } from "./logout";
import { describe, it, expect } from 'vitest';

const server = setupServer(
    rest.post('http://api/connect/revocation', (req, res, ctx) => {
        return res(
            // Respond with a 200 status code
            ctx.status(200),
        )
    }),
    rest.post('http://api/connect/endsession', (req, res, ctx) => {
        return res(
            // Respond with a 200 status code
            ctx.status(200),
        )
    }),
)

// @ts-ignore
const url = "http://dummy.com";
Object.defineProperty(global.window, 'location', {
    value: {
        href: url
    }
});

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('Logout test suite', () => {

    it.each([
        {logout_tokens_to_invalidate:['access_token', 'refresh_token']}, 
        {logout_tokens_to_invalidate:['refresh_token']}, 
        {logout_tokens_to_invalidate:['access_token']}, 
        {logout_tokens_to_invalidate:[]}, 
    ])('Logout should revocate tokens $logout_tokens_to_invalidate', async ({ logout_tokens_to_invalidate}) => {

        const configuration = {
            client_id: 'interactive.public.short',
            redirect_uri: 'http://localhost:4200/authentication/callback',
            scope: 'openid profile email api offline_access',
            authority: 'http://api',
            refresh_time_before_tokens_expiration_in_second: 70,
            logout_tokens_to_invalidate
        };
        
        const oidc = { 
            configuration,
            tokens : {idToken: "abcd", accessToken: "abcd", refreshToken: "abdc" }, 
            initAsync: ()  => Promise.resolve({
                revocationEndpoint: "http://api/connect/revocation",
                endSessionEndpoint: "http://api/connect/endsession",
            }),
            destroyAsync: () => Promise.resolve(),
            logoutSameTabAsync: () => Promise.resolve(),
        };
        const oidcDatabase = {default: () => oidc};

        await logoutAsync(oidc, oidcDatabase)("/logged_out");
        
        // @ts-ignore
        expect(global.window.location.href).toBe("http://api/connect/endsession?id_token_hint=abcd&post_logout_redirect_uri=undefined%2Flogged_out");
    });
});

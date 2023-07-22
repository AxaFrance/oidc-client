import '@testing-library/jest-dom'
import { logoutAsync } from "./logout";
import { describe, it, expect, vi } from 'vitest';

describe('Logout test suite', () => {

    it.each([
        {logout_tokens_to_invalidate:['access_token', 'refresh_token'], expectedResults: ["token=abcd&token_type_hint=access_token&client_id=interactive.public.short","token=abdc&token_type_hint=refresh_token&client_id=interactive.public.short"]}, 
        {logout_tokens_to_invalidate:['refresh_token'], expectedResults: ["token=abdc&token_type_hint=refresh_token&client_id=interactive.public.short"]}, 
        {logout_tokens_to_invalidate:['access_token'], expectedResults: ["token=abcd&token_type_hint=access_token&client_id=interactive.public.short"]}, 
        {logout_tokens_to_invalidate:[], expectedResults: []}, 
    ])('Logout should revoke tokens $logout_tokens_to_invalidate', async ({ logout_tokens_to_invalidate, expectedResults}) => {

        const configuration = {
            client_id: 'interactive.public.short',
            redirect_uri: 'http://localhost:4200/authentication/callback',
            scope: 'openid profile email api offline_access',
            authority: 'http://api',
            refresh_time_before_tokens_expiration_in_second: 70,
            logout_tokens_to_invalidate
        };

        const fetch = (url, data) => {
            if(url === "http://api/connect/revocation") {
                return Promise.resolve({status: 200});
            }
            return Promise.resolve({
                status : 200,
            });
        };

        const mockFetchFn = vi.fn().mockImplementation(fetch)
        
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
        
        const window = {
            location: {
                href: "",
                origin: "http://localhost:4200"
            }
        }

        await logoutAsync(oidc, oidcDatabase, mockFetchFn, window, console)("/logged_out");
        
        // @ts-ignore

        const results =  mockFetchFn.mock.calls.map((call, index) => call[1].body)
    
        expect(results).toEqual(expectedResults);
        expect(window.location.href).toBe("http://api/connect/endsession?id_token_hint=abcd&post_logout_redirect_uri=http%3A%2F%2Flocalhost%3A4200%2Flogged_out");
    });
});

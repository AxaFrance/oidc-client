import {getValidTokenAsync, isTokensOidcValid} from "./parseTokens";

describe('ParseTokens test Suite', () => {
    const currentTimeUnixSecond = new Date().getTime() / 1000;
    describe.each([
        [currentTimeUnixSecond + 120, currentTimeUnixSecond - 10, true],
        [currentTimeUnixSecond - 20, currentTimeUnixSecond - 50, false],
    ])('getValidTokenAsync', (expiresAt, issuedAt, expectIsValidToken) => {
        it('should getValidTokenAsync wait and return value', async () => {
            const oidc = {
                tokens: {
                    refreshToken: 'youhou',
                    idTokenPayload: null,
                    idToken: 'youhou',
                    accessTokenPayload: null,
                    accessToken: 'youhou',
                    expiresAt: expiresAt,
                    issuedAt: issuedAt,
                }
            }
            const result = await getValidTokenAsync(oidc, 1, 1);
            expect(result.isTokensValid).toEqual(expectIsValidToken);
        });
    });


    const idTokenPayload = {iss: "toto", exp: currentTimeUnixSecond +900, iat: currentTimeUnixSecond -900, nonce: "nonce"};
    const oidcServerConfiguration = {issuer:"toto"};
    const idTokenPayloadExpired = {...idTokenPayload, exp: currentTimeUnixSecond-20};
    const idTokenPayloadIssuedTooLongTimeAgo = {...idTokenPayload, iat: currentTimeUnixSecond-20000000};
    
    describe.each([
        [idTokenPayload, "nonce", oidcServerConfiguration, true, "success"],
        [idTokenPayload, "other_nonce", oidcServerConfiguration, false, "bad nonce"],
        [idTokenPayload, "nonce", {issuer:"tutu"}, false, "different issuer"],
        [idTokenPayloadExpired, "nonce", oidcServerConfiguration, false, "id token expired issuer"],
        [idTokenPayloadIssuedTooLongTimeAgo, "nonce", oidcServerConfiguration, false, "id token expired issuer"],
    ])('isTokensOidcValid', (idTokenPayload, nonce, oidcServerConfiguration, expectIsValidToken, status) => {
        it('should isTokensOidcValid return ' + status, async () => {
            const oidc = {
                idTokenPayload
            }
            const {isValid} = await isTokensOidcValid(oidc, nonce, oidcServerConfiguration);
            expect(isValid).toEqual(expectIsValidToken);
        });
    });
    
});

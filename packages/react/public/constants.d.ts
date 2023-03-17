declare const scriptFilename = "OidcTrustedDomains.js";
declare const acceptAnyDomainToken = "*";
type TokenType = {
    readonly REFRESH_TOKEN: string;
    readonly ACCESS_TOKEN: string;
    readonly NONCE_TOKEN: string;
    readonly CODE_VERIFIER: string;
};
declare const TOKEN: TokenType;
type TokenRenewModeType = {
    readonly access_token_or_id_token_invalid: string;
    readonly access_token_invalid: string;
    readonly id_token_invalid: string;
};
declare const TokenRenewMode: TokenRenewModeType;
declare const openidWellknownUrlEndWith = "/.well-known/openid-configuration";
export { scriptFilename, acceptAnyDomainToken, TOKEN, TokenRenewMode, openidWellknownUrlEndWith };
//# sourceMappingURL=constants.d.ts.map
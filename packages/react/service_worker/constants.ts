const scriptFilename = 'OidcTrustedDomains.js'; /* global trustedDomains */
const acceptAnyDomainToken = '*';

type TokenType = {
  readonly REFRESH_TOKEN: string;
  readonly ACCESS_TOKEN: string;
  readonly NONCE_TOKEN: string;
  readonly CODE_VERIFIER: string;
};

const TOKEN: TokenType = {
  REFRESH_TOKEN: 'REFRESH_TOKEN_SECURED_BY_OIDC_SERVICE_WORKER',
  ACCESS_TOKEN: 'ACCESS_TOKEN_SECURED_BY_OIDC_SERVICE_WORKER',
  NONCE_TOKEN: 'NONCE_SECURED_BY_OIDC_SERVICE_WORKER',
  CODE_VERIFIER: 'CODE_VERIFIER_SECURED_BY_OIDC_SERVICE_WORKER',
};

type TokenRenewModeType = {
  readonly access_token_or_id_token_invalid: string;
  readonly access_token_invalid: string;
  readonly id_token_invalid: string;
};

const TokenRenewMode: TokenRenewModeType = {
  access_token_or_id_token_invalid: 'access_token_or_id_token_invalid',
  access_token_invalid: 'access_token_invalid',
  id_token_invalid: 'id_token_invalid',
};

const openidWellknownUrlEndWith = '/.well-known/openid-configuration';

export { scriptFilename, acceptAnyDomainToken, TOKEN, TokenRenewMode, openidWellknownUrlEndWith };

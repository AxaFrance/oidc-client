export type DomainDetails = {
  domains?: Domain[];
  oidcDomains?: Domain[];
  accessTokenDomains?: Domain[];
  showAccessToken: boolean;
  convertAllRequestsToCorsExceptNavigate?: boolean;
  setAccessTokenToNavigateRequests?: boolean;
  demonstratingProofOfPossession?: boolean;
  demonstratingProofOfPossessionOnlyWhenDpopHeaderPresent?: boolean;
  demonstratingProofOfPossessionConfiguration?: DemonstratingProofOfPossessionConfiguration;
  allowMultiTabLogin?: boolean;
};

export interface DemonstratingProofOfPossessionConfiguration {
  generateKeyAlgorithm: RsaHashedKeyGenParams | EcKeyGenParams;
  digestAlgorithm: AlgorithmIdentifier;
  importKeyAlgorithm:
    | AlgorithmIdentifier
    | RsaHashedImportParams
    | EcKeyImportParams
    | HmacImportParams
    | AesKeyAlgorithm;
  signAlgorithm: AlgorithmIdentifier | RsaPssParams | EcdsaParams;
  jwtHeaderAlgorithm: string;
}

export type Domain = string | RegExp;

export type TrustedDomains = {
  [key: string]: Domain[] | DomainDetails;
} | null;

export type OidcServerConfiguration = {
  revocationEndpoint: string;
  issuer: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  userInfoEndpoint: string;
};

export type OidcConfiguration = {
  token_renew_mode: string;
  demonstrating_proof_of_possession: boolean;
};

// Uncertain why the Headers interface in lib.webworker.d.ts does not have a keys() function, so extending
export interface FetchHeaders extends Headers {
  keys(): string[];
}

export type Status =
  | 'LOGGED'
  | 'LOGGED_IN'
  | 'LOGGED_OUT'
  | 'NOT_CONNECTED'
  | 'LOGOUT_FROM_ANOTHER_TAB'
  | 'SESSION_LOST'
  | 'REQUIRE_SYNC_TOKENS'
  | 'FORCE_REFRESH'
  | null;
export type MessageEventType =
  | 'clear'
  | 'init'
  | 'setState'
  | 'getState'
  | 'setCodeVerifier'
  | 'getCodeVerifier'
  | 'setSessionState'
  | 'getSessionState'
  | 'setNonce'
  | 'getNonce'
  | 'setDemonstratingProofOfPossessionNonce'
  | 'getDemonstratingProofOfPossessionNonce'
  | 'setDemonstratingProofOfPossessionJwk'
  | 'getDemonstratingProofOfPossessionJwk';

export type MessageData = {
  status: Status;
  oidcServerConfiguration: OidcServerConfiguration;
  oidcConfiguration: OidcConfiguration;
  where: string;
  state: string;
  codeVerifier: string;
  sessionState: string;
  demonstratingProofOfPossessionNonce: string;
  demonstratingProofOfPossessionJwkJson: string;
  nonce: Nonce;
};

export type MessageEventData = {
  configurationName: string;
  tabId: string;
  type: MessageEventType;
  data: MessageData;
};

export type Nonce = {
  nonce: string;
} | null;

export type OidcConfig = {
  demonstratingProofOfPossessionConfiguration: DemonstratingProofOfPossessionConfiguration | null;
  configurationName: string;
  tokens: Tokens | null;
  status: Status;
  state: Record<string, string | null>;
  codeVerifier: Record<string, string | null>;
  nonce: Record<string, Nonce>;
  oidcServerConfiguration: OidcServerConfiguration | null;
  oidcConfiguration?: OidcConfiguration;
  sessionState?: string | null;
  items?: MessageData;
  hideAccessToken: boolean;
  convertAllRequestsToCorsExceptNavigate: boolean;
  setAccessTokenToNavigateRequests: boolean;
  demonstratingProofOfPossessionNonce: string | null;
  demonstratingProofOfPossessionJwkJson: string | null;
  demonstratingProofOfPossessionOnlyWhenDpopHeaderPresent: boolean;
  allowMultiTabLogin: boolean;
};

export type IdTokenPayload = {
  iss: string;
  /**
   * (Expiration Time) Claim
   */
  exp: number;
  /**
   * (Issued At) Claim
   */
  iat: number;
  nonce: string | null;
};

export type AccessTokenPayload = {
  exp: number;
  sub: string;
  iat: number;
};

export type Tokens = {
  issued_at: number | string;
  access_token: string;
  accessTokenPayload: AccessTokenPayload | null;
  id_token: null | string;
  idTokenPayload: IdTokenPayload;
  refresh_token?: string;
  expiresAt: number;
  expires_in: number | string;
};

export type Database = {
  [key: string]: OidcConfig;
};

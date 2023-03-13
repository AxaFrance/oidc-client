import { vi } from 'vitest';
import {
  AccessTokenPayload,
  IdTokenPayload,
  Nonce,
  OidcConfig,
  OidcConfiguration,
  OidcServerConfiguration,
  Status,
  Tokens,
} from '../../types';

const currentTimeUnixSeconds = (): number => {
  return new Date().getTime() / 1000;
};

const createToken = (expires: number, issued_at: number): Tokens => {
  return {
    expiresAt: expires,
    issued_at: issued_at,
    expires_in: 60,
    id_token: null,
    accessTokenPayload: null,
    access_token: '',
    idTokenPayload: { iss: '', exp: 0, iat: 0, nonce: null },
  };
};

class TokenBuilder {
  private tokens: Tokens = {
    expiresAt: 0,
    issued_at: 0,
    expires_in: 0,
    id_token: null,
    accessTokenPayload: null,
    access_token: '',
    idTokenPayload: { iss: '', exp: 0, iat: 0, nonce: null },
  };

  constructor() {}

  public withExpiredToken(): TokenBuilder {
    this.withExpiresIn(currentTimeUnixSeconds() - 10);
    this.withIssuedAt(currentTimeUnixSeconds() - 60);
    return this;
  }
  public WithNonExpiredToken(): TokenBuilder {
    this.withExpiresAt(currentTimeUnixSeconds() + 60);
    this.withExpiresIn(currentTimeUnixSeconds() + 60);
    this.withIssuedAt(currentTimeUnixSeconds() - 60);
    return this;
  }

  public withExpiresAt(expiresAt: number): TokenBuilder {
    this.tokens.expiresAt = expiresAt;
    return this;
  }

  public withIssuedAt(issued_at: number): TokenBuilder {
    this.tokens.issued_at = issued_at;
    return this;
  }

  public withExpiresIn(expires_in: number): TokenBuilder {
    this.tokens.expires_in = expires_in;
    return this;
  }

  public withIdToken(id_token: string): TokenBuilder {
    this.tokens.id_token = id_token;
    return this;
  }

  public withAccessTokenPayload(
    accessTokenPayload: AccessTokenPayload
  ): TokenBuilder {
    this.tokens.accessTokenPayload = accessTokenPayload;
    return this;
  }

  public withAccessToken(access_token: string): TokenBuilder {
    this.tokens.access_token = access_token;
    return this;
  }

  public withIdTokenPayload(idTokenPayload: IdTokenPayload): TokenBuilder {
    this.tokens.idTokenPayload = idTokenPayload;
    return this;
  }

  public build(): Tokens {
    return this.tokens;
  }
}

class OidcConfigurationBuilder {
  private oidcConfiguration: OidcConfiguration = {
    token_renew_mode: 'offline',
    service_worker_convert_all_requests_to_cors: true,
  };

  constructor() {}

  public withTokenRenewMode(
    token_renew_mode: string
  ): OidcConfigurationBuilder {
    this.oidcConfiguration.token_renew_mode = token_renew_mode;
    return this;
  }

  public withServiceWorkerConvertAllRequestsToCors(
    service_worker_convert_all_requests_to_cors: boolean
  ): OidcConfigurationBuilder {
    this.oidcConfiguration.service_worker_convert_all_requests_to_cors =
      service_worker_convert_all_requests_to_cors;
    return this;
  }

  public build(): OidcConfiguration {
    return this.oidcConfiguration;
  }
}

class OidcConfigBuilder {
  private oidcConfig: OidcConfig = {
    configurationName: '',
    tokens: null,
    status: 'NOT_CONNECTED',
    state: '',
    codeVerifier: '',
    nonce: null,
    oidcServerConfiguration: null,
    oidcConfiguration: undefined,
    sessionState: null,
    items: undefined,
  };

  constructor() {}

  public withTestingDefault(): OidcConfigBuilder {
    this.oidcConfig.configurationName = 'test';
    this.oidcConfig.tokens = new TokenBuilder().WithNonExpiredToken().build();
    this.oidcConfig.status = 'NOT_CONNECTED';
    this.oidcConfig.state = 'state';
    this.oidcConfig.codeVerifier = 'codeVerifier';
    this.oidcConfig.nonce = null;
    this.oidcConfig.oidcConfiguration = new OidcConfigurationBuilder().build();
    this.oidcConfig.oidcServerConfiguration = new OidcServerConfigBuilder()
      .withTestingDefault()
      .build();
    this.oidcConfig.sessionState = null;
    this.oidcConfig.items = undefined;
    return this;
  }

  public withConfigurationName(configurationName: string): OidcConfigBuilder {
    this.oidcConfig.configurationName = configurationName;
    return this;
  }

  public withTokens(tokens: Tokens): OidcConfigBuilder {
    this.oidcConfig.tokens = tokens;
    return this;
  }

  public withStatus(status: Status): OidcConfigBuilder {
    this.oidcConfig.status = status;
    return this;
  }

  public withState(state: string): OidcConfigBuilder {
    this.oidcConfig.state = state;
    return this;
  }

  public withCodeVerifier(codeVerifier: string): OidcConfigBuilder {
    this.oidcConfig.codeVerifier = codeVerifier;
    return this;
  }

  public withNonce(nonce: Nonce): OidcConfigBuilder {
    this.oidcConfig.nonce = nonce;
    return this;
  }

  public withOidcServerConfiguration(
    oidcServerConfiguration: OidcServerConfiguration
  ): OidcConfigBuilder {
    this.oidcConfig.oidcServerConfiguration = oidcServerConfiguration;
    return this;
  }
  public build() {
    return this.oidcConfig;
  }
}

class OidcServerConfigBuilder {
  private oidcServerConfig: OidcServerConfiguration = {
    revocationEndpoint: '',
    issuer: '',
    authorizationEndpoint: '',
    tokenEndpoint: '',
    userInfoEndpoint: '',
  };

  constructor() {}

  public withTestingDefault(): OidcServerConfigBuilder {
    this.oidcServerConfig.revocationEndpoint =
      'http://localhost:3000/revocation';
    this.oidcServerConfig.issuer = 'http://localhost:3000';
    this.oidcServerConfig.authorizationEndpoint =
      'http://localhost:3000/authorization';
    this.oidcServerConfig.tokenEndpoint = 'http://localhost:3000/token';
    this.oidcServerConfig.userInfoEndpoint = 'http://localhost:3000/userinfo';
    return this;
  }

  public withRevocationEndpoint(
    revocationEndpoint: string
  ): OidcServerConfigBuilder {
    this.oidcServerConfig.revocationEndpoint = revocationEndpoint;
    return this;
  }

  public withIssuer(issuer: string): OidcServerConfigBuilder {
    this.oidcServerConfig.issuer = issuer;
    return this;
  }

  public withAuthorizationEndpoint(
    authorizationEndpoint: string
  ): OidcServerConfigBuilder {
    this.oidcServerConfig.authorizationEndpoint = authorizationEndpoint;
    return this;
  }

  public withTokenEndpoint(tokenEndpoint: string): OidcServerConfigBuilder {
    this.oidcServerConfig.tokenEndpoint = tokenEndpoint;
    return this;
  }

  public withUserInfoEndpoint(
    userInfoEndpoint: string
  ): OidcServerConfigBuilder {
    this.oidcServerConfig.userInfoEndpoint = userInfoEndpoint;
    return this;
  }

  public build(): OidcServerConfiguration {
    return this.oidcServerConfig;
  }
}

interface TestingResponse extends Response {
  bodyContent?: any;
}

class ResponseBuilder {
  private response: any = {
    status: 200,
    body: '',
    headers: {},
    bodyContent: { issued_at: 343434 },
  };

  constructor() {}

  public withStatus(status: number): ResponseBuilder {
    this.response.status = status;
    return this;
  }

  public withBody(body: string): ResponseBuilder {
    this.response.body = body;
    return this;
  }

  public withHeaders(headers: Headers): ResponseBuilder {
    this.response.headers = headers;
    return this;
  }

  /**
   * Custom property for Testing setup
   * @param body
   * @returns
   */
  public withBodyContent(body: any): ResponseBuilder {
    this.response.bodyContent = body;
    return this;
  }

  public build(): TestingResponse {
    return {
      ...{
        status: 200,
        headers: {
          append: vi.fn(),
          delete: vi.fn(),
          forEach: vi.fn(),
          get: vi.fn(),
          has: vi.fn(),
          set: vi.fn(),
        },
        ok: true,
        redirected: false,
        statusText: '',
        type: 'basic',
        url: '',
        clone: function (): Response {
          throw new Error('Function not implemented.');
        },
        body: null,
        bodyUsed: false,
        arrayBuffer: function (): Promise<ArrayBuffer> {
          throw new Error('Function not implemented.');
        },
        blob: function (): Promise<Blob> {
          throw new Error('Function not implemented.');
        },
        formData: function (): Promise<FormData> {
          throw new Error('Function not implemented.');
        },
        json: function (): Promise<any> {
          return new Promise<any>((resolve) => {
            resolve(this.bodyContent);
          });
        },
        text: function (): Promise<string> {
          throw new Error('Function not implemented.');
        },
      },
      ...this.response,
    } as TestingResponse;
  }
}

export {
  currentTimeUnixSeconds,
  createToken,
  TokenBuilder,
  OidcServerConfigBuilder,
  OidcConfigBuilder,
  ResponseBuilder,
};

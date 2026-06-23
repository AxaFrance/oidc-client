import { OidcUserInfo } from '@axa-fr/oidc-client';
import { FC, PropsWithChildren, useEffect, useMemo, useRef } from 'react';

import {
  OidcClientLike,
  registerMockOidcClient,
  unregisterMockOidcClient,
} from './oidcClientRegistry.js';

/**
 * Tokens exposed by a mock OIDC client. Shape matches the subset of the
 * real `Tokens` object consumed by the React hooks.
 */
export interface OidcMockTokens {
  accessToken?: string | null;
  accessTokenPayload?: unknown;
  idToken?: string | null;
  idTokenPayload?: unknown;
}

/**
 * Declarative description of the OIDC state you want the hooks to
 * observe in a test or Storybook story.
 */
export interface OidcMockValue<T extends OidcUserInfo = OidcUserInfo> {
  /** Whether the simulated session is authenticated. Defaults to `false`. */
  isAuthenticated?: boolean;
  /** Convenience shortcut – sets `tokens.accessToken`. */
  accessToken?: string | null;
  /** Convenience shortcut – sets `tokens.accessTokenPayload`. */
  accessTokenPayload?: unknown;
  /** Convenience shortcut – sets `tokens.idToken`. */
  idToken?: string | null;
  /** Convenience shortcut – sets `tokens.idTokenPayload`. */
  idTokenPayload?: unknown;
  /** Full tokens object. When provided, takes precedence over the convenience props. */
  tokens?: OidcMockTokens | null;
  /** User info returned by `useOidcUser`. */
  user?: T | null;
  /** Whether DPoP support should be advertised on the mock configuration. */
  demonstrating_proof_of_possession?: boolean;
  /** Optional overrides for the async OIDC client methods. */
  loginAsync?: (...args: unknown[]) => Promise<unknown>;
  logoutAsync?: (...args: unknown[]) => Promise<unknown>;
  renewTokensAsync?: (...args: unknown[]) => Promise<unknown>;
}

export interface OidcMockProviderProps<T extends OidcUserInfo = OidcUserInfo> {
  /** OIDC configuration name to mock. Defaults to `"default"`. */
  configurationName?: string;
  /** Declarative description of the mocked state. */
  value?: OidcMockValue<T>;
}

const buildTokens = (value: OidcMockValue): OidcMockTokens | null => {
  if (value.tokens !== undefined) {
    return value.tokens;
  }
  if (value.isAuthenticated === false) {
    return null;
  }
  const hasAnyToken =
    value.accessToken != null ||
    value.idToken != null ||
    value.accessTokenPayload != null ||
    value.idTokenPayload != null;
  if (value.isAuthenticated || hasAnyToken) {
    return {
      accessToken: value.accessToken ?? null,
      accessTokenPayload: value.accessTokenPayload ?? null,
      idToken: value.idToken ?? null,
      idTokenPayload: value.idTokenPayload ?? null,
    };
  }
  return null;
};

/**
 * Builds an in-memory mock OIDC client that satisfies the subset of the
 * {@link OidcClient} API consumed by the React hooks
 * (`useOidc`, `useOidcAccessToken`, `useOidcIdToken`, `useOidcUser`,
 * `useOidcFetch`, `OidcSecure`).
 *
 * Exposed separately from {@link OidcMockProvider} so consumers can
 * register it manually (e.g. in test setup files or Storybook decorators)
 * via {@link registerMockOidcClient}.
 */
export const createMockOidcClient = <T extends OidcUserInfo = OidcUserInfo>(
  value: OidcMockValue<T> = {},
): OidcClientLike => {
  const tokens = buildTokens(value);
  const user = value.user ?? null;
  const subscribers = new Map<string, (name: string, data: unknown) => void>();
  let subscriptionId = 0;

  const passthroughFetch = (fetch: typeof globalThis.fetch): typeof globalThis.fetch => fetch;

  return {
    tokens,
    configuration: {
      demonstrating_proof_of_possession: value.demonstrating_proof_of_possession ?? false,
    },
    userInfo: () => user,
    userInfoAsync: async () => user,
    subscribeEvents: (func: (name: string, data: unknown) => void) => {
      const id = `mock-${++subscriptionId}`;
      subscribers.set(id, func);
      return id;
    },
    removeEventSubscription: (id: string) => {
      subscribers.delete(id);
    },
    publishEvent: (name: string, data: unknown) => {
      subscribers.forEach(func => func(name, data));
    },
    loginAsync: value.loginAsync ?? (async () => undefined),
    logoutAsync: value.logoutAsync ?? (async () => undefined),
    renewTokensAsync: value.renewTokensAsync ?? (async () => tokens),
    tryKeepExistingSessionAsync: async () => tokens != null,
    fetchWithTokens: passthroughFetch,
    generateDemonstrationOfProofOfPossessionAsync: async () => '',
  } as OidcClientLike;
};

/**
 * React component that registers a mock OIDC client for the duration of
 * its lifetime, so that descendants using `useOidc`, `useOidcUser`,
 * `useOidcAccessToken`, `useOidcIdToken`, `useOidcFetch` or `OidcSecure`
 * observe the simulated state without needing a real `OidcProvider`.
 *
 * The mock client takes precedence over any real client registered for
 * the same `configurationName`. Use this in unit tests, Storybook stories,
 * or any other environment where you want to control the OIDC state.
 *
 * @example
 * ```tsx
 * <OidcMockProvider
 *   configurationName="default"
 *   value={{ isAuthenticated: true, user: { sub: '123', name: 'Jane' } }}
 * >
 *   <MyAuthenticatedComponent />
 * </OidcMockProvider>
 * ```
 */
export const OidcMockProvider = <T extends OidcUserInfo = OidcUserInfo>({
  configurationName = 'default',
  value,
  children,
}: PropsWithChildren<OidcMockProviderProps<T>>): ReturnType<FC> => {
  // Recompute the mock client whenever the supplied value changes so the
  // simulated state stays in sync with the props.
  const client = useMemo(() => createMockOidcClient<T>(value), [value]);

  // Register synchronously during render so descendants observe the mock
  // client on their very first render (before any effect runs).
  registerMockOidcClient(configurationName, client);

  // Keep a reference to the previously registered configuration name to
  // clean it up if the prop changes.
  const previousConfigurationNameRef = useRef<string>(configurationName);

  useEffect(() => {
    const previous = previousConfigurationNameRef.current;
    if (previous !== configurationName) {
      unregisterMockOidcClient(previous);
      previousConfigurationNameRef.current = configurationName;
    }
    registerMockOidcClient(configurationName, client);
    return () => {
      unregisterMockOidcClient(configurationName);
    };
  }, [configurationName, client]);

  return <>{children}</>;
};

export default OidcMockProvider;

import { OidcClient } from '@axa-fr/oidc-client';

/**
 * Minimal duck-typed shape used by the React hooks. Any object that
 * implements (at least) these members can be supplied as a mock client
 * through {@link registerMockOidcClient} / {@link OidcMockProvider}.
 *
 * The real {@link OidcClient} naturally satisfies this contract, which is
 * why hooks can treat both the same way.
 */
export type OidcClientLike = OidcClient | Record<string, unknown>;

const mockClients = new Map<string, OidcClientLike>();
const warnedConfigurations = new Set<string>();

/**
 * Registers a mock OIDC client for the given configuration name.
 *
 * Mock clients take precedence over real clients registered via
 * {@link OidcClient.getOrCreate}, which makes it easy to override the
 * behavior of the hooks in tests and Storybook stories without touching
 * the global OIDC database used by {@link OidcProvider}.
 *
 * Prefer using the {@link OidcMockProvider} component when possible, which
 * takes care of registering and unregistering the mock client around the
 * subtree that needs it.
 */
export const registerMockOidcClient = (configurationName: string, client: OidcClientLike): void => {
  mockClients.set(configurationName, client);
};

/**
 * Removes a previously registered mock OIDC client.
 */
export const unregisterMockOidcClient = (configurationName: string): void => {
  mockClients.delete(configurationName);
};

const isProduction = (): boolean => {
  try {
    const proc = (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process;
    return proc?.env?.NODE_ENV === 'production';
  } catch {
    return false;
  }
};

const warnMissingProvider = (configurationName: string): void => {
  if (warnedConfigurations.has(configurationName)) {
    return;
  }
  warnedConfigurations.add(configurationName);
  if (isProduction()) {
    return;
  }

  console.warn(
    `[react-oidc] No OidcProvider was found for configuration "${configurationName}". ` +
      'Hooks will return unauthenticated defaults. ' +
      'This is expected in tests and Storybook. In production, make sure to wrap your ' +
      'application with <OidcProvider> or use <OidcMockProvider> for mocked rendering.',
  );
};

/**
 * Returns the OIDC client registered for the given configuration name, or
 * `null` when none is available.
 *
 * Lookup order:
 * 1. A mock client registered via {@link registerMockOidcClient} (or
 *    {@link OidcMockProvider}).
 * 2. The real client managed by {@link OidcProvider} (via
 *    {@link OidcClient.get}).
 *
 * Unlike {@link OidcClient.get}, this helper never throws when no client
 * has been registered – it returns `null` and emits a one-time
 * development warning. Callers are expected to treat the `null` case as
 * an unauthenticated state.
 */
export const tryGetOidcClient = (configurationName: string): OidcClientLike | null => {
  const mock = mockClients.get(configurationName);
  if (mock) {
    return mock;
  }

  try {
    const client = OidcClient.get(configurationName);
    if (client) {
      return client;
    }
  } catch {
    // OidcClient.get throws when the library is not initialized for this
    // configuration. We swallow the error and fall through so the hooks
    // can render a safe unauthenticated state.
  }

  warnMissingProvider(configurationName);
  return null;
};

/**
 * Resets the internal "missing provider" warning cache. Intended for use
 * by unit tests that exercise the warning behavior.
 */
export const __resetOidcClientRegistryForTests = (): void => {
  mockClients.clear();
  warnedConfigurations.clear();
};

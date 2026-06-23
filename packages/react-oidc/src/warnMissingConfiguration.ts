const warnedConfigurations = new Set<string>();

/**
 * Emits a `console.warn` once per `configurationName` when an OIDC hook is
 * used without a matching `<OidcProvider>`. Introduced for issue #1679 so
 * that consumers get a clear, non-fatal signal in tests and Storybook.
 *
 * Exported for testing purposes.
 */
export const warnMissingConfigurationOnce = (configurationName: string): void => {
  if (warnedConfigurations.has(configurationName)) {
    return;
  }
  warnedConfigurations.add(configurationName);
  console.warn(
    `@axa-fr/react-oidc: no OIDC configuration found for "${configurationName}". ` +
      `Make sure to wrap your component tree with <OidcProvider configurationName="${configurationName}">. ` +
      `Hooks are returning safe default values (issue #1679).`,
  );
};

/**
 * Resets the internal set of already-warned configuration names. Intended
 * for tests only.
 */
export const resetWarnedConfigurations = (): void => {
  warnedConfigurations.clear();
};

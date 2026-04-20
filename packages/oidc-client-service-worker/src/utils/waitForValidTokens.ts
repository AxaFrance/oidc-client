import { OidcConfig } from '../types';
import { sleep } from './sleep';
import { isTokensValid } from './tokens';

export const TOKEN_RENEWAL_TIMEOUT_MS = 5000;
export const TOKEN_RENEWAL_POLL_INTERVAL_MS = 200;

/**
 * Polls until the tokens in the given config are valid, or until a timeout elapses.
 *
 * @returns `null` when tokens become valid; a synthetic 401 `Response` on timeout or
 *          when the tokens are cleared while waiting (e.g. due to a parallel logout).
 */
export async function waitForValidTokens(
  config: OidcConfig,
  maxWaitMs = TOKEN_RENEWAL_TIMEOUT_MS,
  pollIntervalMs = TOKEN_RENEWAL_POLL_INTERVAL_MS,
): Promise<Response | null> {
  const startTime = Date.now();
  while (config.tokens && !isTokensValid(config.tokens)) {
    if (Date.now() - startTime >= maxWaitMs) {
      return new Response(null, {
        status: 401,
        statusText: 'Token expired - service worker renewal timeout',
      });
    }
    await sleep(pollIntervalMs);
  }

  if (!config.tokens?.access_token) {
    return new Response(null, {
      status: 401,
      statusText: 'Missing access token',
    });
  }

  return null;
}

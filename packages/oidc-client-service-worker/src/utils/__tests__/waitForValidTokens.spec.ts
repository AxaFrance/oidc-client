import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { waitForValidTokens } from '../waitForValidTokens';
import { OidcConfigBuilder, TokenBuilder } from './testHelper';

describe('waitForValidTokens', () => {
  beforeEach(() => {
    // Fake all timers including Date so that Date.now() advances with the clock
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns null immediately when tokens are already valid', async () => {
    const config = new OidcConfigBuilder()
      .withTestingDefault()
      .withTokens(new TokenBuilder().withNonExpiredToken().withAccessToken('valid-token').build())
      .build();

    const result = await waitForValidTokens(config);

    expect(result).toBeNull();
  });

  it('returns null when tokens become valid before the timeout', async () => {
    const config = new OidcConfigBuilder()
      .withTestingDefault()
      .withTokens(new TokenBuilder().withExpiredToken().withAccessToken('expired-token').build())
      .build();

    const resultPromise = waitForValidTokens(config, 5000, 200);

    // Let the first poll complete
    await vi.advanceTimersByTimeAsync(200);
    // Simulate a successful token renewal
    config.tokens = new TokenBuilder()
      .withNonExpiredToken()
      .withAccessToken('renewed-token')
      .build();
    await vi.advanceTimersByTimeAsync(200);

    const result = await resultPromise;

    expect(result).toBeNull();
  });

  it('returns 401 with timeout statusText when tokens remain expired past maxWaitMs', async () => {
    const config = new OidcConfigBuilder()
      .withTestingDefault()
      .withTokens(new TokenBuilder().withExpiredToken().withAccessToken('expired-token').build())
      .build();

    const resultPromise = waitForValidTokens(config, 1000, 200);

    // Advance past maxWaitMs=1000ms so the elapsed-time check triggers the timeout response
    await vi.advanceTimersByTimeAsync(1200);

    const result = await resultPromise;

    expect(result).not.toBeNull();
    expect(result?.status).toBe(401);
    expect(result?.statusText).toBe('Token expired - service worker renewal timeout');
  });

  it('returns 401 with missing-token statusText when tokens are cleared during the wait', async () => {
    const config = new OidcConfigBuilder()
      .withTestingDefault()
      .withTokens(new TokenBuilder().withExpiredToken().withAccessToken('expired-token').build())
      .build();

    const resultPromise = waitForValidTokens(config, 5000, 200);

    // Let the first poll complete while tokens are still expired
    await vi.advanceTimersByTimeAsync(200);
    // Simulate a parallel logout clearing the tokens
    config.tokens = null;
    // Let the second poll run so the loop can observe the cleared tokens
    await vi.advanceTimersByTimeAsync(200);

    const result = await resultPromise;

    expect(result).not.toBeNull();
    expect(result?.status).toBe(401);
    expect(result?.statusText).toBe('Missing access token');
  });
});

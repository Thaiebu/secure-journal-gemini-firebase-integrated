import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { checkRateLimit, clearRateLimits } from '../../src/utils';

describe('checkRateLimit (Sliding-Window In-Memory Rate Limiter)', () => {
  beforeEach(() => {
    clearRateLimits();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('RL-01: allows first request without error', () => {
    expect(() => checkRateLimit('user-1', '/api/journal', 5, 60)).not.toThrow();
  });

  it('RL-02: allows requests up to maxCalls - 1', () => {
    const maxCalls = 5;
    for (let i = 0; i < maxCalls - 1; i++) {
      expect(() => checkRateLimit('user-1', '/api/journal', maxCalls, 60)).not.toThrow();
    }
  });

  it('RL-03: throws 429 when maxCalls threshold is reached', () => {
    const maxCalls = 3;
    // Consume 3 allowed calls
    checkRateLimit('user-2', '/api/journal', maxCalls, 60);
    checkRateLimit('user-2', '/api/journal', maxCalls, 60);
    checkRateLimit('user-2', '/api/journal', maxCalls, 60);

    // 4th call must throw 429
    expect(() => checkRateLimit('user-2', '/api/journal', maxCalls, 60)).toThrowError(
      /Rate limit exceeded/
    );

    try {
      checkRateLimit('user-2', '/api/journal', maxCalls, 60);
    } catch (err: any) {
      expect(err.statusCode).toBe(429);
      expect(err.code).toBe('RATE_LIMIT_EXCEEDED');
    }
  });

  it('RL-04: window resets after windowSeconds elapses', () => {
    const maxCalls = 2;
    checkRateLimit('user-3', '/api/journal', maxCalls, 60);
    checkRateLimit('user-3', '/api/journal', maxCalls, 60);

    // Over limit
    expect(() => checkRateLimit('user-3', '/api/journal', maxCalls, 60)).toThrow();

    // Fast-forward 61 seconds
    vi.advanceTimersByTime(61 * 1000);

    // Should now succeed
    expect(() => checkRateLimit('user-3', '/api/journal', maxCalls, 60)).not.toThrow();
  });

  it('RL-05: isolates limits per uid and endpoint', () => {
    const maxCalls = 2;
    checkRateLimit('user-a', '/api/journal', maxCalls, 60);
    checkRateLimit('user-a', '/api/journal', maxCalls, 60);
    expect(() => checkRateLimit('user-a', '/api/journal', maxCalls, 60)).toThrow();

    // user-b should still be allowed
    expect(() => checkRateLimit('user-b', '/api/journal', maxCalls, 60)).not.toThrow();

    // user-a on a different endpoint should also be allowed
    expect(() => checkRateLimit('user-a', '/api/notifications/settings', maxCalls, 60)).not.toThrow();
  });
});

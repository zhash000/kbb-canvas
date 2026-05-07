import { describe, expect, test } from "vitest";

import {
  computeRetryDelay,
  getRetryDecision,
  shouldRetryByStatus,
} from "../src/retry/retry-policy.js";

describe("retry policy", () => {
  test("backs off exponentially", () => {
    expect(computeRetryDelay(0, 500)).toBe(500);
    expect(computeRetryDelay(1, 500)).toBe(1000);
    expect(computeRetryDelay(2, 500)).toBe(2000);
  });

  test("retries on 429 and 5xx", () => {
    expect(shouldRetryByStatus(429)).toBe(true);
    expect(shouldRetryByStatus(500)).toBe(true);
    expect(shouldRetryByStatus(503)).toBe(true);
    expect(shouldRetryByStatus(400)).toBe(false);
  });

  test("stops after max attempts", () => {
    expect(
      getRetryDecision({ statusCode: 429, attempt: 3, maxAttempts: 3, baseDelayMs: 200 })
    ).toEqual({ shouldRetry: false, delayMs: 0 });
  });
});

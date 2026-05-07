import { describe, expect, test } from "vitest";

import {
  buildRateLimitKeys,
  canDispatch,
  canDispatchWithQuota,
} from "../../src/limits/rate-limit.js";

describe("rate limit helpers", () => {
  test("canDispatch rejects when at limit", () => {
    expect(canDispatch("provider:t8star", 101, 100)).toBe(false);
    expect(canDispatch("provider:t8star", 99, 100)).toBe(true);
  });

  test("quota check validates global/provider/user windows", () => {
    expect(
      canDispatchWithQuota({
        globalInFlight: 50,
        providerInFlight: 20,
        userInFlight: 3,
        quota: { global: 100, provider: 30, user: 5 },
      })
    ).toBe(true);

    expect(
      canDispatchWithQuota({
        globalInFlight: 100,
        providerInFlight: 20,
        userInFlight: 3,
        quota: { global: 100, provider: 30, user: 5 },
      })
    ).toBe(false);
  });

  test("builds redis rate limit keys", () => {
    expect(buildRateLimitKeys({ provider: "t8star", userId: "u1" })).toEqual({
      global: "rl:global",
      provider: "rl:provider:t8star",
      user: "rl:user:u1",
    });
  });
});

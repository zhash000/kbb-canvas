import { afterAll, beforeAll, describe, expect, test } from "vitest";

import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";

describe("credits reserve-settle-release flow", () => {
  let app: FastifyInstance;
  let userId: string;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();

    const registerRes = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "alice@example.com", password: "secret" },
    });

    userId = (registerRes.json() as { userId: string }).userId;
  });

  afterAll(async () => {
    await app.close();
  });

  test("releases reserved credits when step fails", async () => {
    const startBalanceRes = await app.inject({
      method: "GET",
      url: `/credits/balance?userId=${userId}`,
    });
    expect(startBalanceRes.statusCode).toBe(200);
    expect(startBalanceRes.json()).toMatchObject({ available: 1000, reserved: 0, total: 1000 });

    const reserveRes = await app.inject({
      method: "POST",
      url: "/credits/reserve",
      payload: { userId, amount: 300, refJobId: "job-1" },
    });
    expect(reserveRes.statusCode).toBe(200);

    const reservation = reserveRes.json() as { id: string };

    const midBalanceRes = await app.inject({
      method: "GET",
      url: `/credits/balance?userId=${userId}`,
    });
    expect(midBalanceRes.json()).toMatchObject({ available: 700, reserved: 300, total: 1000 });

    const releaseRes = await app.inject({
      method: "POST",
      url: "/credits/release",
      payload: { userId, reservationId: reservation.id },
    });
    expect(releaseRes.statusCode).toBe(200);

    const finalBalanceRes = await app.inject({
      method: "GET",
      url: `/credits/balance?userId=${userId}`,
    });
    expect(finalBalanceRes.json()).toMatchObject({ available: 1000, reserved: 0, total: 1000 });

    const ledgerRes = await app.inject({
      method: "GET",
      url: `/credits/ledger?userId=${userId}`,
    });
    const ledger = ledgerRes.json() as { entries: Array<{ type: string; amount: number }> };
    expect(ledger.entries.some((entry) => entry.type === "reserve" && entry.amount === 300)).toBe(true);
    expect(ledger.entries.some((entry) => entry.type === "release" && entry.amount === 300)).toBe(true);
  });

  test("reserve is idempotent with Idempotency-Key", async () => {
    const reserveA = await app.inject({
      method: "POST",
      url: "/credits/reserve",
      headers: { "idempotency-key": "reserve-k1" },
      payload: { userId, amount: 120, refJobId: "job-idem" },
    });
    expect(reserveA.statusCode).toBe(200);

    const reserveB = await app.inject({
      method: "POST",
      url: "/credits/reserve",
      headers: { "idempotency-key": "reserve-k1" },
      payload: { userId, amount: 120, refJobId: "job-idem" },
    });
    expect(reserveB.statusCode).toBe(200);

    const first = reserveA.json() as { id: string };
    const second = reserveB.json() as { id: string };
    expect(second.id).toBe(first.id);

    const balanceRes = await app.inject({
      method: "GET",
      url: `/credits/balance?userId=${userId}`,
    });
    expect(balanceRes.statusCode).toBe(200);
    expect(balanceRes.json()).toMatchObject({ available: 880, reserved: 120, total: 1000 });
  });

  test("reserve rejects same idempotency key with different payload", async () => {
    const first = await app.inject({
      method: "POST",
      url: "/credits/reserve",
      headers: { "idempotency-key": "reserve-conflict-k1" },
      payload: { userId, amount: 50, refJobId: "job-conflict-a" },
    });
    expect(first.statusCode).toBe(200);

    const second = await app.inject({
      method: "POST",
      url: "/credits/reserve",
      headers: { "idempotency-key": "reserve-conflict-k1" },
      payload: { userId, amount: 60, refJobId: "job-conflict-b" },
    });
    expect(second.statusCode).toBe(409);
    expect(second.json()).toMatchObject({ message: "idempotency key reused with different payload" });
  });
});

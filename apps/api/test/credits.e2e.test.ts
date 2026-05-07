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
});

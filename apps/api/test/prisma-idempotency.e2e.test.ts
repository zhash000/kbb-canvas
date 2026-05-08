import { execSync } from "node:child_process";

import { PrismaClient } from "@prisma/client";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

import { buildApp } from "../src/app.js";

const prismaDbUrl = process.env.API_PRISMA_TEST_DATABASE_URL;
const shouldRun = Boolean(prismaDbUrl);

describe.skipIf(!shouldRun)("prisma idempotency persistence", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  const originalStoreMode = process.env.STORE_MODE;
  const originalDatabaseUrl = process.env.DATABASE_URL;

  beforeAll(async () => {
    process.env.STORE_MODE = "prisma";
    process.env.DATABASE_URL = prismaDbUrl;

    execSync("npm exec -w apps/api prisma db push --skip-generate", {
      stdio: "inherit",
      cwd: process.cwd(),
    });

    prisma = new PrismaClient();
    await prisma.idempotencyRecord.deleteMany();
    await prisma.creditLedger.deleteMany();
    await prisma.creditReservation.deleteMany();
    await prisma.membership.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    if (app) await app.close();
    if (prisma) await prisma.$disconnect();

    process.env.STORE_MODE = originalStoreMode;
    process.env.DATABASE_URL = originalDatabaseUrl;
  });

  test("credits reserve remains idempotent after app restart", async () => {
    app = buildApp();
    await app.ready();

    const registerRes = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "prisma-idem-credits@example.com", password: "secret" },
    });
    expect(registerRes.statusCode).toBe(200);
    const userId = (registerRes.json() as { userId: string }).userId;

    const first = await app.inject({
      method: "POST",
      url: "/credits/reserve",
      headers: { "idempotency-key": "prisma-reserve-k1" },
      payload: { userId, amount: 100, refJobId: "job-prisma-1" },
    });
    expect(first.statusCode).toBe(200);
    const firstReservation = first.json() as { id: string };

    await app.close();

    app = buildApp();
    await app.ready();

    const second = await app.inject({
      method: "POST",
      url: "/credits/reserve",
      headers: { "idempotency-key": "prisma-reserve-k1" },
      payload: { userId, amount: 100, refJobId: "job-prisma-1" },
    });
    expect(second.statusCode).toBe(200);
    const secondReservation = second.json() as { id: string };
    expect(secondReservation.id).toBe(firstReservation.id);

    const balance = await app.inject({
      method: "GET",
      url: `/credits/balance?userId=${userId}`,
    });
    expect(balance.statusCode).toBe(200);
    expect(balance.json()).toMatchObject({ available: 900, reserved: 100, total: 1000 });
  });

  test("render jobs create remains idempotent after app restart", async () => {
    if (app) await app.close();

    app = buildApp();
    await app.ready();

    const registerRes = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "prisma-idem-jobs@example.com", password: "secret" },
    });
    expect(registerRes.statusCode).toBe(200);
    const userId = (registerRes.json() as { userId: string }).userId;

    const workflowRes = await app.inject({
      method: "POST",
      url: "/workflows",
      payload: {
        name: "prisma idem workflow",
        nodes: [{ id: "n1", type: "script", modelId: "deepseek-v4-flash" }],
      },
    });
    expect(workflowRes.statusCode).toBe(200);
    const workflowId = (workflowRes.json() as { id: string }).id;

    const first = await app.inject({
      method: "POST",
      url: "/render-jobs",
      headers: { "idempotency-key": "prisma-job-k1" },
      payload: { workflowId, userId },
    });
    expect(first.statusCode).toBe(200);
    const firstJob = first.json() as { id: string; reservationId?: string };

    await app.close();

    app = buildApp();
    await app.ready();

    const second = await app.inject({
      method: "POST",
      url: "/render-jobs",
      headers: { "idempotency-key": "prisma-job-k1" },
      payload: { workflowId, userId },
    });
    expect(second.statusCode).toBe(200);
    const secondJob = second.json() as { id: string; reservationId?: string };

    expect(secondJob.id).toBe(firstJob.id);
    expect(secondJob.reservationId).toBe(firstJob.reservationId);
  });
});

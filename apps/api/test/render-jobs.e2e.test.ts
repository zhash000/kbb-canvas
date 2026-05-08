import { afterAll, beforeAll, describe, expect, test } from "vitest";

import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";

describe("render jobs idempotency", () => {
  let app: FastifyInstance;
  let userId: string;
  let workflowId: string;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();

    const registerRes = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "render-idem@example.com", password: "secret" },
    });
    userId = (registerRes.json() as { userId: string }).userId;

    const workflowRes = await app.inject({
      method: "POST",
      url: "/workflows",
      payload: {
        name: "idem workflow",
        nodes: [{ id: "n1", type: "script", modelId: "deepseek-v4-flash" }],
      },
    });
    workflowId = (workflowRes.json() as { id: string }).id;
  });

  afterAll(async () => {
    await app.close();
  });

  test("create render job should be idempotent", async () => {
    const first = await app.inject({
      method: "POST",
      url: "/render-jobs",
      headers: { "idempotency-key": "job-k1" },
      payload: { workflowId, userId },
    });
    expect(first.statusCode).toBe(200);

    const second = await app.inject({
      method: "POST",
      url: "/render-jobs",
      headers: { "idempotency-key": "job-k1" },
      payload: { workflowId, userId },
    });
    expect(second.statusCode).toBe(200);

    const a = first.json() as { id: string; reservationId?: string };
    const b = second.json() as { id: string; reservationId?: string };
    expect(b.id).toBe(a.id);
    expect(b.reservationId).toBe(a.reservationId);

    const balanceRes = await app.inject({
      method: "GET",
      url: `/credits/balance?userId=${userId}`,
    });
    expect(balanceRes.statusCode).toBe(200);
    expect(balanceRes.json()).toMatchObject({ available: 900, reserved: 100, total: 1000 });
  });

  test("create render job rejects same idempotency key with different payload", async () => {
    const first = await app.inject({
      method: "POST",
      url: "/render-jobs",
      headers: { "idempotency-key": "job-conflict-k1" },
      payload: { workflowId, userId },
    });
    expect(first.statusCode).toBe(200);

    const second = await app.inject({
      method: "POST",
      url: "/render-jobs",
      headers: { "idempotency-key": "job-conflict-k1" },
      payload: { workflowId: "different-workflow-id", userId },
    });
    expect(second.statusCode).toBe(409);
    expect(second.json()).toMatchObject({ message: "idempotency key reused with different payload" });
  });
});

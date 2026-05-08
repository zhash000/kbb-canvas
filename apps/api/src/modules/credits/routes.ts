import type { FastifyPluginAsync } from "fastify";

import { buildRequestHash } from "../common/idempotency.js";
import type { Store } from "../common/store.types.js";

declare module "fastify" {
  interface FastifyInstance {
    store: Store;
  }
}

interface ReserveBody {
  userId: string;
  amount: number;
  refJobId?: string;
}

interface SettleBody {
  userId: string;
  reservationId: string;
  amount: number;
}

interface ReleaseBody {
  userId: string;
  reservationId: string;
}

function getIdempotencyKey(raw: string | string[] | undefined): string | undefined {
  if (!raw) return undefined;
  return Array.isArray(raw) ? raw[0] : raw;
}

function mapDomainError(error: unknown): { statusCode: number; message: string } | null {
  if (!(error instanceof Error)) return null;

  switch (error.message) {
    case "invalid_amount":
      return { statusCode: 400, message: "amount must be greater than zero" };
    case "insufficient_credits":
      return { statusCode: 409, message: "insufficient credits" };
    case "reservation_not_found":
      return { statusCode: 404, message: "reservation not found" };
    case "settle_amount_exceeds_reservation":
      return { statusCode: 409, message: "settle amount exceeds reservation" };
    case "idempotency_key_reused_with_different_payload":
      return { statusCode: 409, message: "idempotency key reused with different payload" };
    default:
      return null;
  }
}

export const creditsRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Querystring: { userId: string } }>("/credits/balance", async (request) => {
    return await app.store.getBalance(request.query.userId);
  });

  app.get<{ Querystring: { userId: string } }>("/credits/ledger", async (request) => {
    return { entries: await app.store.getLedger(request.query.userId) };
  });

  app.post<{ Body: ReserveBody }>("/credits/reserve", async (request, reply) => {
    try {
      return await app.store.reserve(
        request.body.userId,
        request.body.amount,
        request.body.refJobId,
        getIdempotencyKey(request.headers["idempotency-key"]),
        buildRequestHash(request.body)
      );
    } catch (error) {
      const mapped = mapDomainError(error);
      if (mapped) return reply.code(mapped.statusCode).send({ message: mapped.message });
      throw error;
    }
  });

  app.post<{ Body: SettleBody }>("/credits/settle", async (request, reply) => {
    try {
      return await app.store.settle(
        request.body.userId,
        request.body.reservationId,
        request.body.amount,
        getIdempotencyKey(request.headers["idempotency-key"]),
        buildRequestHash(request.body)
      );
    } catch (error) {
      const mapped = mapDomainError(error);
      if (mapped) return reply.code(mapped.statusCode).send({ message: mapped.message });
      throw error;
    }
  });

  app.post<{ Body: ReleaseBody }>("/credits/release", async (request, reply) => {
    try {
      return await app.store.release(
        request.body.userId,
        request.body.reservationId,
        getIdempotencyKey(request.headers["idempotency-key"]),
        buildRequestHash(request.body)
      );
    } catch (error) {
      const mapped = mapDomainError(error);
      if (mapped) return reply.code(mapped.statusCode).send({ message: mapped.message });
      throw error;
    }
  });
};

import type { FastifyPluginAsync } from "fastify";
import type { Store } from "../common/store.types.js";

declare module "fastify" {
  interface FastifyInstance {
    store: Store;
  }
}

export const observabilityRoutes: FastifyPluginAsync = async (app) => {
  app.get("/observability/ping", async (request, reply) => {
    const traceId = request.headers["x-trace-id"]?.toString() ?? crypto.randomUUID();

    const payload = {
      level: "info",
      event: "api_observability_ping",
      traceId,
      timestamp: new Date().toISOString(),
    };
    app.log.info(payload);

    return { ok: true, traceId };
  });

  app.post<{ Body: { olderThanIso: string } }>("/observability/idempotency/cleanup", async (request) => {
    const deleted = await app.store.cleanupIdempotencyRecords(request.body.olderThanIso);
    return { deleted };
  });
};

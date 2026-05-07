import type { FastifyPluginAsync } from "fastify";

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
};

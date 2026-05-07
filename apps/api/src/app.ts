import Fastify, { type FastifyInstance } from "fastify";

import { authRoutes } from "./modules/auth/routes.js";
import { InMemoryStore } from "./modules/common/store.js";
import { creditsRoutes } from "./modules/credits/routes.js";
import { membershipRoutes } from "./modules/membership/routes.js";

export function buildApp(): FastifyInstance {
  const app = Fastify({ logger: false });
  app.decorate("store", new InMemoryStore());

  app.get("/health", async () => ({ ok: true }));

  app.register(authRoutes);
  app.register(creditsRoutes);
  app.register(membershipRoutes);

  return app;
}

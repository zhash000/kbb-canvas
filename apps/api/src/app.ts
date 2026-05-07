import Fastify, { type FastifyInstance } from "fastify";

import { authRoutes } from "./modules/auth/routes.js";
import { InMemoryStore } from "./modules/common/store.js";
import { creditsRoutes } from "./modules/credits/routes.js";
import { membershipRoutes } from "./modules/membership/routes.js";
import { renderJobRoutes } from "./modules/render-jobs/routes.js";
import { workflowRoutes } from "./modules/workflow/routes.js";
import { WorkflowService } from "./modules/workflow/service.js";

export function buildApp(): FastifyInstance {
  const app = Fastify({ logger: false });
  app.decorate("store", new InMemoryStore());
  app.decorate("workflowService", new WorkflowService());

  app.get("/health", async () => ({ ok: true }));

  app.register(authRoutes);
  app.register(creditsRoutes);
  app.register(membershipRoutes);
  app.register(workflowRoutes);
  app.register(renderJobRoutes);

  return app;
}

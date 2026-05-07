import type { FastifyPluginAsync } from "fastify";

import { InMemoryStore } from "../common/store.js";
import { WorkflowService } from "../workflow/service.js";

declare module "fastify" {
  interface FastifyInstance {
    store: InMemoryStore;
    workflowService: WorkflowService;
  }
}

interface CreateRenderJobBody {
  workflowId: string;
  userId: string;
}

export const renderJobRoutes: FastifyPluginAsync = async (app) => {
  app.post<{ Body: CreateRenderJobBody }>("/render-jobs", async (request, reply) => {
    const workflow = app.workflowService.getWorkflow(request.body.workflowId);
    if (!workflow) return reply.code(404).send({ message: "workflow not found" });

    const validation = app.workflowService.validateWorkflow(workflow.id);
    if (!validation.ok) {
      return reply.code(400).send({ message: "workflow validation failed", errors: validation.errors });
    }

    const estimatedCredits = app.workflowService.estimateCredits(workflow);
    let reservationId: string | undefined;

    if (estimatedCredits > 0) {
      reservationId = app.store.reserve(
        request.body.userId,
        estimatedCredits,
        `workflow:${workflow.id}`
      ).id;
    }

    return app.workflowService.createRenderJob({
      workflowId: workflow.id,
      userId: request.body.userId,
      reservationId,
    });
  });
};

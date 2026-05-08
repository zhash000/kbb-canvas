import type { FastifyPluginAsync } from "fastify";

import { buildRequestHash } from "../common/idempotency.js";
import type { Store } from "../common/store.types.js";
import { WorkflowService } from "../workflow/service.js";

declare module "fastify" {
  interface FastifyInstance {
    store: Store;
    workflowService: WorkflowService;
  }
}

interface CreateRenderJobBody {
  workflowId: string;
  userId: string;
}

function getIdempotencyKey(raw: string | string[] | undefined): string | undefined {
  if (!raw) return undefined;
  return Array.isArray(raw) ? raw[0] : raw;
}

export const renderJobRoutes: FastifyPluginAsync = async (app) => {
  app.post<{ Body: CreateRenderJobBody }>("/render-jobs", async (request, reply) => {
    try {
      const idempotencyKey = getIdempotencyKey(request.headers["idempotency-key"]);
      const requestHash = buildRequestHash(request.body);
      if (idempotencyKey) {
        const existing = await app.store.getRenderJobByIdempotency(
          request.body.userId,
          idempotencyKey,
          requestHash
        );
        if (existing) return existing;
      }

      const workflow = app.workflowService.getWorkflow(request.body.workflowId);
      if (!workflow) return reply.code(404).send({ message: "workflow not found" });

      const validation = app.workflowService.validateWorkflow(workflow.id);
      if (!validation.ok) {
        return reply.code(400).send({ message: "workflow validation failed", errors: validation.errors });
      }

      const estimatedCredits = app.workflowService.estimateCredits(workflow);
      let reservationId: string | undefined;

      if (estimatedCredits > 0) {
        reservationId = (
          await app.store.reserve(
            request.body.userId,
            estimatedCredits,
            `workflow:${workflow.id}`,
            idempotencyKey ? `render-job-reserve:${idempotencyKey}` : undefined,
            requestHash
          )
        ).id;
      }

      const job = app.workflowService.createRenderJob({
        workflowId: workflow.id,
        userId: request.body.userId,
        reservationId,
        idempotencyKey,
      });

      if (idempotencyKey) {
        await app.store.saveRenderJobIdempotency(request.body.userId, idempotencyKey, requestHash, job);
      }

      return job;
    } catch (error) {
      if (error instanceof Error && error.message === "idempotency_key_reused_with_different_payload") {
        return reply.code(409).send({ message: "idempotency key reused with different payload" });
      }
      throw error;
    }
  });
};

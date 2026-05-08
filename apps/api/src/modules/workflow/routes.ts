import type { FastifyPluginAsync } from "fastify";

import { WorkflowService, type WorkflowNodeInput } from "./service.js";

declare module "fastify" {
  interface FastifyInstance {
    workflowService: WorkflowService;
  }
}

interface CreateWorkflowBody {
  name: string;
  nodes: WorkflowNodeInput[];
}

export const workflowRoutes: FastifyPluginAsync = async (app) => {
  app.post<{ Body: CreateWorkflowBody }>("/workflows", async (request) => {
    return app.workflowService.createWorkflow({
      name: request.body.name,
      nodes: request.body.nodes,
    });
  });

  app.get<{ Params: { id: string } }>("/workflows/:id", async (request, reply) => {
    const workflow = app.workflowService.getWorkflow(request.params.id);
    if (!workflow) return reply.code(404).send({ message: "workflow not found" });
    return workflow;
  });

  app.post<{ Params: { id: string } }>("/workflows/:id/validate", async (request, reply) => {
    const result = app.workflowService.validateWorkflow(request.params.id);
    if (!result.ok && result.errors.includes("workflow_not_found")) {
      return reply.code(404).send({ message: "workflow not found" });
    }
    return result;
  });
};

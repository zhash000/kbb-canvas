import { randomUUID } from "node:crypto";
import fs from "node:fs";

import { loadCatalogFromMarkdown, type ModelCategory } from "@app/model-catalog";

export type WorkflowNodeType =
  | "text"
  | "script"
  | "image"
  | "video"
  | "video_concat"
  | "audio"
  | "upload"
  | "library_pick";

export interface WorkflowNodeInput {
  id: string;
  type: WorkflowNodeType;
  modelId?: string;
  params?: Record<string, unknown>;
}

export interface WorkflowRecord {
  id: string;
  name: string;
  nodes: WorkflowNodeInput[];
  createdAt: string;
}

export interface RenderStep {
  id: string;
  kind:
    | "analyze_text"
    | "analyze_video"
    | "storyboard_llm"
    | "image_gen"
    | "video_gen"
    | "concat";
  nodeId: string;
}

export interface RenderJobRecord {
  id: string;
  workflowId: string;
  userId: string;
  status: "queued" | "running" | "succeeded" | "failed";
  estimatedCredits: number;
  reservationId?: string;
  steps: RenderStep[];
  createdAt: string;
}

function nodeTypeToCategory(nodeType: WorkflowNodeType): ModelCategory | null {
  if (nodeType === "text" || nodeType === "script") return "text";
  if (nodeType === "image") return "image";
  if (nodeType === "video") return "video";
  return null;
}

export function compileDag(nodes: WorkflowNodeInput[]): RenderStep[] {
  const steps: RenderStep[] = [];

  for (const node of nodes) {
    const kind: RenderStep["kind"] | null =
      node.type === "text" || node.type === "script"
        ? "storyboard_llm"
        : node.type === "image"
          ? "image_gen"
          : node.type === "video"
            ? "video_gen"
            : node.type === "video_concat"
              ? "concat"
              : null;

    if (!kind) continue;

    steps.push({ id: `${node.id}:${kind}`, nodeId: node.id, kind });
  }

  return steps;
}

export class WorkflowService {
  private workflows = new Map<string, WorkflowRecord>();
  private jobs = new Map<string, RenderJobRecord>();
  private jobsByIdempotency = new Map<string, RenderJobRecord>();
  private modelCategoryById = new Map<string, ModelCategory>();

  constructor() {
    const modelsPath = new URL("../../../../../modle/MODELS.md", import.meta.url);
    const markdown = fs.readFileSync(modelsPath, "utf8");
    const catalog = loadCatalogFromMarkdown(markdown);

    for (const model of catalog.models) {
      this.modelCategoryById.set(model.id, model.category);
    }
  }

  createWorkflow(payload: Omit<WorkflowRecord, "id" | "createdAt">): WorkflowRecord {
    const id = randomUUID();
    const workflow: WorkflowRecord = {
      id,
      name: payload.name,
      nodes: payload.nodes,
      createdAt: new Date().toISOString(),
    };
    this.workflows.set(id, workflow);
    return workflow;
  }

  getWorkflow(id: string): WorkflowRecord | null {
    return this.workflows.get(id) ?? null;
  }

  getRenderJobByIdempotency(userId: string, idempotencyKey: string): RenderJobRecord | null {
    return this.jobsByIdempotency.get(`${userId}:${idempotencyKey}`) ?? null;
  }

  validateWorkflow(id: string): { ok: boolean; errors: string[] } {
    const workflow = this.workflows.get(id);
    if (!workflow) return { ok: false, errors: ["workflow_not_found"] };

    const errors: string[] = [];

    for (const node of workflow.nodes) {
      const expected = nodeTypeToCategory(node.type);
      const actual = node.modelId ? this.modelCategoryById.get(node.modelId) : null;

      if (expected && !node.modelId) {
        errors.push(`${node.id}:model_required`);
      }
      if (!expected && node.modelId) {
        errors.push(`${node.id}:model_not_allowed`);
      }
      if (expected && actual && expected !== actual) {
        errors.push(`${node.id}:model_category_mismatch`);
      }
      if (expected && node.modelId && !actual) {
        errors.push(`${node.id}:model_not_found`);
      }
    }

    return { ok: errors.length === 0, errors };
  }

  estimateCredits(workflow: WorkflowRecord): number {
    return workflow.nodes.filter((node) => ["text", "script", "image", "video"].includes(node.type)).length * 100;
  }

  createRenderJob(input: {
    workflowId: string;
    userId: string;
    reservationId?: string;
    idempotencyKey?: string;
  }): RenderJobRecord {
    if (input.idempotencyKey) {
      const existing = this.jobsByIdempotency.get(`${input.userId}:${input.idempotencyKey}`);
      if (existing) return existing;
    }

    const workflow = this.workflows.get(input.workflowId);
    if (!workflow) {
      throw new Error("workflow_not_found");
    }

    const job: RenderJobRecord = {
      id: randomUUID(),
      workflowId: input.workflowId,
      userId: input.userId,
      status: "queued",
      estimatedCredits: this.estimateCredits(workflow),
      reservationId: input.reservationId,
      steps: compileDag(workflow.nodes),
      createdAt: new Date().toISOString(),
    };

    this.jobs.set(job.id, job);
    if (input.idempotencyKey) {
      this.jobsByIdempotency.set(`${input.userId}:${input.idempotencyKey}`, job);
    }
    return job;
  }
}

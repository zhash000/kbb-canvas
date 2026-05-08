import type { CanvasNodeModelConfig } from "../canvas/node-types.js";

export interface JobRunPayload {
  workflowId: string;
  nodes: Array<{
    nodeId: string;
    nodeType: string;
    modelId?: string;
    params?: Record<string, unknown>;
  }>;
}

export function buildJobRunPayload(
  workflowId: string,
  nodeConfigs: CanvasNodeModelConfig[]
): JobRunPayload {
  return {
    workflowId,
    nodes: nodeConfigs.map((node) => ({
      nodeId: node.nodeId,
      nodeType: node.nodeType,
      modelId: node.modelId,
      params: node.params,
    })),
  };
}

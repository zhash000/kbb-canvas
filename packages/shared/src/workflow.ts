export type NodeType =
  | "text"
  | "script"
  | "image"
  | "video"
  | "video_concat"
  | "audio"
  | "upload"
  | "library_pick";

export interface NodeConfigBase {
  readonly type: NodeType;
  readonly modelId?: string;
}

export type ValidationResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: string };

/** Basic node-level consistency rules for MVP (expands later). */
export function validateNodeConfig(input: NodeConfigBase): ValidationResult {
  const noModels: ReadonlyArray<NodeType> = ["video_concat", "upload", "library_pick"];
  const needsModel: ReadonlyArray<NodeType> = ["text", "script", "image", "video"];

  if (noModels.includes(input.type) && input.modelId !== undefined && input.modelId !== "") {
    return { ok: false, reason: "resource_or_concat_should_not_carry_model_id" };
  }

  if (needsModel.includes(input.type) && (!input.modelId || input.modelId.trim() === "")) {
    return { ok: false, reason: "generation_node_requires_model_id" };
  }

  return { ok: true };
}

export function allowedCategoriesForNode(
  nodeType: NodeType
): readonly ("text" | "image" | "video")[] {
  if (nodeType === "text" || nodeType === "script") return ["text"] as const;
  if (nodeType === "image") return ["image"] as const;
  if (nodeType === "video") return ["video"] as const;
  return [] as const;
}

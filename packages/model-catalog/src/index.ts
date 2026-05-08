export * from "./catalog.js";

export type NodeType =
  | "text"
  | "script"
  | "image"
  | "video"
  | "video_concat"
  | "audio"
  | "upload"
  | "library_pick";

export function allowedCategoriesForNode(nodeType: NodeType): readonly ("text" | "image" | "video")[] {
  if (nodeType === "text" || nodeType === "script") return ["text"] as const;
  if (nodeType === "image") return ["image"] as const;
  if (nodeType === "video") return ["video"] as const;
  return [] as const;
}

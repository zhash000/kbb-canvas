import type { DesktopNodeType } from "./node-types.js";
import { allowedCategoriesForNode } from "@app/model-catalog";

export interface ModelOption {
  id: string;
  name: string;
  category: "text" | "image" | "video";
  billingMode: "per_token" | "per_call" | "per_second";
}

// Mirrors modle/MODELS.md catalog for desktop filtering.
const ALL_MODEL_OPTIONS: ModelOption[] = [
  { id: "deepseek-v4-flash", name: "DeepSeek V4 Flash", category: "text", billingMode: "per_token" },
  { id: "gemini-3.1-pro-preview-thinking-high", name: "Gemini 3.1 Pro Preview (Thinking High)", category: "text", billingMode: "per_token" },
  { id: "claude-opus-4-7", name: "Claude Opus 4.7", category: "text", billingMode: "per_token" },

  { id: "gpt-image-2", name: "GPT Image 2", category: "image", billingMode: "per_call" },
  { id: "gemini-3.1-flash-image-preview", name: "Gemini 3.1 Flash Image Preview", category: "image", billingMode: "per_call" },

  { id: "grok-video-3", name: "Grok Video 3", category: "video", billingMode: "per_second" },
  { id: "doubao-seedance-1-0-pro", name: "Doubao Seedance 1.0 Pro", category: "video", billingMode: "per_second" },
  { id: "doubao-seedance-1-5-pro", name: "Doubao Seedance 1.5 Pro", category: "video", billingMode: "per_second" },
  { id: "doubao-seedance-2-0-fast", name: "Doubao Seedance 2.0 Fast", category: "video", billingMode: "per_second" },
  { id: "doubao-seedance-2-0", name: "Doubao Seedance 2.0", category: "video", billingMode: "per_second" },
  { id: "veo3.1-fast", name: "Veo 3.1 Fast", category: "video", billingMode: "per_call" },
  { id: "veo3.1", name: "Veo 3.1", category: "video", billingMode: "per_call" },
  { id: "veo3.1-4k", name: "Veo 3.1 4K", category: "video", billingMode: "per_call" },
  { id: "veo3.1-pro", name: "Veo 3.1 Pro", category: "video", billingMode: "per_call" },
  { id: "veo3.1-pro-4k", name: "Veo 3.1 Pro 4K", category: "video", billingMode: "per_call" },
];

export function getModelOptionsForNode(nodeType: DesktopNodeType): ModelOption[] {
  const categories = allowedCategoriesForNode(nodeType as any);
  if (!categories.length) return [];
  return ALL_MODEL_OPTIONS.filter((m) => categories.includes(m.category));
}

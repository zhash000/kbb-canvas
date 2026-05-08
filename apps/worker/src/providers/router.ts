import { CozeWorkflowAdapter } from "./coze.adapter.js";
import { RunningHubAdapter } from "./runninghub.adapter.js";
import { T8StarAdapter } from "./t8star.adapter.js";
import type { ProviderAdapter, ProviderId, ProviderTaskKind } from "./provider.interface.js";

export interface ProviderRouteInput {
  kind: ProviderTaskKind;
  preferred?: ProviderId;
}

const adapters: Record<ProviderId, ProviderAdapter> = {
  t8star: new T8StarAdapter(),
  runninghub: new RunningHubAdapter(),
  coze_workflow: new CozeWorkflowAdapter(),
};

export function routeProvider(input: ProviderRouteInput): ProviderId {
  if (input.preferred) return input.preferred;

  if (input.kind === "storyboard_llm") return "coze_workflow";
  if (input.kind === "image_gen") return "runninghub";
  if (input.kind === "video_gen") return "t8star";
  return "t8star";
}

export function resolveProvider(input: ProviderRouteInput): ProviderAdapter {
  return adapters[routeProvider(input)];
}

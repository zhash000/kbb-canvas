import { randomUUID } from "node:crypto";

import type {
  ProviderAdapter,
  ProviderPollResult,
  ProviderSubmitResult,
  ProviderTask,
  ProviderTaskRef,
} from "./provider.interface.js";

export class CozeWorkflowAdapter implements ProviderAdapter {
  readonly provider = "coze_workflow" as const;

  async submit(task: ProviderTask): Promise<ProviderSubmitResult> {
    return {
      providerTaskId: `coze_${task.kind}_${randomUUID()}`,
      acceptedAt: new Date().toISOString(),
    };
  }

  async poll(taskRef: ProviderTaskRef): Promise<ProviderPollResult> {
    return {
      done: true,
      success: true,
      outputs: [{ kind: "text", url: `https://example.local/coze/${taskRef.providerTaskId}.json` }],
    };
  }
}

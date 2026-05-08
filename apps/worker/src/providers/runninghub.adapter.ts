import { randomUUID } from "node:crypto";

import type {
  ProviderAdapter,
  ProviderPollResult,
  ProviderSubmitResult,
  ProviderTask,
  ProviderTaskRef,
} from "./provider.interface.js";

export class RunningHubAdapter implements ProviderAdapter {
  readonly provider = "runninghub" as const;

  async submit(task: ProviderTask): Promise<ProviderSubmitResult> {
    return {
      providerTaskId: `runninghub_${task.kind}_${randomUUID()}`,
      acceptedAt: new Date().toISOString(),
    };
  }

  async poll(taskRef: ProviderTaskRef): Promise<ProviderPollResult> {
    return {
      done: true,
      success: true,
      outputs: [{ kind: "image", url: `https://example.local/runninghub/${taskRef.providerTaskId}.png` }],
    };
  }
}

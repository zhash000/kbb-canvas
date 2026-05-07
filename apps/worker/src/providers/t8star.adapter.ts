import { randomUUID } from "node:crypto";

import type {
  ProviderAdapter,
  ProviderPollResult,
  ProviderSubmitResult,
  ProviderTask,
  ProviderTaskRef,
} from "./provider.interface.js";

export class T8StarAdapter implements ProviderAdapter {
  readonly provider = "t8star" as const;

  async submit(task: ProviderTask): Promise<ProviderSubmitResult> {
    return {
      providerTaskId: `t8star_${task.kind}_${randomUUID()}`,
      acceptedAt: new Date().toISOString(),
    };
  }

  async poll(taskRef: ProviderTaskRef): Promise<ProviderPollResult> {
    return {
      done: true,
      success: true,
      outputs: [{ kind: "video", url: `https://example.local/t8star/${taskRef.providerTaskId}.mp4` }],
    };
  }
}

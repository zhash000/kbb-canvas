import type { Job } from "bullmq";

import { logProviderCall, createTraceId } from "../observability.js";
import { nextStatus, type StepStatus } from "../state-machine.js";
import type { RenderStepJob } from "../queues.js";

export interface StepProgressStore {
  getStatus(stepId: string): StepStatus;
  setStatus(stepId: string, status: StepStatus): void;
}

export class InMemoryStepProgressStore implements StepProgressStore {
  private state = new Map<string, StepStatus>();

  getStatus(stepId: string): StepStatus {
    return this.state.get(stepId) ?? "queued";
  }

  setStatus(stepId: string, status: StepStatus): void {
    this.state.set(stepId, status);
  }
}

export function createRenderStepProcessor(store: StepProgressStore) {
  return async (job: Job<RenderStepJob>) => {
    const startedAt = Date.now();
    const traceId = createTraceId();

    const before = store.getStatus(job.data.stepId);
    const running = nextStatus(before, "start");
    store.setStatus(job.data.stepId, running);

    // Placeholder processor for Task 6/7; provider integration plugged in later.
    const succeeded = nextStatus(running, "succeed");
    store.setStatus(job.data.stepId, succeeded);

    logProviderCall({
      traceId,
      jobId: job.data.jobId,
      stepId: job.data.stepId,
      provider: "internal",
      modelId: undefined,
      latencyMs: Date.now() - startedAt,
      creditsDelta: 0,
      status: "ok",
    });

    return { stepId: job.data.stepId, status: succeeded, traceId };
  };
}

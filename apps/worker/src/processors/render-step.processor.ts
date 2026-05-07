import type { Job } from "bullmq";

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
    const before = store.getStatus(job.data.stepId);
    const running = nextStatus(before, "start");
    store.setStatus(job.data.stepId, running);

    // Placeholder processor for Task 6; provider calls are added in Task 7.
    const succeeded = nextStatus(running, "succeed");
    store.setStatus(job.data.stepId, succeeded);

    return { stepId: job.data.stepId, status: succeeded };
  };
}

export type StepStatus =
  | "queued"
  | "running"
  | "awaiting_external"
  | "succeeded"
  | "failed"
  | "canceled";

export type StepEvent =
  | "start"
  | "external_wait"
  | "succeed"
  | "fail"
  | "cancel";

const transitions: Record<StepStatus, Partial<Record<StepEvent, StepStatus>>> = {
  queued: {
    start: "running",
    cancel: "canceled",
  },
  running: {
    external_wait: "awaiting_external",
    succeed: "succeeded",
    fail: "failed",
    cancel: "canceled",
  },
  awaiting_external: {
    succeed: "succeeded",
    fail: "failed",
    cancel: "canceled",
  },
  succeeded: {},
  failed: {},
  canceled: {},
};

export function nextStatus(current: StepStatus, event: StepEvent): StepStatus {
  const next = transitions[current][event];
  if (!next) {
    throw new Error(`invalid_transition:${current}:${event}`);
  }
  return next;
}

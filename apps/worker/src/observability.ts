import { randomUUID } from "node:crypto";

export interface ProviderCallLog {
  traceId: string;
  jobId: string;
  stepId: string;
  provider: string;
  modelId?: string;
  latencyMs: number;
  creditsDelta: number;
  status: "ok" | "error";
}

export function createTraceId(): string {
  return randomUUID();
}

export function logProviderCall(entry: ProviderCallLog) {
  // Structured single-line JSON for ingestion.
  const payload = {
    level: "info",
    event: "provider_call",
    timestamp: new Date().toISOString(),
    ...entry,
  };
  console.log(JSON.stringify(payload));
}

export type ProviderId = "t8star" | "runninghub" | "coze_workflow";

export type ProviderTaskKind = "storyboard_llm" | "image_gen" | "video_gen" | "concat";

export interface ProviderTask {
  kind: ProviderTaskKind;
  modelId?: string;
  prompt?: string;
  inputRefs?: string[];
}

export interface ProviderTaskRef {
  providerTaskId: string;
}

export interface ProviderSubmitResult {
  providerTaskId: string;
  acceptedAt: string;
}

export interface ProviderPollResult {
  done: boolean;
  success?: boolean;
  outputs?: Array<{ kind: "text" | "image" | "video"; url: string }>;
  retryAfterMs?: number;
  errorMessage?: string;
}

export interface ProviderAdapter {
  readonly provider: ProviderId;
  submit(task: ProviderTask): Promise<ProviderSubmitResult>;
  poll(taskRef: ProviderTaskRef): Promise<ProviderPollResult>;
}

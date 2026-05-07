import { Queue, Worker, type JobsOptions, type Processor } from "bullmq";

export interface RenderStepJob {
  stepId: string;
  jobId: string;
  kind: "storyboard_llm" | "image_gen" | "video_gen" | "concat";
}

export const RENDER_STEPS_QUEUE = "render-steps";

export function createRenderStepQueue(redisUrl: string): Queue<RenderStepJob> {
  return new Queue<RenderStepJob>(RENDER_STEPS_QUEUE, {
    connection: { url: redisUrl },
  });
}

export function createRenderStepWorker(
  redisUrl: string,
  processor: Processor<RenderStepJob>,
  concurrency = Number(process.env.WORKER_CONCURRENCY ?? 10)
): Worker<RenderStepJob> {
  return new Worker<RenderStepJob>(RENDER_STEPS_QUEUE, processor, {
    connection: { url: redisUrl },
    concurrency,
  });
}

export async function enqueueRenderStep(
  queue: Queue<RenderStepJob>,
  payload: RenderStepJob,
  opts?: JobsOptions
) {
  return queue.add(`${payload.jobId}:${payload.stepId}`, payload, opts);
}

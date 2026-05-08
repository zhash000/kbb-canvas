import path from "node:path";
import fs from "node:fs";

export type TenantId = string;
export type ProjectId = string;
export type JobId = string;
export type StepId = string;

export function sanitizeSegment(input: string): string {
  return input.replace(/[^a-zA-Z0-9_-]/g, "_");
}

export function getMediaRoot(): string {
  return process.env.MEDIA_ROOT ?? path.resolve(process.cwd(), "data");
}

export function buildStepDir(args: {
  tenantId: TenantId;
  projectId: ProjectId;
  jobId: JobId;
  stepId: StepId;
}): string {
  const mediaRoot = getMediaRoot();
  return path.join(
    mediaRoot,
    sanitizeSegment(args.tenantId),
    sanitizeSegment(args.projectId),
    sanitizeSegment(args.jobId),
    sanitizeSegment(args.stepId)
  );
}

export function buildAssetPath(args: {
  tenantId: TenantId;
  projectId: ProjectId;
  jobId: JobId;
  stepId: StepId;
  fileName: string;
}): string {
  const dir = buildStepDir({
    tenantId: args.tenantId,
    projectId: args.projectId,
    jobId: args.jobId,
    stepId: args.stepId,
  });

  return path.join(dir, sanitizeSegment(args.fileName));
}

export function ensureDir(dirPath: string) {
  fs.mkdirSync(dirPath, { recursive: true });
}

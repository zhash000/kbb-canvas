import fs from "node:fs";
import path from "node:path";

interface ConcatClipsInput {
  tenantId: string;
  projectId: string;
  jobId: string;
  clipPaths: string[];
  fileName?: string;
  stepId?: string;
  forceNoFfmpeg?: boolean;
}

function sanitizeSegment(input: string): string {
  return input.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function mediaRoot(): string {
  return process.env.MEDIA_ROOT ?? path.resolve(process.cwd(), "data");
}

function buildOutputPath(args: {
  tenantId: string;
  projectId: string;
  jobId: string;
  stepId: string;
  fileName: string;
}) {
  return path.join(
    mediaRoot(),
    sanitizeSegment(args.tenantId),
    sanitizeSegment(args.projectId),
    sanitizeSegment(args.jobId),
    sanitizeSegment(args.stepId),
    sanitizeSegment(args.fileName)
  );
}

async function concatWithManifestFallback(args: ConcatClipsInput): Promise<{ outputPath: string }> {
  const outputPath = buildOutputPath({
    tenantId: args.tenantId,
    projectId: args.projectId,
    jobId: args.jobId,
    stepId: args.stepId ?? "concat",
    fileName: args.fileName ?? "output.mp4",
  });

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const manifest = {
    mode: "manifest-fallback",
    clipCount: args.clipPaths.length,
    clips: args.clipPaths,
    createdAt: new Date().toISOString(),
  };

  await fs.promises.writeFile(outputPath, Buffer.from(JSON.stringify(manifest, null, 2), "utf8"));
  return { outputPath };
}

export async function concatClips(args: ConcatClipsInput): Promise<{ outputPath: string }> {
  // TODO: wire real ffmpeg pipeline in a dedicated worker process.
  return concatWithManifestFallback(args);
}

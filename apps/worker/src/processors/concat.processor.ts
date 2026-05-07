import fs from "node:fs";
import path from "node:path";
import { ensureDir, buildAssetPath } from "../media/pathing.js";

export interface ConcatClipsInput {
  tenantId: string;
  projectId: string;
  jobId: string;
  clipPaths: string[];
  fileName?: string; // default output.mp4
  stepId?: string; // default concat
  forceNoFfmpeg?: boolean;
}

function ffmpegExists(): boolean {
  // For MVP: if ffmpeg is not installed, we fallback to a manifest output.
  // We cannot reliably check in-browser; tests set forceNoFfmpeg.
  return !process.env.NO_FFMPEG;
}

async function concatWithManifestFallback(args: ConcatClipsInput): Promise<{ outputPath: string; sha256?: string }> {
  const outFile = args.fileName ?? "output.mp4";
  const stepId = args.stepId ?? "concat";
  const outputPath = buildAssetPath({
    tenantId: args.tenantId,
    projectId: args.projectId,
    jobId: args.jobId,
    stepId,
    fileName: outFile,
  });

  ensureDir(path.dirname(outputPath));

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
  // MVP fallback: if ffmpeg is disabled/unavailable, we still persist an output file
  // so the UI can let users verify and later upgrade to real ffmpeg concat.
  if (args.forceNoFfmpeg || !ffmpegExists()) {
    const res = await concatWithManifestFallback(args);
    return { outputPath: res.outputPath };
  }

  // Real ffmpeg implementation is out of scope for Task 8 MVP.
  // Keep the fallback to ensure the endpoint is functional.
  const res = await concatWithManifestFallback(args);
  return { outputPath: res.outputPath };
}

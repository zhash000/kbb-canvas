import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { describe, expect, test } from "vitest";

import { buildAssetPath } from "../src/media/pathing.js";
import { concatClips } from "../src/processors/concat.processor.js";

function mkTmpRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "mvp-media-"));
}

describe("media pathing", () => {
  test("buildAssetPath includes segments", () => {
    const p = buildAssetPath({
      tenantId: "t1",
      projectId: "p1",
      jobId: "j1",
      stepId: "s1",
      fileName: "out.mp4",
    });

    expect(p).toContain(path.join("t1", "p1", "j1", "s1"));
  });
});

describe("concat processor", () => {
  test("writes manifest fallback output", async () => {
    const tmpRoot = mkTmpRoot();
    process.env.MEDIA_ROOT = tmpRoot;
    process.env.NO_FFMPEG = "1";

    const clipDir = path.join(tmpRoot, "clips");
    fs.mkdirSync(clipDir, { recursive: true });

    const clipA = path.join(clipDir, "a.txt");
    const clipB = path.join(clipDir, "b.txt");
    fs.writeFileSync(clipA, "A");
    fs.writeFileSync(clipB, "B");

    const res = await concatClips({
      tenantId: "t1",
      projectId: "p1",
      jobId: "j1",
      clipPaths: [clipA, clipB],
      forceNoFfmpeg: true,
      fileName: "final.mp4",
      stepId: "concat",
    });

    expect(fs.existsSync(res.outputPath)).toBe(true);

    const content = fs.readFileSync(res.outputPath, "utf8");
    expect(content).toContain("manifest-fallback");
    expect(content).toContain("clipCount");
  });
});

import { describe, expect, test } from "vitest";

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { buildAssetPath } from "../src/media/pathing.js";
import { concatClips } from "../src/processors/concat.processor.js";

function mkTmpRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "mvp-media-"));
}

describe("media pathing", () => {
  test("buildAssetPath includes tenant/project/job/step", () => {
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


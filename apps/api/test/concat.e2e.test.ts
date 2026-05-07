import { buildApp } from "../src/app.js";

import fs from "node:fs";
import path from "node:path";
import os from "node:os";

import { describe, expect, test, beforeEach } from "vitest";

describe("concat endpoint", () => {
  beforeEach(() => {
    delete process.env.NO_FFMPEG;
    delete process.env.MEDIA_ROOT;
  });

  test("writes manifest fallback output file to local media root", async () => {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "mvp-api-media-"));
    process.env.MEDIA_ROOT = tmpRoot;
    process.env.NO_FFMPEG = "1";

    const app = buildApp();
    await app.ready();

    const tenantId = "tenant1";
    const projectId = "proj1";
    const jobId = "job1";

    const registerRes = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "bob@example.com", password: "secret" },
    });

    const userId = (registerRes.json() as { userId: string }).userId;

    const clipsDir = path.join(tmpRoot, "clips");
    fs.mkdirSync(clipsDir, { recursive: true });
    const clipA = path.join(clipsDir, "a.txt");
    const clipB = path.join(clipsDir, "b.txt");
    fs.writeFileSync(clipA, "A");
    fs.writeFileSync(clipB, "B");

    const res = await app.inject({
      method: "POST",
      url: `/render-jobs/${jobId}/concat`,
      payload: {
        tenantId,
        projectId,
        userId,
        clipPaths: [clipA, clipB],
        fileName: "final.mp4",
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ ok: true });

    const body = res.json() as { outputPath: string; ok: boolean };
    expect(body.outputPath).toContain(path.join(tenantId, projectId, jobId, "concat"));

    expect(fs.existsSync(body.outputPath)).toBe(true);
    const content = fs.readFileSync(body.outputPath, "utf8");
    expect(content).toContain("manifest-fallback");
    expect(content).toContain("clipCount");

    await app.close();
  });
});

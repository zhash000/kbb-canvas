#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const { buildApp } = await import("../../apps/api/dist/app.js");

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "mvp-smoke-"));
process.env.MEDIA_ROOT = path.join(tmpRoot, "media");
process.env.NO_FFMPEG = "1";

const app = buildApp();
await app.ready();

try {
  const registerRes = await app.inject({
    method: "POST",
    url: "/auth/register",
    payload: { email: `smoke-${Date.now()}@example.com`, password: "secret" },
  });
  if (registerRes.statusCode !== 200) throw new Error(`register failed: ${registerRes.statusCode}`);
  const { userId } = registerRes.json();

  const workflowRes = await app.inject({
    method: "POST",
    url: "/workflows",
    payload: {
      name: "Smoke Workflow",
      nodes: [
        { id: "n1", type: "script", modelId: "deepseek-v4-flash" },
        { id: "n2", type: "image", modelId: "gpt-image-2" },
        { id: "n3", type: "video", modelId: "veo3.1" },
      ],
    },
  });
  if (workflowRes.statusCode !== 200) throw new Error(`workflow create failed: ${workflowRes.statusCode}`);
  const workflow = workflowRes.json();

  const renderRes = await app.inject({
    method: "POST",
    url: "/render-jobs",
    payload: { workflowId: workflow.id, userId },
  });
  if (renderRes.statusCode !== 200) throw new Error(`render job failed: ${renderRes.statusCode}`);
  const renderJob = renderRes.json();

  const clipDir = path.join(tmpRoot, "clips");
  fs.mkdirSync(clipDir, { recursive: true });
  const clipA = path.join(clipDir, "a.txt");
  const clipB = path.join(clipDir, "b.txt");
  fs.writeFileSync(clipA, "A");
  fs.writeFileSync(clipB, "B");

  const concatRes = await app.inject({
    method: "POST",
    url: `/render-jobs/${renderJob.id}/concat`,
    payload: {
      tenantId: "smoke",
      projectId: "project-1",
      userId,
      clipPaths: [clipA, clipB],
      fileName: "final.mp4",
    },
  });
  if (concatRes.statusCode !== 200) throw new Error(`concat failed: ${concatRes.statusCode}`);

  const { outputPath } = concatRes.json();
  if (!fs.existsSync(outputPath)) throw new Error(`concat output missing: ${outputPath}`);

  console.log("SMOKE_OK", JSON.stringify({ workflowId: workflow.id, renderJobId: renderJob.id, outputPath }));
} finally {
  await app.close();
}

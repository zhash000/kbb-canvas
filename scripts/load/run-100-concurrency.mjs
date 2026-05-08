#!/usr/bin/env node
const { buildApp } = await import("../../apps/api/dist/app.js");

const app = buildApp();
await app.ready();

const TOTAL = 100;
const jobs = [];

try {
  const tasks = Array.from({ length: TOTAL }, async (_, i) => {
    const registerRes = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: `load-${Date.now()}-${i}@example.com`, password: "secret" },
    });
    if (registerRes.statusCode !== 200) throw new Error(`register failed ${i}: ${registerRes.statusCode}`);
    const { userId } = registerRes.json();

    const workflowRes = await app.inject({
      method: "POST",
      url: "/workflows",
      payload: {
        name: `Load Workflow ${i}`,
        nodes: [
          { id: `n1-${i}`, type: "script", modelId: "deepseek-v4-flash" },
          { id: `n2-${i}`, type: "image", modelId: "gpt-image-2" },
          { id: `n3-${i}`, type: "video", modelId: "veo3.1" },
        ],
      },
    });
    if (workflowRes.statusCode !== 200) throw new Error(`workflow failed ${i}: ${workflowRes.statusCode}`);
    const workflow = workflowRes.json();

    const renderRes = await app.inject({
      method: "POST",
      url: "/render-jobs",
      payload: { workflowId: workflow.id, userId },
    });
    if (renderRes.statusCode !== 200) throw new Error(`render failed ${i}: ${renderRes.statusCode}`);

    const balanceRes = await app.inject({
      method: "GET",
      url: `/credits/balance?userId=${userId}`,
    });
    if (balanceRes.statusCode !== 200) throw new Error(`balance failed ${i}: ${balanceRes.statusCode}`);
    const balance = balanceRes.json();
    if (balance.available < 0 || balance.reserved < 0 || balance.total < 0) {
      throw new Error(`negative balance for ${userId}`);
    }

    jobs.push(renderRes.json().id);
  });

  await Promise.all(tasks);
  console.log("LOAD_OK", JSON.stringify({ total: TOTAL, jobs: jobs.length }));
} finally {
  await app.close();
}

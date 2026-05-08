import { describe, expect, test } from "vitest";
import fs from "node:fs";

import { allowedCategoriesForNode, loadCatalogFromMarkdown } from "./index.js";

describe("model catalog parser", () => {
  const modelsPath = new URL("../../../modle/MODELS.md", import.meta.url);
  const markdown = fs.readFileSync(modelsPath, "utf8");
  const catalog = loadCatalogFromMarkdown(markdown);

  test("includes known model ids from MODELS.md", () => {
    expect(catalog.textModels.map((m) => m.id)).toContain("deepseek-v4-flash");
    expect(catalog.imageModels.map((m) => m.id)).toContain("gpt-image-2");
    expect(catalog.videoModels.map((m) => m.id)).toContain("doubao-seedance-2-0");
  });

  test("captures video billing modes from section headers", () => {
    const perSecond = catalog.videoModels.find((m) => m.id === "grok-video-3");
    const perCall = catalog.videoModels.find((m) => m.id === "veo3.1");

    expect(perSecond?.billingMode).toBe("per_second");
    expect(perCall?.billingMode).toBe("per_call");
  });

  test("filters model categories by node type", () => {
    expect(allowedCategoriesForNode("text")).toEqual(["text"]);
    expect(allowedCategoriesForNode("script")).toEqual(["text"]);
    expect(allowedCategoriesForNode("image")).toEqual(["image"]);
    expect(allowedCategoriesForNode("video")).toEqual(["video"]);
    expect(allowedCategoriesForNode("upload")).toEqual([]);
  });
});

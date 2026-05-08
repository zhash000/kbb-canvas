import { describe, expect, test } from "vitest";

import {
  allowedCategoriesForNode,
  validateNodeConfig,
  type NodeType,
} from "./workflow.js";

describe("validateNodeConfig", () => {
  test("video_concat node rejects model_id", () => {
    const result = validateNodeConfig({ type: "video_concat", modelId: "veo3.1" });
    expect(result.ok).toBe(false);
  });

  test("image node rejects missing model_id", () => {
    expect(validateNodeConfig({ type: "image" }).ok).toBe(false);
    expect(
      validateNodeConfig({ type: "image", modelId: "" }).ok
    ).toBe(false);
  });

  test("upload node forbids model_id", () => {
    expect(validateNodeConfig({ type: "upload", modelId: "anything" }).ok).toBe(
      false
    );
    expect(validateNodeConfig({ type: "upload" }).ok).toBe(true);
  });

  test("generation nodes accept configured model ids", () => {
    expect(
      validateNodeConfig({ type: "script", modelId: "deepseek-v4-flash" }).ok
    ).toBe(true);
    expect(
      validateNodeConfig({ type: "image", modelId: "gpt-image-2" }).ok
    ).toBe(true);
    expect(
      validateNodeConfig({ type: "video", modelId: "veo3.1" }).ok
    ).toBe(true);
    expect(validateNodeConfig({ type: "audio" }).ok).toBe(true);
  });
});

describe("allowedCategoriesForNode", () => {
  test("maps node types to model categories", () => {
    const cases: Array<[NodeType, readonly string[]]> = [
      ["text", ["text"]],
      ["script", ["text"]],
      ["image", ["image"]],
      ["video", ["video"]],
      ["video_concat", []],
      ["upload", []],
    ];
    for (const [node, cats] of cases) {
      expect(allowedCategoriesForNode(node)).toEqual(cats);
    }
  });
});

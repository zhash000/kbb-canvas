import { describe, expect, test } from "vitest";

import { compileDag } from "../src/modules/workflow/service.js";

describe("compileDag", () => {
  test("compiles storyboard/image/video pipeline steps", () => {
    const steps = compileDag([
      { id: "n1", type: "script", modelId: "deepseek-v4-flash" },
      { id: "n2", type: "image", modelId: "gpt-image-2" },
      { id: "n3", type: "video", modelId: "veo3.1" },
    ]);

    expect(steps.map((step) => step.kind)).toEqual([
      "storyboard_llm",
      "image_gen",
      "video_gen",
    ]);
  });
});

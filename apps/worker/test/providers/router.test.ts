import { describe, expect, test } from "vitest";

import { resolveProvider, routeProvider } from "../../src/providers/router.js";

describe("provider router", () => {
  test("honors preferred provider", () => {
    expect(routeProvider({ kind: "image_gen", preferred: "runninghub" })).toBe("runninghub");
    expect(routeProvider({ kind: "video_gen", preferred: "t8star" })).toBe("t8star");
  });

  test("applies default routing by task kind", () => {
    expect(routeProvider({ kind: "storyboard_llm" })).toBe("coze_workflow");
    expect(routeProvider({ kind: "image_gen" })).toBe("runninghub");
    expect(routeProvider({ kind: "video_gen" })).toBe("t8star");
  });

  test("resolves adapter implementation", () => {
    expect(resolveProvider({ kind: "image_gen" }).provider).toBe("runninghub");
    expect(resolveProvider({ kind: "storyboard_llm" }).provider).toBe("coze_workflow");
  });
});

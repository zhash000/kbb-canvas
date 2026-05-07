import { describe, expect, test } from "vitest";
import { nextStatus } from "../src/state-machine.js";
describe("worker state machine", () => {
    test("supports queued -> running -> awaiting_external -> succeeded", () => {
        expect(nextStatus("queued", "start")).toBe("running");
        expect(nextStatus("running", "external_wait")).toBe("awaiting_external");
        expect(nextStatus("awaiting_external", "succeed")).toBe("succeeded");
    });
    test("throws on invalid transitions", () => {
        expect(() => nextStatus("queued", "succeed")).toThrow("invalid_transition:queued:succeed");
    });
});
//# sourceMappingURL=state-machine.test.js.map
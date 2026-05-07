import React from "react";
import { render, screen } from "@testing-library/react";

import { ModelPicker } from "../src/features/canvas/model-picker.js";

describe("ModelPicker", () => {
  test("shows only text models for text node", () => {
    render(<ModelPicker nodeType="text" value="" onChange={() => {}} />);

    expect(screen.getByText("DeepSeek V4 Flash")).toBeTruthy();
    expect(screen.queryByText("Veo 3.1")).toBeNull();
  });

  test("shows only video models for video node", () => {
    render(<ModelPicker nodeType="video" value="" onChange={() => {}} />);

    expect(screen.getByText("Veo 3.1")).toBeTruthy();
    expect(screen.queryByText("DeepSeek V4 Flash")).toBeNull();
  });

  test("shows empty hint for non-model node", () => {
    render(<ModelPicker nodeType="upload" value="" onChange={() => {}} />);
    expect(screen.getByTestId("model-picker-empty")).toBeTruthy();
  });
});

import React from "react";

import type { DesktopNodeType } from "./node-types.js";
import { getModelOptionsForNode } from "./model-options.js";

interface ModelPickerProps {
  nodeType: DesktopNodeType;
  value?: string;
  onChange: (modelId: string) => void;
}

export function ModelPicker({ nodeType, value, onChange }: ModelPickerProps) {
  const options = getModelOptionsForNode(nodeType);

  if (!options.length) {
    return <div data-testid="model-picker-empty">当前节点不需要模型</div>;
  }

  return (
    <label>
      模型
      <select
        data-testid="model-picker"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="" disabled>
          请选择模型
        </option>
        {options.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>
    </label>
  );
}

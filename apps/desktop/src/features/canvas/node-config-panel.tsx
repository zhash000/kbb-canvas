import React from "react";

import type { CanvasNodeModelConfig } from "./node-types.js";
import { ModelPicker } from "./model-picker.js";

interface NodeConfigPanelProps {
  config: CanvasNodeModelConfig;
  onChange: (next: CanvasNodeModelConfig) => void;
}

export function NodeConfigPanel({ config, onChange }: NodeConfigPanelProps) {
  const update = (patch: Partial<CanvasNodeModelConfig>) => {
    onChange({ ...config, ...patch });
  };

  const updateParams = (patch: NonNullable<CanvasNodeModelConfig["params"]>) => {
    onChange({
      ...config,
      params: {
        ...config.params,
        ...patch,
      },
    });
  };

  return (
    <aside>
      <h3>节点配置</h3>
      <p>类型：{config.nodeType}</p>

      <ModelPicker
        nodeType={config.nodeType}
        value={config.modelId}
        onChange={(modelId) => update({ modelId })}
      />

      {config.nodeType === "image" && (
        <label>
          分辨率
          <select
            value={config.params?.resolution ?? "standard"}
            onChange={(e) => updateParams({ resolution: e.target.value as any })}
          >
            <option value="standard">standard</option>
            <option value="2k">2k</option>
            <option value="4k">4k</option>
          </select>
        </label>
      )}

      {config.nodeType === "video" && (
        <>
          <label>
            分辨率
            <select
              value={config.params?.resolution ?? "720p"}
              onChange={(e) => updateParams({ resolution: e.target.value as any })}
            >
              <option value="720p">720p</option>
              <option value="1080p">1080p</option>
              <option value="4k">4k</option>
            </select>
          </label>
          <label>
            时长
            <select
              value={config.params?.durationSec ?? 5}
              onChange={(e) => updateParams({ durationSec: Number(e.target.value) as 5 | 10 })}
            >
              <option value={5}>5s</option>
              <option value={10}>10s</option>
            </select>
          </label>
        </>
      )}
    </aside>
  );
}

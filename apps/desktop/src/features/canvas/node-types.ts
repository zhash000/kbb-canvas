export type DesktopNodeType =
  | "text"
  | "script"
  | "image"
  | "video"
  | "video_concat"
  | "audio"
  | "upload"
  | "library_pick";

export interface CanvasNodeModelConfig {
  nodeId: string;
  nodeType: DesktopNodeType;
  modelId?: string;
  params?: {
    resolution?: "standard" | "2k" | "4k" | "720p" | "1080p";
    durationSec?: 5 | 10;
  };
}

export const NODE_LABELS: Record<DesktopNodeType, string> = {
  text: "文本",
  script: "脚本",
  image: "图片",
  video: "视频",
  video_concat: "视频合成",
  audio: "音频",
  upload: "上传",
  library_pick: "从图库选择",
};

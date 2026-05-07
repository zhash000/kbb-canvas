# 模型规格与价格

## 计费单位说明

- **Credits**：平台内部积分，用于所有模型计费
- **per_token**：按 token 计费（文本模型），credits_per_unit 为每 token 消耗积分
- **per_call**：按次计费（图像/部分视频模型），每次调用固定消耗积分
- **per_second**：按秒计费（视频模型），credits × 时长（秒）= 总消耗

---

## 文本模型（category: text）

| 模型 ID | 显示名称 | 计费方式 | 单价（credits/token） |
|---|---|---|---|
| `deepseek-v4-flash` | DeepSeek V4 Flash | per_token | 1 |
| `gemini-3.1-pro-preview-thinking-high` | Gemini 3.1 Pro Preview (Thinking High) | per_token | 5 |
| `claude-opus-4-7` | Claude Opus 4.7 | per_token | 15 |

---

## 图像模型（category: image）

计费方式：per_call（按次），支持分辨率：standard / 2k / 4k

| 模型 ID | 显示名称 | standard | 2K | 4K |
|---|---|---|---|---|
| `gpt-image-2` | GPT Image 2 | 50 credits | 100 credits | 200 credits |
| `gemini-3.1-flash-image-preview` | Gemini 3.1 Flash Image Preview | 25 credits | 50 credits | 100 credits |

---

## 视频模型（category: video）

支持时长：5s / 10s，支持分辨率：720p / 1080p（部分支持 4K）

### per_second 计费（总费用 = 单价 × 时长秒数）

| 模型 ID | 显示名称 | 720p（credits/s） | 1080p（credits/s） | 5s 费用（720p） | 10s 费用（1080p） |
|---|---|---|---|---|---|
| `grok-video-3` | Grok Video 3 | 9 | 18 | 45 | 180 |
| `doubao-seedance-1-0-pro` | Doubao Seedance 1.0 Pro | 12 | 13 | 60 | 130 |
| `doubao-seedance-1-5-pro` | Doubao Seedance 1.5 Pro | 12 | 13 | 60 | 130 |
| `doubao-seedance-2-0-fast` | Doubao Seedance 2.0 Fast | 19 | 37 | 95 | 370 |
| `doubao-seedance-2-0` | Doubao Seedance 2.0 | 20 | 39 | 100 | 390 |

### per_call 计费（总费用 = 单价，与时长无关）

| 模型 ID | 显示名称 | 720p（credits/次） | 1080p（credits/次） | 4K（credits/次） | 支持分辨率 |
|---|---|---|---|---|---|
| `veo3.1-fast` | Veo 3.1 Fast | 22 | 43 | — | 720p / 1080p |
| `veo3.1` | Veo 3.1 | 22 | 43 | — | 720p / 1080p |
| `veo3.1-4k` | Veo 3.1 4K | 123 | 246 | — | 720p / 1080p / 4K |
| `veo3.1-pro` | Veo 3.1 Pro | 123 | 246 | — | 720p / 1080p |
| `veo3.1-pro-4k` | Veo 3.1 Pro 4K | 229 | 457 | — | 720p / 1080p / 4K |

---

## 数据来源

`server/src/seed/models.ts`

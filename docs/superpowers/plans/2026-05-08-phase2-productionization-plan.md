# 阶段二生产化实施计划（Sprint 1-3）

**日期**：2026-05-08  
**适用分支**：`feature/multimodal-mvp` 之后  
**目标**：把已完成的 MVP（Task 1-11）推进为可稳定上线的生产版本

---

## 0. 当前基线（已完成）

- Monorepo 基础：`apps/api`、`apps/worker`、`apps/desktop`、`packages/*`
- 模型目录与节点过滤：`modle/MODELS.md` + `@app/model-catalog`
- API：注册登录、会员、积分、workflow、render-job、concat、基础观测
- Worker：队列骨架、状态机、provider adapter 抽象、媒体本地落盘、限流与重试基础能力
- Desktop：React Flow 画布壳、节点模型选择、参数面板、提交 payload
- 验证链路：`npm test` / `npm run e2e:smoke` / `npm run load:100`

---

## 1. 阶段二总目标

1. **持久化替换**：把 API/Worker 关键状态从内存替换为 PostgreSQL + Redis。  
2. **真实模型联调**：t8star / runninghub / coze adapter 从 stub 升级为真实调用。  
3. **账务与风控闭环**：幂等、补偿、对账与重试策略生产化。  
4. **桌面端可运营化**：错误可见、可重试、可追踪。

---

## 2. 里程碑与时间盒

- **Sprint 1（第 1 周）**：持久化与基础稳定性  
- **Sprint 2（第 2 周）**：Provider 真实接入与账务闭环  
- **Sprint 3（第 3 周）**：桌面端体验打磨与发布链路

---

## 3. Sprint 1：持久化与基础稳定性

### 3.1 范围

- API 存储从 `InMemoryStore` 迁移到 PostgreSQL（Prisma）
- 队列/限流状态迁移到 Redis
- 幂等键与错误补偿基础框架
- 日志关联字段标准化（`traceId/jobId/stepId/userId`）

### 3.2 实施任务

1. **数据库层落地**
   - 引入 Prisma Client
   - 完成 schema 定稿：`User`、`Membership`、`CreditLedger`、`Workflow`、`RenderJob`、`RenderStep`、`ProviderCall`
   - 增加 migration 与初始化脚本

2. **Repository 抽象替换**
   - 定义 `Store` 接口（替换当前 `InMemoryStore` 的直接依赖）
   - 新增 `PrismaStore`，对齐现有路由调用签名
   - 通过配置切换：`STORE_MODE=inmemory|prisma`

3. **Redis 状态层**
   - 限流 key 与并发计数持久到 Redis
   - 队列状态、重试状态打点落库/日志

4. **幂等与一致性**
   - `credits reserve/settle/release` 增加 idempotency key
   - `render-jobs` 创建增加幂等防重

### 3.3 验收标准

- 重启服务后用户、积分、workflow、job 数据可恢复
- 100 并发压测下无负余额、无重复扣费
- 关键接口具备幂等保护

---

## 4. Sprint 2：Provider 真接入与账务闭环

### 4.1 范围

- t8star / runninghub / coze 的真实 submit/poll 接入
- provider 路由策略与降级策略
- 账务闭环：预估冻结、实际结算、失败回补

### 4.2 实施任务

1. **Adapter 真实化**
   - 接入鉴权、超时、重试、错误码映射
   - 统一结果模型：成功、处理中、失败、可重试

2. **路由与降级**
   - 按任务类型配置主备 provider
   - provider 熔断与恢复窗口

3. **账务强化**
   - 步骤级成本记录（模型、参数、耗时、消耗）
   - 对账任务（日维度）

### 4.3 验收标准

- 任一 provider 独立可跑通完整链路
- provider 异常时能降级并可追踪
- 账务流水可按用户/项目/任务汇总对齐

---

## 5. Sprint 3：桌面端可运营化与发布

### 5.1 范围

- 节点交互和错误恢复完善
- 任务历史、重试与状态可视化
- Electron 打包与环境配置

### 5.2 实施任务

1. **体验增强**
   - 节点级错误提示 + 一键重试
   - 运行中状态与日志面板

2. **配置与发布**
   - dev/staging/prod 环境切换
   - Windows 安装包流程标准化

3. **回归验证**
   - 文本链路 + 视频链路端到端回归
   - 发布前 smoke + load 固化到 CI

### 5.3 验收标准

- 可安装桌面端完成一条完整任务链
- 用户可定位错误并自助重试
- CI 自动跑通核心 smoke/load 任务

---

## 6. 风险与缓解

- **Provider API 变更风险**：增加 adapter 契约测试与版本锁。
- **计费偏差风险**：步骤级账本 + 日结对账 + 异常告警。
- **本地媒体膨胀风险**：磁盘配额 + TTL 清理 + 手动归档策略。
- **并发雪崩风险**：全局/用户/provider 三层限流 + 熔断。

---

## 7. 下一步执行顺序（立即开工）

1. 先做 Sprint 1 的 `Store 接口 + PrismaStore`（不改路由签名）。  
2. 然后把 `auth/credits/workflow/render-jobs` 分模块切库。  
3. 最后接 Redis 限流状态与幂等键，跑回归。

---

## 8. 交付物清单（阶段二）

- 生产化代码（API/Worker/Desktop）
- 数据库 migration 与运行脚本
- Provider 接入配置模板
- 运维 runbook 与故障处理流程
- CI smoke/load 验证流水线

# OutreachHub 项目现状与开发缺口报告

> 生成日期：2026-05-29
> 分支：`feat/landing-page`
> 审计范围：全代码库（Prisma Schema、API Routes、Frontend Pages、Lib 模块、Store）

---

## 一、项目概览

OutreachHub 是一个面向国内出海外贸企业的智能拓客与邮件营销 SaaS 平台。基于 **Next.js 15 (App Router) + React 18 + Prisma + PostgreSQL + Redis/BullMQ** 构建，UI 使用 **TailwindCSS + Radix UI**。

### 技术栈

| 层次 | 技术 |
|------|------|
| 前端 | Next.js 15, React 18, TailwindCSS, Radix UI, Recharts, Zustand |
| 后端 | Next.js API Routes (App Router) |
| 数据库 | PostgreSQL (Prisma ORM) |
| 缓存/队列 | Redis + BullMQ |
| 邮件发送 | Nodemailer (SMTP) |
| 邮件接收 | IMAP + mailparser |
| AI | OpenAI API |
| 第三方数据 | RocketReach API |
| 认证 | JWT + bcryptjs |
| 文件上传 | Multer |
| 测试 | Jest + Playwright (E2E) |

---

## 二、已完成功能清单

### 2.1 数据库层 ✅

| 模块 | 状态 | 说明 |
|------|------|------|
| Prisma Schema | ✅ 已完成 | 12 个模型，15+ 枚举类型，关系完整 |
| User / Tenant | ✅ 已完成 | 多租户模型，角色 (ADMIN/USER/MANAGER)，套餐 (FREE/BASIC/PRO/ENTERPRISE) |
| EmailAccount | ✅ 已完成 | SMTP/IMAP 配置、每日发送限额、健康度评分 |
| Company | ✅ 已完成 | 完整公司信息，行业代码，地址，社交链接 |
| Contact / ContactEmail | ✅ 已完成 | 客户信息，多邮箱支持，AI 画像，互动统计 |
| Product | ✅ 已完成 | 产品管理 |
| EmailTemplate | ✅ 已完成 | 邮件模板，AI 生成，变量替换 |
| Campaign | ✅ 已完成 | 营销活动，支持 SINGLE/SEQUENCE/AB_TEST，调度配置 |
| Task | ✅ 已完成 | 邮件任务/序列 |
| EmailLog | ✅ 已完成 | 邮件发送记录，追踪 (opened/clicked/replied/bounced)，回复分类 |
| ProspectingTask | ✅ 已完成 | AI 拓客任务 |
| SearchHistory | ✅ 已完成 | 搜索历史 |

### 2.2 API 路由层 ✅

| API 路由 | 状态 | 说明 |
|----------|------|------|
| `/api/auth/login` | ✅ 已完成 | 用户登录，JWT 签发 |
| `/api/auth/logout` | ✅ 已完成 | 用户登出 |
| `/api/auth/register` | ✅ 已完成 | 用户注册 |
| `/api/campaigns` | ✅ 已完成 | Campaign CRUD (GET/POST) |
| `/api/campaigns/[id]` | ✅ 已完成 | Campaign 详情/更新/删除 (GET/PUT/DELETE) |
| `/api/campaigns/stats` | ✅ 已完成 | Campaign 统计 |
| `/api/campaigns/ai-generate` | ✅ 已完成 | AI 生成 Campaign 内容 |
| `/api/contacts` | ✅ 已完成 | Contact CRUD (GET/POST) |
| `/api/contacts/[id]` | ✅ 已完成 | Contact 详情/更新/删除 (GET/PUT/DELETE) |
| `/api/contacts/import/parse` | ✅ 已完成 | CSV 导入解析 |
| `/api/contacts/import/confirm` | ✅ 已完成 | CSV 导入确认 |
| `/api/companies` | ✅ 已完成 | Company CRUD |
| `/api/companies/[id]` | ✅ 已完成 | Company 详情/更新/删除 |
| `/api/templates` | ✅ 已完成 | Template CRUD |
| `/api/templates/[id]` | ✅ 已完成 | Template 详情/更新/删除 |
| `/api/prospecting` | ✅ 已完成 | 拓客任务创建/执行 |
| `/api/email-queue` | ✅ 已完成 | 邮件队列管理 (POST/GET) |
| `/api/email-queue/[jobId]` | ✅ 已完成 | 单个任务状态 |
| `/api/email-queue/retry` | ✅ 已完成 | 重试失败任务 |
| `/api/email-queue/clean` | ✅ 已完成 | 清理旧任务 |
| `/api/email/test` | ✅ 已完成 | 邮件测试发送 |
| `/api/email/track/open` | ✅ 已完成 | 打开追踪 (像素) |
| `/api/email/track/click` | ✅ 已完成 | 点击追踪 |
| `/api/email/track/event` | ✅ 已完成 | 事件追踪 |
| `/api/imap/fetch` | ✅ 已完成 | IMAP 邮件抓取 |
| `/api/imap/check-replies` | ✅ 已完成 | 回复检查与分类 |
| `/api/email-verify` | ✅ 已完成 | 邮箱验证 |
| `/api/upload/avatar` | ✅ 已完成 | 头像上传 |
| `/api/upload/attachment` | ✅ 已完成 | 附件上传 |
| `/api/stats` | ✅ 已完成 | 全局统计 |
| `/api/sse/stats` | ✅ 已完成 | SSE 实时统计推送 |

### 2.3 前端页面 ✅

| 页面 | 状态 | 说明 |
|------|------|------|
| `/` (首页/Landing) | ✅ 已完成 | 14 个 Landing 区块，Hero, Features, Pricing, FAQ 等 |
| `/login` | ✅ 已完成 | 登录页 |
| `/register` | ✅ 已完成 | 注册页 |
| `/dashboard` | ✅ 已完成 | 仪表盘（统计卡片、活动图表、快捷操作） |
| `/campaigns` | ⚠️ Mock 数据 | 列表页使用硬编码 Mock 数据，未对接真实 API |
| `/campaigns/new` | ✅ 已完成 | Campaign 创建向导（3 步：基本信息 → 目标人群 → AI 写作） |
| `/contacts` | ✅ 已完成 | 客户管理（CRUD、搜索、分页、CSV 导入导出、批量操作） |
| `/companies` | ✅ 已完成 | 公司管理页面 |
| `/prospecting` | ✅ 已完成 | 智能拓客页面（搜索条件表单 → 创建任务） |
| `/templates` | ✅ 已完成 | 邮件模板管理 |
| `/inbox` | ⚠️ Mock 数据 | 统一收件箱，AI Agent 回复，使用硬编码 Mock 数据 |
| `/email-test` | ✅ 已完成 | 邮件测试发送页面 |
| `/email-queue` | ✅ 已完成 | 邮件队列监控页面 |
| `/settings` | ⚠️ 前端 Mock | 个人资料 + 邮箱账户管理，状态仅存在前端 React state |

### 2.4 核心 Lib 模块 ✅

| 模块 | 状态 | 说明 |
|------|------|------|
| `email.ts` | ✅ 已完成 | Nodemailer SMTP 发送，单发/批量 |
| `email-worker.ts` | ✅ 已完成 | BullMQ Worker，处理队列邮件发送，追踪像素/链接注入 |
| `email-queue.ts` | ✅ 已完成 | BullMQ 队列管理，添加/批量添加/状态查询/重试/清理，降级直发 |
| `email-tracking.ts` | ✅ 已完成 | 打开追踪像素、点击追踪、记录打开事件 |
| `email-verify.ts` | ✅ 已完成 | 邮箱格式验证 |
| `imap.ts` | ✅ 已完成 | IMAP 客户端封装，收件抓取，回复检测 |
| `reply-classifier.ts` | ✅ 已完成 | 基于规则/关键词的回复意图分类（9 种意图） |
| `rocketreach.ts` | ✅ 已完成 | RocketReach API 封装（人物搜索、公司搜索、员工列表） |
| `openai.ts` | ✅ 已完成 | OpenAI API 调用封装 |
| `csv-import.ts` | ✅ 已完成 | CSV 解析与批量导入 |
| `auth-middleware.ts` | ✅ 已完成 | JWT 验证中间件 |
| `jwt.ts` | ✅ 已完成 | JWT 生成与验证 |
| `redis.ts` | ✅ 已完成 | Redis 连接 + 缓存封装 |
| `prisma.ts` | ✅ 已完成 | Prisma Client 单例 |
| `api-errors.ts` | ✅ 已完成 | 统一错误响应 |
| `validations.ts` | ✅ 已完成 | Zod 数据校验 |
| `rate-limit.ts` | ✅ 已完成 | 限流器 |
| `upload.ts` | ✅ 已完成 | Multer 文件上传 |
| `i18n.ts` | ✅ 已完成 | 国际化支持 |
| `events.ts` | ✅ 已完成 | 事件系统 |
| `utils.ts` | ✅ 已完成 | 工具函数 |

---

## 三、部分完成 / 需要增强的功能

| 功能 | 当前状态 | 缺口描述 |
|------|----------|----------|
| Campaign 前端数据对接 | ⚠️ Mock | `/campaigns` 页面使用硬编码 MOCK_CAMPAIGNS，未调用 `/api/campaigns` |
| Inbox 前端数据对接 | ⚠️ Mock | `/inbox` 页面使用硬编码 MOCK_THREADS，未调用 `/api/imap/*` |
| Settings 邮箱账户持久化 | ⚠️ 仅前端 state | 邮箱账户只存在 React state，未对接 EmailAccount 模型 API |
| Settings 个人资料保存 | ⚠️ 无 API 对接 | 表单无后端保存逻辑 |
| Campaign 启动/暂停 | ⚠️ 空函数 | `toggleCampaign` 只有 `console.log` |
| Campaign 删除 | ⚠️ 空函数 | `deleteCampaign` 只有 `console.log` |
| Inbox 发送回复 | ⚠️ Mock | `handleSend` 使用 `setTimeout` 模拟，无真实 SMTP 调用 |
| Prospecting 爬虫执行 | ⚠️ 仅创建任务 | 创建了 `ProspectingTask` 记录，但无实际爬虫执行逻辑 |
| RocketReach 集成 | ⚠️ 有 SDK 未完全对接 | `rocketreach.ts` 已封装但 API 层未直接调用保存数据到数据库 |
| AI 生成回复 | ⚠️ 硬编码 | Inbox 页面的 AI Draft 是硬编码文本，未调用 OpenAI API 实时生成 |
| A/B 测试 | ⚠️ Schema 有但无逻辑 | Campaign 模型有 `abTestEnabled` 等字段，但无 A/B 测试调度/判定逻辑 |
| Campaign 序列 (Sequence) | ⚠️ Schema 有但无逻辑 | `Campaign.sequence` 和 `Task.steps` 是 JSON 字段，无序列调度引擎 |
| 域名管理 / SPF/DKIM | ❌ 未实现 | 无域名验证、DNS 记录管理、SPF/DKIM 配置 |
| 发送窗口调度 | ⚠️ Schema 有但无逻辑 | `Campaign.sendingWindows` 字段存在，但 Worker 未按时区/窗口过滤 |
| 多账户 SMTP 轮换 | ❌ 未实现 | EmailAccount 模型存在，但 `sendMail` 只使用全局 SMTP 配置 |
| 退订管理 | ❌ 未实现 | 无退订链接生成、退订列表管理、合规 GDPR/CAN-SPAM |
| 链接重写追踪 | ⚠️ 基础实现 | `email-worker.ts` 中有简单 link replacement，但无 `/api/email/track/click` 的跳转页面 |
| 文件存储 (头像/附件) | ⚠️ 有上传 API 但无存储后端 | `upload.ts` 有 Multer 配置，但无实际文件存储策略 (S3/本地) |

---

## 四、未实现 / 缺失的功能（待办清单）

以下按模块分类，每项均为待办条目。修复完成后请将 `- [ ]` 改为 `- [x]`。

### 4.1 Campaign 实际发信调度

- [ ] 1. Campaign 启动/暂停/删除的前后端完整对接（替换当前 `console.log` 空函数）
- [ ] 2. Campaign 状态变更为 RUNNING 时，自动将联系人批量加入邮件队列（BullMQ）
- [ ] 3. 实现 Campaign 调度引擎：根据 `scheduleType`（IMMEDIATE/SCHEDULED/RECURRING）触发发信
- [ ] 4. 实现发送频率限流：`throttlePerHour` / `throttlePerDay` 控制
- [ ] 5. 实现发送时间窗口过滤：根据 `timezone` + `sendingWindows` 限制发送时段
- [ ] 6. 实现多步序列 (Sequence) 调度：Campaign `type=SEQUENCE` 时按配置的多封邮件间隔依次发送
- [ ] 7. 实现 Campaign A/B 测试逻辑：按流量分割、统计对比、自动判定胜出版本
- [ ] 8. 实现 Campaign 统计数据的实时计算（从 EmailLog 聚合，而非直接 +1 更新）

### 4.2 邮箱账户管理与 SMTP 轮换

- [ ] 9. 创建 EmailAccount 完整的 CRUD API 路由（当前 Settings 页面无后端）
- [ ] 10. 实现多账户 SMTP 轮换：从 EmailAccount 池中按健康度/限额选择发信账户
- [ ] 11. 实现每日发送限额自动重置（`dailySent` 每日归零逻辑）
- [ ] 12. 实现邮箱健康度监控：根据 bounce rate 自动降级或暂停不健康账户
- [ ] 13. 实现 SMTP 连接池管理，避免每次发邮件都创建新连接

### 4.3 IMAP 收件与统一收件箱

- [ ] 14. Inbox 前端对接真实 IMAP 数据（替换 MOCK_THREADS）
- [ ] 15. 实现定时 IMAP 轮询：每隔 N 分钟自动检查所有 EmailAccount 的收件箱
- [ ] 16. 实现多账户 IMAP 并行抓取（当前 `initializeIMAPClient` 只初始化一个全局账户）
- [ ] 17. IMAP 错误隔离：单个账户连接失败不应阻塞其他账户
- [ ] 18. 实现回复邮件与原始 EmailLog 的关联匹配（通过 In-Reply-To / References 头）
- [ ] 19. AI 实时生成回复草稿（当前为硬编码文本，需调用 OpenAI API 按联系人上下文生成）
- [ ] 20. Inbox 中"发送回复"按钮对接真实 SMTP 发信
- [ ] 21. OOO 自动跟进：识别不在办公室回复后，按返回日期自动重新跟进

### 4.4 智能拓客 (Prospecting)

- [ ] 22. 实现实际爬虫/数据采集引擎（当前仅创建 ProspectingTask 记录，无采集逻辑）
- [ ] 23. RocketReach API 与数据库的完整对接：搜索 → 自动保存 Company/Contact
- [ ] 24. 实现 AI 拓词建议（`keywordSuggestions` / `positionSuggestions` 字段的实际生成逻辑）
- [ ] 25. 实现爬虫进度实时更新（`crawlerStatus` / `crawlerProgress` 的实际推进）
- [ ] 26. 实现去重逻辑：避免重复采集已存在的 Company/Contact

### 4.5 域名管理与邮件合规

- [ ] 27. 发送域名管理：添加/验证自定义发送域名
- [ ] 28. DNS 记录指导：SPF、DKIM、DMARC 配置引导与验证
- [ ] 29. 域名预热 (Warm-up)：新域名/新邮箱的逐步增量发送策略
- [ ] 30. 退订链接自动生成：Campaign 邮件底部自动插入 unsubscribe 链接
- [ ] 31. 退订处理：退订列表管理，自动从后续 Campaign 中排除已退订联系人
- [ ] 32. GDPR/CAN-SPAM 合规：退订链接必须有效，发件人信息必须完整
- [ ] 33. 邮件投诉/Spam 反馈处理（如存在 Postmaster 接口）

### 4.6 追踪与分析

- [ ] 34. 点击追踪跳转页面：`/api/email/track/click` 需要 302 重定向到原始链接
- [ ] 35. 追踪数据的可视化报表：Campaign 级别的打开率、点击率、回复率趋势图
- [ ] 36. 联系人级别的互动时间线（何时打开、何时点击、何时回复）
- [ ] 37. 地理/IP 维度分析：打开邮件的用户来自哪些地区

### 4.7 文件存储

- [ ] 38. 实现文件持久化存储（当前 `upload.ts` 有 Multer 但无实际存储后端）
- [ ] 39. 头像上传对接真实存储（S3/Cloudflare R2/本地磁盘）
- [ ] 40. 邮件附件上传与管理

### 4.8 用户与租户

- [ ] 41. 注册流程完整化：邮箱验证、租户自动创建或加入
- [ ] 42. 套餐升级/降级逻辑（PlanType 变更时的限额控制）
- [ ] 43. 邀请团队成员（同一租户下多用户管理）
- [ ] 44. 用户权限控制（ADMIN/MANAGER/USER 的差异化 API 鉴权）

### 4.9 模板与 AI

- [ ] 45. 模板变量实际替换：发信时将 `{{firstName}}` 等变量替换为联系人真实数据
- [ ] 46. AI 生成模板的完整流程：用户输入 prompt → OpenAI → 保存为 EmailTemplate
- [ ] 47. 模板分类筛选与使用统计

### 4.10 产品管理

- [ ] 48. 产品管理前端页面（Product 模型存在但无独立页面）
- [ ] 49. 产品与 Campaign/Template 的关联推荐逻辑
- [ ] 50. AI 推荐产品 (`aiRecommendedProducts`) 的实际生成与使用

### 4.11 系统基础设施

- [ ] 51. 后台 Worker 进程管理：Email Worker 需要独立的 Node.js 进程运行（`npm run worker:email`），需配置进程守护（PM2/systemd）
- [ ] 52. Redis 高可用：生产环境需要 Redis 持久化与故障恢复
- [ ] 53. 数据库备份与恢复策略
- [ ] 54. 日志系统：结构化日志（Winston/Pino）+ 日志聚合
- [ ] 55. 错误告警：关键错误自动通知（邮件/钉钉/飞书）
- [ ] 56. 环境变量配置模板：`.env.example` 文件，列出所有必需环境变量
- [ ] 57. Docker 部署配置：Dockerfile + docker-compose.yml

### 4.12 测试与质量

- [ ] 58. 单元测试覆盖：核心 Lib 模块（reply-classifier, email-queue, csv-import）
- [ ] 59. E2E 测试：关键用户流程（注册 → 导入联系人 → 创建 Campaign → 发送）
- [ ] 60. API 集成测试：所有 API 路由的测试覆盖
- [ ] 61. 前端组件测试：关键 UI 组件的渲染与交互测试

---

## 五、优先级建议

### P0 — 核心阻塞（不完成则产品无法交付）

1. Campaign 实际发信调度（#1–#8）
2. 邮箱账户管理与 SMTP 轮换（#9–#13）
3. IMAP 收件与统一收件箱数据对接（#14–#21）
4. 后台 Worker 进程管理（#51）

### P1 — 重要功能（影响核心体验）

5. 智能拓客爬虫对接（#22–#26）
6. 域名管理与合规（#27–#33）
7. 追踪与分析完善（#34–#37）
8. 文件持久化存储（#38–#40）

### P2 — 锦上添花

9. 用户与租户完善（#41–#44）
10. 模板与 AI 增强（#45–#47）
11. 产品管理（#48–#50）
12. 系统基础设施（#52–#57）
13. 测试与质量（#58–#61）

---

## 六、关键架构决策记录

1. **发信架构**：使用 BullMQ 队列 + Redis，Worker 独立进程运行，降级直发兜底
2. **收信架构**：IMAP 轮询 + 规则分类（非 LLM），轻量快速
3. **AI 能力**：OpenAI API，用于文案生成、意图分类（待接入）
4. **数据源**：RocketReach API 为主，支持 CSV 手动导入
5. **认证**：JWT 无状态认证，密码 bcrypt 加密
6. **多租户**：通过 `tenantId` 隔离，非独立数据库

---

*本报告基于对完整代码库的静态分析生成。如需更新，请重新运行全代码审计。*

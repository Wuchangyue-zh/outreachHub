# OutreachHub 项目现状与开发缺口报告

> **生成日期**：2026-05-29  
> **复核日期**：2026-05-29（对照 `feat/landing-page` 分支实码二次审计）  
> **分支**：`feat/landing-page`  
> **审计范围**：Prisma Schema、API Routes、Frontend Pages、Lib 模块、Store、本地开发环境  
> **用途**：交给 Claude / 开发 Agent 按优先级逐项实现

---

## 零、本地开发环境（已验证）

| 组件 | 状态 | 配置说明 |
|------|------|----------|
| PostgreSQL | ✅ Docker | 容器名 `PostgreSQL`，端口 **5433→5432**（避开本机 Odoo PG 5432 冲突） |
| Redis | ✅ Docker | 容器名 `outreachhub-redis`，端口 **6379** |
| Next.js Dev | ✅ 本机 | `pnpm dev` / `npm run dev`，端口 **3030** |
| 演示账户 | ✅ seed | `admin@outreachhub.com` / `admin123`（需先 `npm run db:push` + `npm run db:seed`） |
| Email Worker | ⚠️ 需手动 | 另开终端 `npm run worker:email`（依赖 Redis） |

**`.env` 关键项（当前实际使用）：**

```env
DATABASE_URL="postgresql://postgres:wcy123456%21@localhost:5433/outreach_hub?sslmode=disable"
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
NEXTAUTH_URL="http://localhost:3030"
APP_URL="http://localhost:3030"
```

**注意事项：**

- 使用 `npm run db:*`，**不要**裸跑 `npx prisma`（会拉到 Prisma 7 导致 schema 报错）
- 项目锁定 **Prisma 5.22**，`schema.prisma` 中 `url = env("DATABASE_URL")` 写法正确
- Redis / 邮件队列为**可选增强**；未配置时邮件降级 SMTP 直发
- Docker Hub 拉镜像失败时可用国内镜像（如 DaoCloud）拉取后再 `docker tag`

---

## 一、项目概览

OutreachHub 是一个面向国内出海外贸企业的智能拓客与邮件营销 SaaS 平台。基于 **Next.js 15 (App Router) + React 18 + Prisma 5 + PostgreSQL + Redis/BullMQ** 构建，UI 使用 **TailwindCSS + Radix UI**。

### 技术栈

| 层次 | 技术 |
|------|------|
| 前端 | Next.js 15, React 18, TailwindCSS, Radix UI, Recharts, Zustand |
| 后端 | Next.js API Routes (App Router) |
| 数据库 | PostgreSQL (Prisma ORM v5) |
| 缓存/队列 | Redis + BullMQ（可选，有降级） |
| 邮件发送 | Nodemailer (SMTP) |
| 邮件接收 | IMAP + mailparser |
| AI | OpenAI API |
| 邮箱验证 | MillionVerifier API |
| 第三方数据 | RocketReach API |
| 认证 | JWT + bcryptjs（Cookie `auth-token`） |
| 文件上传 | 本机磁盘 `public/uploads/`（头像/附件 API 已实现） |
| 测试 | Jest（2 个单元测试）+ Playwright E2E（5 个 spec） |

---

## 二、已完成功能清单

### 2.1 数据库层 ✅

| 模块 | 状态 | 说明 |
|------|------|------|
| Prisma Schema | ✅ 已完成 | **13 个模型**，15+ 枚举类型，关系完整 |
| User / Tenant | ✅ 已完成 | 多租户模型，角色 (ADMIN/USER/MANAGER)，套餐 (FREE/BASIC/PRO/ENTERPRISE) |
| EmailAccount | ✅ 已完成 | SMTP/IMAP 配置、每日发送限额、健康度评分（**模型有，API/前端未对接**） |
| Company | ✅ 已完成 | 完整公司信息，行业代码，地址，社交链接 |
| Contact / ContactEmail | ✅ 已完成 | 客户信息，多邮箱支持，AI 画像，互动统计 |
| Product | ✅ 已完成 | 产品管理（**模型有，无独立前端页**） |
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
| `/api/ai/generate` | ✅ 已完成 | 通用 AI 文本生成（OpenAI） |
| `/api/email-queue` | ✅ 已完成 | 邮件队列管理 (POST/GET)，Redis 不可用时降级直发 |
| `/api/email-queue/[jobId]` | ✅ 已完成 | 单个任务状态 |
| `/api/email-queue/retry` | ✅ 已完成 | 重试失败任务 |
| `/api/email-queue/clean` | ✅ 已完成 | 清理旧任务 |
| `/api/email/test` | ✅ 已完成 | 邮件测试发送 |
| `/api/email/track/open` | ✅ 已完成 | 打开追踪（像素），参数 `e`/`c` |
| `/api/email/track/click` | ✅ 已完成 | 点击追踪 + **302 重定向**，参数 `e`/`c`/`u` |
| `/api/email/track/event` | ✅ 已完成 | 事件追踪 |
| `/api/imap/fetch` | ✅ 已完成 | IMAP 邮件抓取 |
| `/api/imap/check-replies` | ✅ 已完成 | 回复检查与分类 |
| `/api/email-verify` | ✅ 已完成 | MillionVerifier 邮箱验证（无 API Key 时返回 unknown） |
| `/api/upload/avatar` | ✅ 已完成 | 头像上传 → `public/uploads/avatars/` |
| `/api/upload/attachment` | ✅ 已完成 | 附件上传 → `public/uploads/attachments/` |
| `/api/stats` | ✅ 已完成 | 全局统计（Redis 缓存可选） |
| `/api/sse/stats` | ✅ 已完成 | SSE 实时统计推送 |

**缺失 API（待建）：**

| API 路由 | 说明 |
|----------|------|
| `/api/email-accounts` | EmailAccount CRUD（Settings 页需要） |
| `/api/users/me` | 个人资料读取/更新 |
| `/api/products` | Product CRUD |

### 2.3 前端页面 ✅

| 页面 | 状态 | 说明 |
|------|------|------|
| `/` (Landing) | ✅ 已完成 | 14 个 Landing 组件（Hero/Features/Pricing/FAQ 等），数据来自 `landing-data.ts` |
| `/login` | ✅ 已完成 | 登录页，含演示账户提示 |
| `/register` | ✅ 已完成 | 注册页 |
| `/dashboard` | ✅ 已完成 | 仪表盘（统计卡片、活动图表、快捷操作） |
| `/campaigns` | ⚠️ Mock 数据 | 列表页使用 `MOCK_CAMPAIGNS`，未调用 `/api/campaigns`；启动/删除为 `console.log` |
| `/campaigns/new` | ✅ 已完成 | Campaign 创建向导（3 步），使用 `campaign-wizard-store` |
| `/contacts` | ✅ 已完成 | 客户管理（CRUD、搜索、分页、CSV 导入导出、批量操作） |
| `/companies` | ✅ 已完成 | 公司管理，已对接 `/api/companies` |
| `/prospecting` | ✅ 已完成 | 智能拓客（创建 ProspectingTask，**无实际采集引擎**） |
| `/templates` | ✅ 已完成 | 邮件模板管理，已对接 API |
| `/inbox` | ⚠️ Mock 数据 | 统一收件箱 UI 完整，使用 `MOCK_THREADS`；**未出现在侧边栏导航**；**未加入 middleware 鉴权** |
| `/email-test` | ✅ 已完成 | 邮件测试发送页面 |
| `/email-queue` | ✅ 已完成 | 邮件队列监控页面 |
| `/settings` | ⚠️ 前端 Mock | 邮箱账户仅 React state；个人资料保存按钮无 API；头像上传未写回 User 表 |

**侧边栏导航（`dashboard-layout.tsx`）现有入口：**

仪表盘 · 智能拓客 · 客户管理 · 公司库 · 邮件营销 · 邮件模板 · 邮箱设置 · 队列监控

**缺失页面：**

| 路径 | 说明 |
|------|------|
| `/tasks` | middleware 有保护规则，但**无对应 page** |
| `/products` | Product 模型存在，无管理页 |

### 2.4 核心 Lib 模块 ✅

| 模块 | 状态 | 说明 |
|------|------|------|
| `email.ts` | ✅ 已完成 | Nodemailer SMTP 发送，单发/批量 |
| `email-worker.ts` | ⚠️ 有 Bug | BullMQ Worker；**追踪 URL 参数与 API 不一致**（见第七节） |
| `email-queue.ts` | ✅ 已完成 | BullMQ 队列，未配置 Redis 时不初始化，降级直发 |
| `email-tracking.ts` | ✅ 已完成 | 打开/点击追踪注入，参数 `e`/`c`/`u`（标准实现） |
| `email-verify.ts` | ✅ 已完成 | MillionVerifier API 封装 |
| `imap.ts` | ✅ 已完成 | IMAP 客户端，单全局账户 |
| `reply-classifier.ts` | ✅ 已完成 | 规则/关键词回复分类（**10 种类别**） |
| `rocketreach.ts` | ✅ 已完成 | RocketReach API 封装（**API 层未调用入库**） |
| `openai.ts` | ✅ 已完成 | OpenAI API 调用封装 |
| `csv-import.ts` | ✅ 已完成 | CSV 解析与批量导入 |
| `auth-middleware.ts` | ✅ 已完成 | JWT 验证中间件 |
| `jwt.ts` | ✅ 已完成 | JWT 生成与验证 |
| `redis.ts` | ✅ 已完成 | Redis 连接 + `withCache` 缓存封装 |
| `prisma.ts` | ✅ 已完成 | Prisma Client 单例 |
| `api-errors.ts` | ✅ 已完成 | 统一错误响应 |
| `validations.ts` | ✅ 已完成 | Zod 数据校验 |
| `rate-limit.ts` | ✅ 已完成 | 进程内内存限流（非 Redis） |
| `upload.ts` | ✅ 已完成 | 本机磁盘存储 `public/uploads/` |
| `i18n.ts` | ✅ 已完成 | 国际化支持 |
| `events.ts` | ✅ 已完成 | 内存 EventEmitter（SSE 用） |
| `landing-data.ts` | ✅ 已完成 | Landing 页静态文案/数据 |
| `utils.ts` | ✅ 已完成 | 工具函数 |

### 2.5 状态管理（Store）✅

| Store | 状态 | 说明 |
|-------|------|------|
| `store/auth-store.ts` | ✅ 已有 | 认证状态 |
| `store/campaign-wizard-store.ts` | ✅ 已有 | Campaign 创建向导多步状态 |

---

## 三、部分完成 / 需要增强的功能

| 功能 | 当前状态 | 缺口描述 |
|------|----------|----------|
| Campaign 前端数据对接 | ⚠️ Mock | `/campaigns` 使用 `MOCK_CAMPAIGNS`，未调用 `/api/campaigns` |
| Campaign 启动/暂停/删除 | ⚠️ 空函数 | `toggleCampaign` / `deleteCampaign` 仅 `console.log` |
| Inbox 前端数据对接 | ⚠️ Mock | `/inbox` 使用 `MOCK_THREADS`，未调用 `/api/imap/*` |
| Inbox 导航与鉴权 | ⚠️ 遗漏 | 页面存在但未加入侧边栏；middleware 未保护 `/inbox` |
| Settings 邮箱账户持久化 | ⚠️ 仅前端 state | 未对接 EmailAccount 模型，无 CRUD API |
| Settings 个人资料保存 | ⚠️ 无 API | 表单无 `/api/users/me` 后端 |
| Inbox 发送回复 | ⚠️ Mock | `handleSend` 用 `setTimeout` 模拟 |
| Inbox AI 草稿 | ⚠️ 硬编码 | 未调用 `/api/ai/generate` 或 OpenAI |
| Prospecting 爬虫执行 | ⚠️ 仅创建任务 | 只写 ProspectingTask 记录，无采集逻辑 |
| RocketReach 集成 | ⚠️ SDK 未入库 | `rocketreach.ts` 已封装，prospecting API 未保存到 DB |
| A/B 测试 | ⚠️ Schema 有但无逻辑 | `abTestEnabled` 等字段无调度/判定 |
| Campaign 序列 (Sequence) | ⚠️ Schema 有但无逻辑 | `sequence` / `Task.steps` JSON 无调度引擎 |
| 域名管理 / SPF/DKIM | ❌ 未实现 | 无域名验证、DNS 管理 |
| 发送窗口调度 | ⚠️ Schema 有但无逻辑 | `sendingWindows` 字段 Worker 未使用 |
| 多账户 SMTP 轮换 | ❌ 未实现 | `sendMail` 仅用全局 `.env` SMTP |
| 退订管理 | ❌ 未实现 | 无退订链接、列表、合规 |
| Worker 追踪参数不一致 | 🐛 Bug | `email-worker.ts` 用 `?id=` / `?url=`，API 期望 `e`/`c`/`u` |
| 头像持久化 | ⚠️ 半完成 | 上传 API 可用，但未更新 User.avatar |
| 生产文件存储 | ⚠️ 仅本地盘 | 无 S3/R2 策略，部署需额外方案 |

---

## 四、未实现 / 缺失的功能（待办清单）

以下按模块分类。完成后将 `- [ ]` 改为 `- [x]`。

### 4.1 Campaign 实际发信调度

- [x] 1. `/campaigns` 列表对接 `/api/campaigns` + `/api/campaigns/stats`（替换 `MOCK_CAMPAIGNS`）
- [x] 2. Campaign 启动/暂停/删除前后端完整对接（替换 `console.log`）
- [x] 3. Campaign 状态变更为 RUNNING 时，批量将联系人加入 BullMQ 队列
- [ ] 4. 调度引擎：`scheduleType`（IMMEDIATE/SCHEDULED/RECURRING）
- [ ] 5. 发送频率限流：`throttlePerHour` / `throttlePerDay`
- [ ] 6. 发送时间窗口：`timezone` + `sendingWindows`
- [ ] 7. 多步序列：`type=SEQUENCE` 按间隔依次发送
- [ ] 8. A/B 测试：流量分割、统计对比、胜出版本判定
- [ ] 9. Campaign 统计从 EmailLog 聚合（减少直接 +1 漂移）

### 4.2 邮箱账户管理与 SMTP 轮换

- [x] 10. 新建 `/api/email-accounts` CRUD API
- [x] 11. Settings 页对接 EmailAccount API（替换 React state）
- [ ] 12. 多账户 SMTP 轮换：按健康度/限额选账户
- [ ] 13. `dailySent` 每日归零 Cron
- [ ] 14. 健康度监控：bounce rate 自动降级/暂停
- [ ] 15. SMTP 连接池

### 4.3 IMAP 收件与统一收件箱

- [x] 16. Inbox 对接真实 IMAP 数据（替换 `MOCK_THREADS`）
- [x] 17. 侧边栏加入「统一收件箱」入口；middleware 保护 `/inbox`
- [ ] 18. 定时 IMAP 轮询（Cron / Worker）
- [ ] 19. 多 EmailAccount 并行 IMAP 抓取
- [ ] 20. 单账户失败不阻塞其他账户
- [ ] 21. 回复与 EmailLog 关联（In-Reply-To / References）
- [x] 22. AI 实时回复草稿（调用 OpenAI，带联系人上下文）
- [x] 23. Inbox「发送回复」对接 SMTP
- [ ] 24. OOO 自动跟进

### 4.4 智能拓客 (Prospecting)

- [ ] 25. 实际爬虫/数据采集引擎
- [ ] 26. RocketReach 搜索 → 自动保存 Company/Contact
- [ ] 27. AI 拓词/职位建议（`keywordSuggestions` / `positionSuggestions`）
- [ ] 28. 爬虫进度实时更新（`crawlerStatus` / `crawlerProgress`）
- [ ] 29. 去重：跳过已存在 Company/Contact

### 4.5 域名管理与邮件合规

- [ ] 30. 发送域名管理 + 验证
- [ ] 31. SPF / DKIM / DMARC 配置引导
- [ ] 32. 域名 Warm-up 策略
- [ ] 33. 退订链接自动生成
- [ ] 34. 退订列表 + Campaign 自动排除
- [ ] 35. GDPR / CAN-SPAM 合规
- [ ] 36. Spam 反馈处理

### 4.6 追踪与分析

- [x] 37. **修复 Worker 追踪 URL 参数**：统一使用 `email-tracking.ts` 的 `addEmailTracking()`，或修正 `email-worker.ts` 参数为 `e`/`c`/`u`
- [ ] 38. Campaign 级打开率/点击率/回复率趋势图
- [ ] 39. 联系人互动时间线
- [ ] 40. 地理/IP 分析

### 4.7 文件存储与用户资料

- [x] 41. 头像上传后更新 `User.avatar`
- [x] 42. `/api/users/me` GET/PUT（个人资料）
- [ ] 43. 生产环境对象存储（S3 / R2）策略
- [ ] 44. 邮件附件管理与 Campaign 关联

### 4.8 用户与租户

- [ ] 45. 注册流程：邮箱验证、租户自动创建
- [ ] 46. 套餐升级/降级与限额控制
- [ ] 47. 团队成员邀请
- [ ] 48. ADMIN/MANAGER/USER 差异化 API 鉴权

### 4.9 模板与 AI

- [ ] 49. 发信时模板变量替换（`{{firstName}}` 等）
- [ ] 50. AI 生成模板完整流程（prompt → OpenAI → 保存 EmailTemplate）
- [ ] 51. 模板分类筛选与使用统计

### 4.10 产品管理

- [ ] 52. 产品管理前端页（`/products`）
- [ ] 53. 产品与 Campaign/Template 关联推荐
- [ ] 54. `aiRecommendedProducts` 实际生成与使用

### 4.11 系统基础设施

- [ ] 55. Email Worker 进程守护（PM2 / systemd）
- [ ] 56. Redis 生产持久化与高可用
- [ ] 57. 数据库备份策略
- [ ] 58. 结构化日志（Pino/Winston）
- [ ] 59. 错误告警（邮件/钉钉/飞书）
- [ ] 60. **更新 `.env.example`**：补充 Redis、MillionVerifier、端口 3030 等（当前缺失 Redis 项）
- [ ] 61. Dockerfile + docker-compose.yml（PostgreSQL + Redis + App）

### 4.12 测试与质量

- [ ] 62. 单元测试：reply-classifier、email-queue、csv-import
- [ ] 63. E2E：注册 → 导入联系人 → 创建 Campaign → 发送
- [ ] 64. API 集成测试全覆盖
- [ ] 65. 关键 UI 组件测试

---

## 五、优先级建议

### P0 — 核心阻塞（不完成则产品无法交付）

1. Campaign 列表/操作 API 对接 + 实际发信调度（#1–#9）
2. EmailAccount API + Settings 持久化 + SMTP 轮换（#10–#15）
3. Inbox 真实数据 + 导航/鉴权 + 回复发信（#16–#24）
4. 修复 Worker 追踪 URL Bug（#37）
5. Email Worker 进程管理（#55）

### P1 — 重要功能

6. 智能拓客 + RocketReach 入库（#25–#29）
7. 域名合规 + 退订（#30–#36）
8. 追踪报表（#38–#40）
9. 用户资料 API + 头像持久化（#41–#42）

### P2 — 锦上添花

10. 用户租户完善（#45–#48）
11. 模板 AI 增强（#49–#51）
12. 产品管理（#52–#54）
13. 基础设施 + Docker 部署（#56–#61）
14. 测试覆盖（#62–#65）

---

## 六、已知 Bug 与已修复项

| 问题 | 状态 | 说明 |
|------|------|------|
| SSE `Controller is already closed` | ✅ 已修复 | `sse/stats/route.ts` 增加 cleanup + safeEnqueue |
| Dashboard `emails_SENT.toLocaleString` 崩溃 | ✅ 已修复 | `/api/stats` 默认返回 0；组件 merge 兜底 |
| 未配置 Redis 时 `[EmailQueue] Queue error` 刷屏 | ✅ 已修复 | 未配置 REDIS_URL/HOST 时不初始化队列 |
| Worker 追踪 URL 参数不匹配 | 🐛 待修复 | `email-worker.ts` vs `email-tracking.ts` / track API |
| `/inbox` 无鉴权 | 🐛 待修复 | middleware 未包含 `/inbox` |
| Prisma 7 vs 5 版本冲突 | ⚠️ 规避 | 使用 `npm run db:*`，勿裸 `npx prisma` |

---

## 七、关键架构决策记录

1. **发信架构**：BullMQ + Redis，Worker 独立进程（`npm run worker:email`），队列不可用时 SMTP 直发兜底
2. **收信架构**：IMAP 轮询 + 规则分类（`reply-classifier`，非 LLM）
3. **AI 能力**：OpenAI API — 文案生成、Inbox 草稿（待接入）、Campaign AI 生成（部分已接）
4. **数据源**：RocketReach API + CSV 手动导入
5. **认证**：JWT Cookie 无状态，bcrypt 密码
6. **多租户**：`tenantId` 字段隔离，非独立库
7. **追踪标准**：`email-tracking.ts` 为权威实现；Worker 应复用而非重复实现

---

## 八、Claude 执行指引

**建议执行顺序：**

```
[x] P0-1  Campaign 列表对接 API          → src/app/campaigns/page.tsx
[x] P0-2  EmailAccount CRUD API          → src/app/api/email-accounts/
[x] P0-3  Settings 对接 API              → src/app/settings/page.tsx
[x] P0-4  修复 email-worker 追踪参数      → src/lib/email-worker.ts（改用 addEmailTracking）
[x] P0-5  Inbox 对接 IMAP + 加入导航      → src/app/inbox/page.tsx, dashboard-layout.tsx, middleware.ts
[x] P0-6  Campaign 启动 → 队列批量发信    → src/app/api/campaigns/[id]/launch/route.ts + email-queue.ts
```

**关键文件索引：**

| 领域 | 文件 |
|------|------|
| 数据模型 | `prisma/schema.prisma` |
| 邮件发送 | `src/lib/email.ts`, `email-queue.ts`, `email-worker.ts` |
| 邮件追踪 | `src/lib/email-tracking.ts`, `src/app/api/email/track/*` |
| 认证 | `src/lib/jwt.ts`, `auth-middleware.ts`, `src/middleware.ts` |
| 种子数据 | `prisma/seed.ts` |
| 环境变量 | `.env`, `.env.example`（待更新） |

**开发命令：**

```bash
npm install
npm run db:push      # 建表（Prisma 5）
npm run db:seed      # 演示数据
npm run dev          # :3030
npm run worker:email # 另开终端，需 Redis
```

---

*本报告基于 2026-05-29 对 `feat/landing-page` 分支的静态代码审计与本地环境验证。如需更新，请重新运行全代码审计。*

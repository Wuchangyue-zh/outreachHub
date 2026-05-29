# OutreachHub 项目现状与开发缺口报告

> **生成日期**：2026-05-29  
> **最后更新**：2026-05-29（P0 首轮完成 + 代码审查修复 + 邮件架构澄清）  
> **分支**：`feat/landing-page`  
> **审计范围**：Prisma Schema、API Routes、Frontend Pages、Lib 模块、Store、本地开发环境  
> **用途**：交给 Claude / 开发 Agent 按优先级逐项实现

---

## 状态图例

| 标记 | 含义 |
|------|------|
| ✅ | 已完成，可正常使用 |
| ⚠️ | 部分完成 / 有已知限制 |
| ❌ | 未实现 |
| 🐛 | 曾有 Bug，已修复或未修复（见说明） |

---

## 零、本地开发环境（已验证）

| 组件 | 状态 | 配置说明 |
|------|------|----------|
| PostgreSQL | ✅ Docker | 容器名 `PostgreSQL`，端口 **5433→5432**（避开本机 Odoo PG 5432 冲突） |
| Redis | ✅ Docker | 容器名 `outreachhub-redis`，端口 **6379** |
| Next.js Dev | ✅ 本机 | `pnpm dev` / `npm run dev`，端口 **3030** |
| 演示账户 | ✅ seed | `admin@outreachhub.com` / `admin123`（需先 `npm run db:push` + `npm run db:seed`） |
| Email Worker | ⚠️ 需手动 | 另开终端 `npm run worker:email`（依赖 Redis；Campaign 发信必须跑） |

**`.env` 关键项：**

```env
DATABASE_URL="postgresql://postgres:wcy123456%21@localhost:5433/outreach_hub?sslmode=disable"
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
NEXTAUTH_URL="http://localhost:3030"
APP_URL="http://localhost:3030"

# 平台系统邮件 SMTP（见「1.1 邮件架构」）
SMTP_HOST=...
SMTP_USER=noreply@outreachhub.com
SMTP_PASSWORD=...

# 火山方舟（豆包）AI
OPENAI_API_KEY=...
OPENAI_BASE_URL="https://ark.cn-beijing.volces.com/api/v3"
OPENAI_MODEL="doubao-seed-2-0-pro-260215"
```

**注意事项：**

- 使用 `npm run db:*`，**不要**裸跑 `npx prisma`（会拉到 Prisma 7）
- 项目锁定 **Prisma 5.22**
- Redis 未配置时邮件队列降级 SMTP 直发
- **用户营销邮件目前仍走 `.env` SMTP**（EmailAccount 仅存库未接入发信，见 1.1）

---

## 一、项目概览

OutreachHub 是面向国内出海外贸企业的智能拓客与邮件营销 SaaS 平台。基于 **Next.js 15 + React 18 + Prisma 5 + PostgreSQL + Redis/BullMQ** 构建。

### 1.1 邮件架构（重要 — Claude 必读）

**目标架构（产品应有，尚未完全实现）：**

```
┌─────────────────────────────────────────────────────────────┐
│  .env SMTP（平台级）                                          │
│  noreply@outreachhub.com                                     │
│  用途：注册成功、找回密码、账单通知、系统告警                    │
│  入口：sendPlatformMail()  ← ❌ 尚未拆分，目前与营销共用       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  EmailAccount 表（用户级，Settings 配置）                      │
│  sales@客户公司.com + smtpHost/smtpUser/smtpPassword           │
│  用途：Campaign 发信、Inbox 回复、邮件测试                      │
│  入口：sendUserMail({ emailAccountId })  ← ❌ 尚未实现         │
└─────────────────────────────────────────────────────────────┘
```

| 邮件类型 | 应使用的 SMTP | 当前实际 |
|----------|---------------|----------|
| 平台系统通知 | `.env` SMTP | ⚠️ 未单独实现（注册等尚无发信） |
| Campaign / Inbox / 队列 | 数据库 `EmailAccount` | ❌ **仍全部走 `.env`** |
| Settings 保存的邮箱 | 存 DB ✅ | 发信时未读取 ❌ |

**Claude 下一优先级任务：** 实现双通道发信（见 **4.2 #12a–#12e**）。

### 1.2 技术栈

| 层次 | 技术 |
|------|------|
| 前端 | Next.js 15, React 18, TailwindCSS, Radix UI, Recharts, Zustand |
| 后端 | Next.js API Routes (App Router) |
| 数据库 | PostgreSQL (Prisma ORM v5) |
| 缓存/队列 | Redis + BullMQ（可选，有降级） |
| 邮件发送 | Nodemailer (SMTP) — **待拆分为平台/用户两路** |
| 邮件接收 | IMAP + mailparser（单全局 `.env` 账户） |
| AI | 火山方舟（OpenAI 兼容 API，`openai.ts`） |
| 邮箱验证 | MillionVerifier API |
| 第三方数据 | RocketReach API |
| 认证 | JWT + bcryptjs（Cookie `auth-token`） |
| 文件上传 | 本机磁盘 `public/uploads/` |
| 测试 | Jest（2 个）+ Playwright E2E（5 个 spec） |

---

## 二、已完成功能清单

### 2.1 数据库层

| 模块 | 状态 | 说明 |
|------|------|------|
| Prisma Schema | ✅ | **13 个模型**，15+ 枚举 |
| User / Tenant | ✅ | 多租户、角色、套餐 |
| EmailAccount | ⚠️ | 模型 + CRUD API ✅；**发信未接入** ❌ |
| Company / Contact / ContactEmail | ✅ | 完整 CRUD |
| Product | ⚠️ | 模型有，无前端页 |
| EmailTemplate / Campaign / Task | ✅ | Schema 完整；Campaign 调度逻辑部分完成 |
| EmailLog | ✅ | 追踪、回复分类字段 |
| ProspectingTask / SearchHistory | ✅ | 模型有；爬虫未实现 |

### 2.2 API 路由层

| API 路由 | 状态 | 说明 |
|----------|------|------|
| `/api/auth/*` | ✅ | login / logout / register |
| `/api/campaigns` + `[id]` + `stats` + `ai-generate` | ✅ | CRUD + PATCH 状态 + 统计 + AI |
| `/api/campaigns/[id]/launch` | ⚠️ | 批量入队 ✅；变量替换 ✅；**仍用 .env SMTP** |
| `/api/contacts` + import | ✅ | CRUD + CSV |
| `/api/companies` / `/api/templates` | ✅ | CRUD |
| `/api/prospecting` | ⚠️ | 创建任务 ✅；无采集引擎 |
| `/api/ai/generate` | ✅ | generate-email / generate-subject / **generate-reply** |
| `/api/email-queue/*` | ✅ | 队列 + 降级直发 |
| `/api/email/test` | ⚠️ | 测试发信；**用 .env SMTP**；支持 `plain` 模式 |
| `/api/email/track/*` | ✅ | open / click(302) / event |
| `/api/imap/*` | ⚠️ | fetch / check-replies；**单全局 IMAP 账户** |
| `/api/email-accounts` + `[id]` | ✅ | CRUD；GET 密码脱敏 `********` |
| `/api/users/me` | ✅ | GET/PUT 个人资料 + avatar |
| `/api/inbox/threads` | ⚠️ | 从 **EmailLog.repliedAt** 聚合；**非实时 IMAP**；已 tenant 过滤 |
| `/api/stats` / `/api/sse/stats` | ✅ | 统计 + SSE（SSE 已修 cleanup） |
| `/api/upload/*` | ✅ | 头像/附件 → 本地磁盘 |

**仍缺失 API：**

| API 路由 | 说明 |
|----------|------|
| `/api/products` | Product CRUD |
| `/api/inbox/reply` | 专用回复发信（可选，当前复用 `/api/email/test`） |
| 平台系统邮件 | 注册确认、密码重置等（尚无） |

### 2.3 前端页面

| 页面 | 状态 | 说明 |
|------|------|------|
| `/` Landing | ✅ | 14 区块 |
| `/login` `/register` | ✅ | 含演示账户提示 |
| `/dashboard` | ✅ | 统计卡片、图表 |
| `/campaigns` | ✅ | 对接 API；Launch / 暂停 / 删除 |
| `/campaigns/new` | ✅ | 3 步向导 + AI 生成 |
| `/contacts` `/companies` | ✅ | 完整 CRUD |
| `/templates` | ✅ | 对接 API + AI |
| `/inbox` | ⚠️ | UI 完整；真实数据来自 EmailLog；AI 草稿 + 发信已接 API；**无回复数据时为空** |
| `/settings` | ✅ | EmailAccount CRUD + 个人资料 + 头像写回 |
| `/email-queue` `/email-test` | ✅ | 队列监控、SMTP 测试 |
| `/prospecting` | ⚠️ | 创建任务 UI；无采集 |

**侧边栏：** 仪表盘 · 拓客 · 客户 · 公司 · 邮件营销 · 模板 · **统一收件箱** · 邮箱设置 · 队列监控

**缺失页面：** `/tasks`（middleware 有规则无 page）、`/products`

### 2.4 核心 Lib 模块

| 模块 | 状态 | 说明 |
|------|------|------|
| `email.ts` | ⚠️ | 仅 `.env` SMTP；**待拆 platform / user** |
| `email-worker.ts` | ✅ | Worker + `addEmailTracking`；**仍用 .env transporter** |
| `email-queue.ts` | ✅ | 队列 + 直发追踪（先建 log 再 inject） |
| `email-tracking.ts` | ✅ | 标准 `e`/`c`/`u` 参数 |
| `email-variables.ts` | ✅ | Launch 变量替换 `{{firstName}}` 等 |
| `openai.ts` | ✅ | 火山方舟兼容；Campaign/Reply/Email 生成 |
| `imap.ts` | ⚠️ | 单全局账户 |
| `reply-classifier.ts` | ✅ | 10 类回复分类 |
| `rocketreach.ts` | ⚠️ | SDK 有；未入库 |
| 其他 auth/redis/upload 等 | ✅ | 正常 |

---

## 三、P0 首轮完成情况（2026-05-29）

| 任务 | 状态 | 备注 |
|------|------|------|
| P0-1 Campaign 列表 API 对接 | ✅ | `campaigns/page.tsx` |
| P0-2 EmailAccount CRUD API | ✅ | 密码脱敏；**发信未接** |
| P0-3 Settings + `/api/users/me` | ✅ | |
| P0-4 Worker 追踪参数 | ✅ | 使用 `addEmailTracking` |
| P0-5 Inbox 导航/鉴权/数据 | ⚠️ | EmailLog 线程非 IMAP；AI/发信已修 |
| P0-6 Campaign Launch 入队 | ⚠️ | 入队 ✅；跳过已发联系人 ✅；**SMTP 仍 .env** |

**P0 遗留 → 升为 P0'（下一 sprint）：**

- **双通道 SMTP**（#12a–#12e）— 阻塞真实 multi-tenant 发信
- **Worker 进程部署说明**（#55）— 文档/脚本
- **Inbox 真实 IMAP 数据源**（#16b–#16d）— 当前仅 EmailLog 聚合

---

## 四、待办清单（Claude 按编号实现）

完成后将 `- [ ]` 改为 `- [x]`。

### 4.1 Campaign 发信调度

- [x] 1. `/campaigns` 列表对接 API
- [x] 2. 启动/暂停/删除前后端对接
- [x] 3. Launch 批量入 BullMQ；跳过已发送联系人
- [ ] 4. 调度引擎：`scheduleType`（IMMEDIATE / SCHEDULED / RECURRING）
- [x] 5. `throttlePerDay` 入队上限（Launch 已 slice；**throttlePerHour 未实现**）
- [ ] 6. 发送时间窗口：`timezone` + `sendingWindows`
- [ ] 7. 多步序列：`type=SEQUENCE` 按间隔发送
- [ ] 8. A/B 测试：流量分割、胜出版本判定
- [ ] 9. Campaign 统计从 EmailLog 聚合（减少 Worker 直接 +1 漂移）
- [x] 9a. Launch 模板变量替换（`email-variables.ts`，含 `{{CompanyName}}` 等）

### 4.2 邮箱账户与 SMTP 双通道（🔴 下一优先级）

- [x] 10. `/api/email-accounts` CRUD
- [x] 11. Settings 页对接 API
- [ ] **12a. 拆分 `sendPlatformMail()` / `sendUserMail()`**（`email.ts`）
- [ ] **12b. Worker / 队列 / Launch 使用 EmailAccount SMTP 发信**
- [ ] **12c. Inbox 回复 / 邮件测试使用用户选定 EmailAccount**
- [ ] **12d. Campaign 绑定 `emailAccountId`（Schema 可选字段 + 向导选择）**
- [ ] 12. 多账户轮换：按 `healthScore` / `dailyLimit` / `dailySent` 选账户
- [ ] 13. `dailySent` 每日归零（Cron 或 Launch 前 lazy reset）
- [ ] 14. 健康度：bounce rate 自动降级
- [ ] 15. SMTP 连接池（可选优化）
- [ ] 15a. EmailAccount 密码加密存储（当前明文；Schema 注释写加密但未做）

### 4.3 IMAP 与统一收件箱

- [x] 16. Inbox 基础数据 API（`/api/inbox/threads`，EmailLog 聚合 + tenant 过滤）
- [x] 17. 侧边栏 + middleware 鉴权
- [ ] **16b. 改名为/文档化：当前非 IMAP 实时，依赖 EmailLog.repliedAt**
- [ ] **16c. 定时 IMAP 轮询 Worker**（Cron 调 `/api/imap/check-replies` 或独立 job）
- [ ] 18. 多 EmailAccount 并行 IMAP（读 DB 账户，非 `.env`）
- [ ] 19. 单账户 IMAP 失败隔离
- [ ] 20. 回复正文入库（当前 thread 出站/入站都用 `log.content`，**缺独立 replyBody 字段**）
- [ ] 21. In-Reply-To / References 关联 EmailLog
- [x] 22. AI 回复草稿（`generate-reply` + 火山方舟）
- [x] 23. Inbox 发送回复（`/api/email/test?plain=true`；**待改走 EmailAccount**）
- [ ] 24. OOO 自动跟进

### 4.4 智能拓客

- [ ] 25. 爬虫/采集引擎
- [ ] 26. RocketReach → 保存 Company/Contact
- [ ] 27. AI 拓词/职位建议
- [ ] 28. 爬虫进度更新
- [ ] 29. 去重

### 4.5 域名与合规

- [ ] 30–36. 域名验证、SPF/DKIM/DMARC、Warm-up、退订、GDPR

### 4.6 追踪与分析

- [x] 37. Worker / 直发追踪 URL（`addEmailTracking`，`e`/`c`/`u`）
- [ ] 38. Campaign 趋势图
- [ ] 39. 联系人互动时间线
- [ ] 40. 地理/IP 分析

### 4.7 文件存储

- [x] 41. 头像 → `User.avatar`
- [x] 42. `/api/users/me`
- [ ] 43. 生产对象存储 S3/R2
- [ ] 44. 邮件附件与 Campaign 关联
- [ ] 44a. 邮件 HTML 内外链图片公网 URL（非 localhost）

### 4.8 用户与租户

- [ ] 45. 注册邮箱验证 + **平台 SMTP 发欢迎信**
- [ ] 46. 套餐限额
- [ ] 47. 团队邀请
- [ ] 48. 角色差异化鉴权

### 4.9 模板与 AI

- [x] 49. Launch 变量替换（见 9a）
- [ ] 50. AI 生成模板完整流程
- [ ] 51. 模板分类与统计

### 4.10 产品管理

- [ ] 52–54. `/products` 页与关联推荐

### 4.11 基础设施

- [ ] 55. Worker 守护（PM2 / docker-compose service）
- [ ] 56–59. Redis HA、备份、日志、告警
- [x] 60. `.env.example` 已补充 Redis + 火山方舟（部分）
- [ ] 61. Dockerfile + docker-compose（PG + Redis + App + Worker）

### 4.12 测试

- [ ] 62–65. 单元 / E2E / API / UI 测试

---

## 五、优先级建议（更新版）

### P0' — 立即做（阻塞真实发信）

1. **SMTP 双通道 #12a–#12d**（用户 EmailAccount 真正用于 Campaign/Inbox）
2. **Campaign 选发件账户 #12d**
3. **Worker 使用 EmailAccount transporter #12b**

### P1 — 重要

4. IMAP 多账户 + 定时轮询（#16c–#19）
5. 注册/系统邮件 + 平台 SMTP（#45）
6. 调度引擎 + 时间窗口（#4、#6）
7. RocketReach 入库（#26）
8. 域名/退订合规（#30–#36）

### P2 — 增强

9. A/B、Sequence、产品页、S3、测试覆盖

---

## 六、已知 Bug 与修复记录

| 问题 | 状态 | 说明 |
|------|------|------|
| SSE Controller closed | ✅ 已修复 | safeEnqueue + cleanup |
| Dashboard emails_SENT 崩溃 | ✅ 已修复 | API 默认 0 |
| Redis 未配置 Queue 刷屏 | ✅ 已修复 | 条件初始化队列 |
| Worker 追踪 URL 参数 | ✅ 已修复 | addEmailTracking |
| Launch 用 `pending` 作追踪 ID | ✅ 已修复 | 追踪移至 Worker/直发 |
| Inbox 错误 API 路径 | ✅ 已修复 | `/api/email/test` |
| Inbox AI 错误请求体 | ✅ 已修复 | `generate-reply` |
| Inbox Mock 误导 | ✅ 已修复 | 无数据时空状态 |
| Inbox 无 tenant 过滤 | ✅ 已修复 | threads API |
| EmailAccount GET 泄露密码 | ✅ 已修复 | 脱敏 + PUT 忽略 `********` |
| **营销邮件仍用 .env SMTP** | ❌ 待实现 | 见 4.2 #12a–#12d |
| Prisma 7 版本冲突 | ⚠️ 规避 | 用 `npm run db:*` |

---

## 七、架构决策记录

1. **发信架构（目标）**：平台 `.env` SMTP ≠ 用户 `EmailAccount` SMTP；当前仅实现后者存储、前者发送
2. **队列**：BullMQ + Redis；Worker 独立进程；无 Redis 降级直发
3. **收信**：IMAP + 规则分类；Inbox UI 暂读 EmailLog 聚合
4. **AI**：火山方舟 OpenAI 兼容 API（`OPENAI_BASE_URL` + `OPENAI_MODEL`）
5. **追踪**：`email-tracking.ts` 为唯一标准；参数 `e`/`c`/`u`
6. **多租户**：`tenantId` 字段隔离
7. **变量**：`email-variables.ts` 大小写不敏感 `{{key}}`

---

## 八、Claude 执行指引

> **给 Claude 的说明（用户已休息，请自主连续执行）：**  
> 1. 严格按 **Phase 1 → 2 → 3** 顺序做，做完一个 Phase 跑 `npm run build`  
> 2. 每完成一项，在本文第四节 + 下方队列里把 `[ ]` 改为 `[x]`  
> 3. 不要重复「已完成（勿重复）」里的工作  
> 4. 每项完成后写 1 行 commit 风格摘要（用户醒来可看 git log）  
> 5. 遇到 Schema 变更：`npm run db:push` 后说明  
> 6. Phase 1 全部完成前 **不要** 开 Phase 2

### 已完成（勿重复）

```
[x] P0-1  Campaign 列表 API
[x] P0-2  EmailAccount CRUD API
[x] P0-3  Settings + /api/users/me
[x] P0-4  Worker 追踪
[x] P0-5  Inbox 基础（EmailLog 线程 + 导航 + AI/发信）
[x] P0-6  Campaign Launch 入队
[x] 审查修复  launch 追踪 / inbox API / 密码脱敏 / 直发追踪
[x] 火山方舟 AI 对接
```

---

### Phase 1 — SMTP 双通道（🔴 必须先做）

| # | 任务 | 关键文件 | 验收标准 |
|---|------|----------|----------|
| P0'-1 | ✅ 拆分 `sendPlatformMail()` / `sendUserMail({ emailAccountId })` | `email.ts`, 新建 `email-account-mail.ts` | 平台邮件只用 `.env`；用户邮件读 DB SMTP |
| P0'-2 | ✅ Worker + 队列直发改用 EmailAccount | `email-worker.ts`, `email-queue.ts`, `EmailJobData` 加 `emailAccountId` | 发信日志 fromEmail 为用户邮箱 |
| P0'-3 | ✅ Campaign 绑定发件账户 | `schema.prisma` 加 `emailAccountId?`；`campaigns/new` 选账户；Launch 传入 | 向导可选邮箱；Launch 用指定账户 |
| P0'-4 | ✅ Settings 测试 + Inbox 回复走 EmailAccount | `settings/page.tsx`, `inbox/page.tsx`, `api/email/test` | 测试邮件从用户 SMTP 发出 |
| P0'-5 | ✅ `selectEmailAccount(userId)` 轮换 | `lib/select-email-account.ts` | 超 dailyLimit 跳过；取 healthScore 最高 |

**Phase 1 完成后：** `npm run build` ✅ → 进入 Phase 2

---

### Phase 2 — 收信 + 平台邮件 + 调度基础（P1 第一批）

| # | 任务 | 关键文件 | 验收标准 |
|---|------|----------|----------|
| P1-1 | IMAP 多账户：读 EmailAccount 而非 `.env` | `imap.ts`, `api/imap/*` | check-replies 遍历用户 active 账户 |
| P1-2 | 定时轮询回复（Cron API Route） | 新建 `api/cron/check-replies/route.ts` + `vercel.json` cron 或文档说明本地手动调 | 可调通；文档写清如何触发 |
| P1-3 | EmailLog 存独立 `replyBody` 字段 | `schema.prisma`, `imap.ts`, `inbox/threads` | 收件箱「对方消息」显示回复正文 |
| P1-4 | 注册成功欢迎邮件 | `api/auth/register/route.ts`, `sendPlatformMail` | 注册后收到平台 SMTP 邮件 |
| P1-5 | `dailySent` 归零逻辑 | `select-email-account.ts` 或 Launch 前 | 跨天自动 reset dailySent |
| P1-6 | Campaign 调度：`SCHEDULED` 类型 | Launch 或 Cron：到点自动 launch | scheduledAt 到期可触发（最小实现） |
| P1-7 | 更新 `.env.example` 注释 | `.env.example` | 区分平台 SMTP vs 用户 EmailAccount |

**Phase 2 完成后：** `npm run build` ✅ → 进入 Phase 3

---

### Phase 3 — 拓客 + 体验 + 基础设施（P1 第二批，时间允许再做）

| # | 任务 | 关键文件 | 验收标准 |
|---|------|----------|----------|
| P1-8 | RocketReach 搜索入库 | `api/prospecting/route.ts`, `rocketreach.ts` | 搜索结果写入 Company/Contact |
| P1-9 | Prospecting 去重 | prospecting API | 同 domain/email 不重复创建 |
| P1-10 | 模板发信变量替换统一到 Worker | `email-worker.ts` 复用 `email-variables.ts` | 模板邮件变量正确 |
| P1-11 | `/products` 基础 CRUD 页 | `api/products`, `app/products/page.tsx` | 列表 + 新建 |
| P1-12 | docker-compose.yml | 项目根目录 | PG(5433) + Redis + 可选 worker 服务 |
| P1-13 | Campaign 统计从 EmailLog 聚合 | `api/campaigns/stats` | openRate 与 log 一致 |
| P1-14 | 联系人互动时间线 API | 新建 `api/contacts/[id]/timeline` | 返回 open/click/reply 事件 |
| P1-15 | E2E 冒烟：登录 → 创建 Campaign → Launch | `e2e/campaigns.spec.ts` 扩展 | 至少不报错（SMTP 可 mock） |

**Phase 3 结束：** `npm run build` + 简要更新本文第四节 checkbox

---

### Phase 4 — 暂缓（除非 Phase 1–3 都完成且有余力）

- A/B 测试 (#8)、Sequence 多步 (#7)、域名 SPF/DKIM (#30–36)
- S3 对象存储 (#43)、密码加密 (#15a)
- 完整 E2E 覆盖 (#63–#65)

---

### 执行检查清单（每个 Phase 结束）

```bash
npm run build                    # 必须通过
npm run db:push                  # 若改了 schema
# 手动冒烟（可选）：
# 1. Settings 添加 EmailAccount → 测试发信
# 2. Campaign 创建 → Launch（worker 需运行）
# 3. Inbox 空状态 / 有 repliedAt 数据时显示线程
```

### 关键文件索引

| 领域 | 文件 |
|------|------|
| 邮件双通道 | `src/lib/email.ts`, `email-account-mail.ts`, `select-email-account.ts` |
| Worker/队列 | `email-worker.ts`, `email-queue.ts` |
| 用户邮箱 | `api/email-accounts/*`, Settings 页 |
| Campaign | `launch/route.ts`, `campaigns/new/`, `schema.prisma` Campaign |
| Inbox/IMAP | `inbox/page.tsx`, `imap.ts`, `api/inbox/threads` |
| 平台通知 | `sendPlatformMail` in `email.ts` |
| AI | `openai.ts`, `api/ai/generate` |
| 拓客 | `api/prospecting`, `rocketreach.ts` |

### 开发命令

```bash
npm run dev          # :3030
npm run worker:email # 另开终端，Campaign 发信必须
npm run db:push && npm run db:seed
npm run build        # 每个 Phase 结束必跑
```

---

*本报告最后更新：2026-05-29。用户休息中：Claude 请从 Phase 1 开始自主执行，Phase 1→2→3 顺序推进，每项更新 checkbox。*

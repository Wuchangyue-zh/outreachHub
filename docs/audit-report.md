# OutreachHub 项目现状与开发缺口报告

> **生成日期**：2026-05-29  
> **最后更新**：2026-05-30（**架构演进 Phase 1–3**：三 Worker 队列、CampaignContact、Redis 限流/事件/统计、Blob 存储 — 规则见 [`CLAUDE.md`](../CLAUDE.md) / [`docs/architecture.md`](architecture.md)）  
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
| Cron Worker | ⚠️ 可选 | `npm run worker:cron` — Cron HTTP 仅入队，业务在 `src/lib/cron-jobs/` |
| IMAP Worker | ⚠️ 可选 | `npm run worker:imap` — 收信走 `imap-jobs` 队列 |

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
- **用户营销邮件已走 EmailAccount SMTP**（见 Phase 1 完成情况）；平台系统邮件仍用 `.env`
- **Email Worker 需单独终端运行**；另可选 `worker:cron` / `worker:imap`（见 `docker-compose.yml`）
- **Cron HTTP 仅入队**：业务逻辑在 `src/lib/cron-jobs/`，禁止在 route 写大段逻辑
- **Campaign 联系人**：读写用 `src/lib/campaign-contacts.ts`，勿直接依赖裸 `contactIds[]`
- **本地开发 Cron 不自动执行**；手动 `curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3030/api/cron/...`

---

## 一、项目概览

OutreachHub 是面向国内出海外贸企业的智能拓客与邮件营销 SaaS 平台。基于 **Next.js 15 + React 18 + Prisma 5 + PostgreSQL + Redis/BullMQ** 构建。

### 1.1 邮件架构（重要 — Claude 必读）

**当前架构（Phase 1 已实现）：**

```
┌─────────────────────────────────────────────────────────────┐
│  .env SMTP（平台级）                                          │
│  用途：注册欢迎信、找回密码、系统告警                          │
│  入口：sendPlatformMail()  ← ✅ 已实现                       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  EmailAccount 表（用户级，Settings 配置）                      │
│  用途：Campaign 发信、Inbox 回复、邮件测试                      │
│  入口：sendAccountMail({ emailAccountId })  ← ✅ 已实现       │
└─────────────────────────────────────────────────────────────┘
```

| 邮件类型 | 应使用的 SMTP | 当前实际 |
|----------|---------------|----------|
| 平台系统通知 | `.env` SMTP | ✅ `sendPlatformMail`（注册欢迎信等） |
| Campaign / 队列 / Worker | 数据库 `EmailAccount` | ✅ `sendAccountMail` + `selectEmailAccount` |
| Inbox 回复 / 邮件测试 | 用户选定 `EmailAccount` | ✅ `/api/inbox/reply` + Settings 测试 |
| Settings 保存的邮箱 | 存 DB + 发信读取 | ✅ |

**Claude 后续可关注：** 多账户轮换优化（#12）、密码加密（#15a）、IMAP 配置 UX（见 §九）。

### 1.2 技术栈

| 层次 | 技术 |
|------|------|
| 前端 | Next.js 15, React 18, TailwindCSS, Radix UI, Recharts, Zustand |
| 后端 | Next.js API Routes (App Router) |
| 部署 | Vercel Web + 独立 Worker（email/cron/imap）+ Upstash Redis + Neon PG pooler |
| 数据库 | PostgreSQL (Prisma ORM v5.22) |
| 缓存/队列 | Redis + BullMQ（三队列：`email-queue` / `cron-jobs` / `imap-jobs`） |
| 邮件发送 | Nodemailer — 平台 SMTP + 用户 EmailAccount 双通道 |
| 邮件接收 | IMAP + mailparser（`imap-multi.ts`，独立 imap-worker） |
| AI | 火山方舟（OpenAI 兼容 API，`openai.ts`） |
| 邮箱验证 | MillionVerifier API |
| 第三方数据 | RocketReach API |
| 认证 | JWT + bcryptjs（Cookie `auth-token`；生产无 fallback secret） |
| 文件上传 | `src/lib/storage.ts` — Vercel Blob（生产）/ `public/uploads`（本地） |
| 限流/实时/统计 | Redis 分布式限流 + Pub/Sub 事件 + 统计预聚合 |
| 测试/CI | Jest + Playwright E2E + GitHub Actions (`.github/workflows/ci.yml`) |

---

## 二、已完成功能清单

### 2.1 数据库层

| 模块 | 状态 | 说明 |
|------|------|------|
| Prisma Schema | ✅ | **14 个模型**（含 `CampaignContact`），15+ 枚举 |
| User / Tenant | ✅ | 多租户、角色、套餐 |
| EmailAccount | ✅ | 模型 + CRUD + 发信/IMAP；**imapLastError 字段 + 健康度联动** |
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
| `/api/campaigns/[id]/launch` | ✅ | 批量入队 + 变量替换 + EmailAccount 发信 |
| `/api/contacts` + import | ✅ | CRUD + CSV |
| `/api/companies` / `/api/templates` | ✅ | CRUD |
| `/api/prospecting` | ⚠️ | 创建任务 ✅；无采集引擎 |
| `/api/ai/generate` | ✅ | generate-email / generate-subject / **generate-reply** |
| `/api/email-queue/*` | ✅ | 队列 + 降级直发 |
| `/api/email/test` | ✅ | 测试发信；支持 EmailAccount；`plain` 模式 |
| `/api/email/track/*` | ✅ | open / click(302) / event |
| `/api/imap/*` + `/api/cron/check-replies` | ✅ | 多账户 IMAP（`imap-multi.ts`）；生产 Cron 每 5 分钟 |
| `/api/email-accounts` + `[id]` | ✅ | CRUD；GET 密码脱敏 `********` |
| `/api/users/me` | ✅ | GET/PUT 个人资料 + avatar |
| `/api/inbox/threads` | ✅ | 完整往来（全部 EmailLog + replyBody）；按时间排序 |
| `/api/inbox/reply` | ✅ | 专用回复发信；写入真实 `contactId` |
| `/api/inbox/ai-reply` | ✅ | AI 撰写/扩写；带入 EmailAccount 签名 |
| `/api/stats` / `/api/sse/stats` | ✅ | 统计 + SSE（SSE 已修 cleanup） |
| `/api/upload/*` | ✅ | 头像/附件 → 本地磁盘 |

**仍缺失 API：**

| API 路由 | 说明 |
|----------|------|
| `/api/products` | Product CRUD（Phase 3 已有基础页，可按需扩展） |
| 密码重置发信 | 平台 SMTP 发重置链接（注册欢迎信已有） |

### 2.3 前端页面

| 页面 | 状态 | 说明 |
|------|------|------|
| `/` Landing | ✅ | 14 区块 |
| `/login` `/register` | ✅ | 含演示账户提示 |
| `/dashboard` | ✅ | 统计卡片、图表 |
| `/campaigns` | ✅ | 对接 API；Launch / 暂停 / 删除；**CampaignStats 趋势图** |
| `/campaigns/new` | ✅ | 3 步向导 + AI 生成；**IMMEDIATE / SCHEDULED / RECURRING + 发送窗口** |
| `/contacts` `/companies` | ✅ | 完整 CRUD；**联系人详情抽屉展示互动时间线** |
| `/templates` | ✅ | 对接 API + AI；**润色/翻译/主题推荐 + 分类筛选统计** |
| `/dashboard/inbox` | ✅ | IMAP 同步 + 完整往来 + AI 回复/扩写 + EmailAccount 发信 |
| `/settings` | ✅ | EmailAccount CRUD + 个人资料 + 头像写回 |
| `/email-queue` `/email-test` | ✅ | 队列监控、SMTP 测试 |
| `/prospecting` | ⚠️ | RocketReach 搜索 + 勾选导入公司/联系人；创建任务 UI；无自动采集引擎 |

**侧边栏：** 仪表盘 · 拓客 · 客户 · 公司 · 邮件营销 · 模板 · **统一收件箱** · 邮箱设置 · 队列监控

**缺失页面：** ~~`/tasks`~~ → 已实现 `/dashboard/tasks`；~~`/products`~~ → 已实现 `/dashboard/products`

### 2.4 核心 Lib 模块

| 模块 | 状态 | 说明 |
|------|------|------|
| `email.ts` | ✅ | `sendPlatformMail` / 平台 SMTP |
| `email-account-mail.ts` | ✅ | `sendAccountMail` + dailyLimit |
| `email-worker.ts` | ✅ | Worker + 追踪 + 变量替换；**创建 EmailLog 须含 `content`** |
| `email-queue.ts` | ✅ | 队列 + 直发；`attempts: 3` 后入 failed，需手动 retry |
| `imap-multi.ts` | ✅ | 多账户 IMAP；SINCE 拉信；In-Reply-To/References 匹配 |
| `openai.ts` | ✅ | Campaign / `generateInboxReply`（往来历史 + 签名） |
| `imap.ts` | ⚠️ | 旧单账户实现；新代码优先 `imap-multi.ts` |
| `email-tracking.ts` | ✅ | 标准 `e`/`c`/`u` 参数 |
| `email-variables.ts` | ✅ | Launch / Worker 变量替换 |
| `reply-classifier.ts` | ✅ | 10 类回复分类 |
| `rocketreach.ts` | ✅ | SDK + `/api/prospecting` 搜索/入库已接线 |
| 其他 auth/redis/upload 等 | ✅ | 正常 |

---

## 三、P0 首轮完成情况（2026-05-29）

| 任务 | 状态 | 备注 |
|------|------|------|
| P0-1 Campaign 列表 API 对接 | ✅ | `campaigns/page.tsx` |
| P0-2 EmailAccount CRUD API | ✅ | 密码脱敏 + 发信/IMAP 已接入 |
| P0-3 Settings + `/api/users/me` | ✅ | |
| P0-4 Worker 追踪参数 | ✅ | 使用 `addEmailTracking` |
| P0-5 Inbox 导航/鉴权/数据 | ✅ | IMAP 同步 + 完整往来 + AI 回复/扩写 |
| P0-6 Campaign Launch 入队 | ✅ | EmailAccount 发信 + 入队 + 跳过已发 |

**P0' / Phase 1–3 已完成（2026-05-29～30）。当前遗留重点 → 见 §十 Batch H。**

---

## 四、待办清单（Claude 按编号实现）

完成后将 `- [ ]` 改为 `- [x]`。

### 4.1 Campaign 发信调度

- [x] 1. `/campaigns` 列表对接 API
- [x] 2. 启动/暂停/删除前后端对接
- [x] 3. Launch 批量入 BullMQ；跳过已发送联系人
- [x] 4. 调度引擎：`scheduleType`（IMMEDIATE / SCHEDULED / RECURRING）— API + **向导 UI** 已接线
- [x] 5. `throttlePerDay` 入队上限 + `throttlePerHour` 分批延迟入队（Launch 按 perHour 切片，每批延迟 1h）
- [x] 6. 发送时间窗口：`timezone` + `sendingWindows` — RECURRING + **向导 UI** 已接线
- [x] 7. 多步序列：`type=SEQUENCE`（向导 UI 类型选择 + 步骤编辑器 + launch 首步 + advance-sequences cron）
- [x] 8. A/B 测试：向导 UI 变体 B + Launch 50/50 分流 + 48h 后 openRate 判定 winner（`/api/cron/ab-test-winner`）
- [x] 9. Campaign 统计单一数据源：Worker/直发不再直接 totalSent++；stats API 从 EmailLog 聚合后同步 Campaign 模型
- [x] 9a. Launch 模板变量替换（`email-variables.ts`，含 `{{CompanyName}}` 等）

### 4.2 邮箱账户与 SMTP 双通道

- [x] 10. `/api/email-accounts` CRUD
- [x] 11. Settings 页对接 API
- [x] **12a. 拆分 `sendPlatformMail()` / `sendAccountMail()`**（`email.ts`, `email-account-mail.ts`）
- [x] **12b. Worker / 队列 / Launch 使用 EmailAccount SMTP 发信**
- [x] **12c. Inbox 回复 / 邮件测试使用用户选定 EmailAccount**
- [x] **12d. Campaign 绑定 `emailAccountId`（Schema + 向导 + Launch）**
- [x] **12e. `selectEmailAccount` 轮换与健康度选账户**（同 #12）
- [x] 12. 多账户轮换：按 `healthScore` / `dailyLimit` / `dailySent` 选账户
- [x] 13. `dailySent` 每日归零（Launch 前 lazy reset，`email-account-mail.ts`）
- [x] 14. 健康度：bounce rate 自动降级（发送失败 -2 / IMAP 失败 -5 / 成功恢复 +0.5 / 上限 100）
- [ ] 15. SMTP 连接池（可选优化）
- [x] 15a. EmailAccount 密码加密存储（`encryption.ts` 已实现 AES-256-GCM；`safeDecrypt` 向后兼容）

### 4.3 IMAP 与统一收件箱

- [x] 16. Inbox 基础数据 API（`/api/inbox/threads`，完整 EmailLog 往来 + tenant 过滤）
- [x] 17. 侧边栏 + middleware 鉴权
- [x] **16b. 文档化：UI 读 EmailLog；收信靠 IMAP 轮询写入 EmailLog**
- [x] **16c. 定时 IMAP 轮询**（`api/cron/check-replies` + `vercel.json` 每 5 分钟；**本地需手动触发**）
- [x] 18. 多 EmailAccount 并行 IMAP（`lib/imap-multi.ts` 读 DB）
- [x] 19. 单账户 IMAP 失败隔离（try/catch + healthScore 自动降级/恢复 + imapLastError 追踪）
- [x] 20. 回复正文入库（`EmailLog.replyBody` + threads 展示）
- [x] 21. In-Reply-To / References 关联 EmailLog.messageId
- [x] 22. AI 回复草稿（`/api/inbox/ai-reply` + 往来历史 + 自动签名）
- [x] 23. Inbox 发送回复（`/api/inbox/reply` + EmailAccount）
- [x] 23a. 收件箱刷新触发 IMAP 同步（`inbox/page.tsx` → `POST /api/imap/check-replies`）
- [x] 23b. 完整往来展示（含我方后续回复；修复 `system-reply` 假 contactId）
- [x] 24. OOO 自动跟进（IMAP 检测 OUT_OF_OFFICE → 创建 3 天后跟进 Task）

### 4.4 智能拓客

- [x] 25. 爬虫/采集引擎（`/api/cron/process-prospecting` + RocketReach 搜索 → Company/Contact 入库 + 去重）
- [x] 26. RocketReach → 保存 Company/Contact（API + **prospecting 页勾选导入**）
- [x] 27. AI 拓词/职位建议（`generateKeywordSuggestions` + `generatePositionSuggestions` + 拓客页 AI 按钮）
- [x] 28. 爬虫进度更新（任务列表 tab + 进度条 + 状态标签 + 统计）
- [x] 29. 去重（`import-companies` 按 domain/name 去重；`import-contacts` 按 email 去重）

### 4.5 域名与合规

- [x] 30. 退订功能（`/api/unsubscribe` + Contact.unsubscribed + 邮件退订链接）
- [x] 31. SPF/DKIM/DMARC DNS 记录建议（J1: `GET /api/email-accounts/[id]/dns-records` + Settings DNS 对话框）
- [x] 32. EmailAccount Warm-up（J2: 21 天递增曲线 + `checkDailyLimit` 自动推进）
- [x] 33. GDPR 联系人数据导出（J3: `GET /api/contacts/[id]/export` JSON 下载）
- [x] 34. GDPR 联系人删除级联清理（J3: DELETE 级联 EmailLog + CampaignContact）
- [x] 35. 退订页品牌化 + 多语言（J4: tenant 名称 + Accept-Language 中/英）
- [x] 36. 域名 DNS 在线验证（K1: `verifySPF`/`verifyDMARC`/`verifyDKIM` + Settings 状态展示）

### 4.6 追踪与分析

- [x] 37. Worker / 直发追踪 URL（`addEmailTracking`，`e`/`c`/`u`）
- [x] 38. Campaign 趋势图（`CampaignStats` 已挂到 `/campaigns` + `/api/campaigns/stats`）
- [x] 39. 联系人互动时间线（API + **contacts 详情抽屉 UI**）
- [x] 40. 地理/IP 分析（K2: EmailLog `openCountry` + campaign stats `geo[]` 聚合）

### 4.7 文件存储

- [x] 41. 头像 → `User.avatar`
- [x] 42. `/api/users/me`
- [x] 43. 生产对象存储 S3/R2（G1: `@aws-sdk/client-s3` + Cloudflare R2/AWS S3/MinIO）
- [x] 44. 邮件附件与 Campaign 关联（H1: Attachment.relatedType=campaign + Worker 下载 Buffer + 发信带附件）
- [x] 44a. 邮件 HTML 内外链图片公网 URL（H2: `email-html.ts` → `resolvePublicUrls` + Worker/直发集成）

### 4.8 用户与租户

- [x] 45. 注册邮箱验证 + **平台 SMTP 发欢迎信**（已有 `/api/auth/forgot-password` + `/reset-password` + 注册欢迎信）
- [x] 46. 套餐限额（`plan-limits.ts` + contacts/launch 限额校验 + Settings 套餐用量展示）
- [x] 47. 团队邀请（`Invitation` 模型 + invite/accept-invite API + 邮件邀请 + Settings 成员列表）
- [x] 48. 角色差异化鉴权（五角色矩阵 + 写 API：campaigns/contacts/templates/companies/prospecting/inbox/email-accounts/queue-retry）

### 4.9 模板与 AI

- [x] 49. Launch 变量替换（见 9a）
- [x] 50. AI 生成模板完整流程（生成 + 主题行推荐 + 润色 + 翻译）
- [x] 51. 模板分类与统计（分类筛选 + 分类统计条）

### 4.10 产品管理

- [x] 52. 产品管理：侧边栏入口 + hasPermission 鉴权 + Campaign 向导关联产品（productId）
- [x] 53. 产品 × Campaign AI 深度接线（productId 注入 prompt + 列表展示关联产品名）
- [x] 54. 产品推荐（K3: AI 生成时自动注入产品目录上下文）

### 4.11 基础设施

- [x] 55. Worker 守护（PM2 / docker-compose service）— worker 服务 + `env_file: .env` 继承 SMTP/ENCRYPTION_KEY
- [x] 56. Redis HA（L2: Upstash 自动扩展 + 运维手册）
- [x] 57. DB 备份策略（L2: Neon/Supabase 自动备份 + pg_dump 脚本）
- [x] 58. 结构化日志（L2: `lib/logger.ts` JSON 格式 + child logger）
- [x] 59. 告警建议（L2: 运维手册含 Slack webhook 示例 + 关键指标阈值表）
- [x] 60. `.env.example` 已补充 Redis + 火山方舟（部分）
- [x] 61. Dockerfile + docker-compose（PG + Redis + App + Worker）— docker-compose.yml 已配置 postgres + redis + worker

### 4.12 测试

- [x] 62. 单元测试：33 条（storage 10 + auth 3 + api-errors 12 + campaign-attachments 8）
- [x] 63. E2E 测试：90 条（UI 76 + API 14：`e2e/api/auth.spec.ts` 11 + `campaign-stats.spec.ts` 3）
- [x] 64. API 集成测试（K4 模块 smoke 53 条 + L5 Playwright API 11 条）
- [x] 65. API 端点测试（L1: stats/dns/export 3 条 Playwright API 模式）

---

## 五、优先级建议（更新版 — 2026-05-30）

### P0 — 下一批（体验 + 运维）

1. ✅ **Worker / Cron 本地开发文档**（#55）— docker-compose worker 服务、Cron 手动触发说明
2. ✅ **IMAP 配置向导** — Settings 根据 SMTP 主机提示 IMAP（`mail.` 非 `imap.`）
3. ✅ **队列 failed 任务** — 可选 Cron 自动 retry 或 UI 更明显提示
4. ✅ **密码重置平台邮件**（#45 子项）— 已有 `/api/auth/forgot-password` + `/reset-password`

### P1 — 重要

5. ✅ 调度引擎 + 时间窗口（#4、#6）— RECURRING 类型 + sendingWindows 已实现
6. ✅ RocketReach 入库深化（#26）— import-companies + import-contacts + 去重已实现
7. ✅ 退订合规（#30）— `/api/unsubscribe` + 邮件退订链接 + Contact.unsubscribed 字段
8. ✅ EmailAccount 密码加密（#15a）— AES-256-GCM 已实现

### P2 — 增强

9. ✅ A/B、Sequence、S3、E2E 扩展（Batch C/G）
10. ✅ Batch H — 附件×Campaign、邮件公网 URL、Batch E 遗留
11. ✅ Batch I — 套餐升级 sync、部署文档、failed 任务 Cron
12. ✅ Batch J — DNS 配置、Warm-up、GDPR、退订品牌化
13. ✅ Batch K — DNS 验证、地理分析、产品推荐、部署 checklist
14. ✅ Batch L — UI 测试、运维手册、geo 增强、DKIM 推断、API 测试

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
| **Email Worker 缺 `content` 字段** | ✅ 已修复 | `email-worker.ts` 写入 `content: finalText \|\| finalHtml` |
| **BullMQ failed 任务不自动重试** | ⚠️ 设计如此 | 3 次失败后入 failed；重启 Worker 不重试；用 `/api/email-queue/retry` |
| **IMAP 主机 DNS 错误** | ✅ 已修复 | 例：`imap.jafron.com` 不存在 → 应用 `mail.jafron.com` |
| **IMAP 只拉 UNSEEN 漏已读回信** | ✅ 已修复 | 改为 SINCE 7 天 + 已回复跳过 |
| **IMAP fetch 异步竞态** | ✅ 已修复 | `simpleParser` Promise.all 等待解析完成 |
| **收件箱刷新不触发 IMAP** | ✅ 已修复 | 刷新按钮 → `POST /api/imap/check-replies` |
| **AI 回复签名占位符 `[你的姓名]`** | ✅ 已修复 | 从 EmailAccount.displayName + Tenant 带入签名 |
| **Inbox 发出回复不显示在往来** | ✅ 已修复 | `contactId: system-reply` → 真实 contactId；threads 全量排序 |
| **营销邮件仍用 .env SMTP** | ✅ 已修复 | Phase 1 双通道已完成 |
| Prisma 7 版本冲突 | ⚠️ 规避 | 用 `npm run db:*` |
| **Campaign PUT/PATCH 缺少 tenantId** | ⚠️ 已知 | `where: { id }` 未加 tenantId 隔离；已通过 findUnique 预检查缓解 |

---

## 七、架构决策记录

1. **发信架构**：平台 `.env` SMTP（`sendPlatformMail`）≠ 用户 `EmailAccount` SMTP（`sendAccountMail`）— **已实现**
2. **队列**：BullMQ + Redis；Worker 独立进程；`attempts: 3` 指数退避；失败后需 **手动 retry**（无 Cron）
3. **收信**：IMAP 多账户（`imap-multi.ts`）→ 写 EmailLog.repliedAt/replyBody；Inbox UI 读 EmailLog 全量往来
4. **AI**：火山方舟；收件箱 `generateInboxReply` 基于完整 thread + 发件人签名
5. **追踪**：`email-tracking.ts` 为唯一标准；参数 `e`/`c`/`u`
6. **多租户**：`tenantId` 字段隔离
7. **变量**：`email-variables.ts` 大小写不敏感 `{{key}}`
8. **EmailLog 必填字段**：创建记录时须同时写 `content`（纯文本）与 `htmlContent`

---

## 八、Claude 执行指引

> **给 Claude 的说明：**  
> 1. **Phase 1–3 已完成**（见下方队列）；勿重复实现 SMTP 双通道 / IMAP 多账户 / replyBody 等  
> 2. 从 **§五 P0 下一批** 或 **§四 未勾选项** 继续；每项完成后更新 checkbox  
> 3. 改 Schema 后：`npm run db:push`  
> 4. 每个 Phase 结束跑 `npm run build`  
> 5. 开发 Campaign 发信时 **必须** 另开终端 `npm run worker:email`  
> 6. 本地测试 IMAP 收信：`POST http://localhost:3030/api/cron/check-replies` 或刷新收件箱

### 已完成（勿重复）

```
[x] P0-1 ～ P0-6  Campaign / Settings / Inbox 基础
[x] Phase 1  SMTP 双通道 sendPlatformMail / sendAccountMail
[x] Phase 2  IMAP 多账户 + Cron + replyBody + 注册欢迎信 + SCHEDULED
[x] Phase 3  RocketReach / products / timeline / docker-compose 等
[x] 2026-05-30  Email Worker content 字段 / IMAP 收信 / 收件箱 AI / 完整往来（见 §九）
[x] 2026-05-30  P0 下一批：IMAP 配置向导 / 队列 failed 任务 UI / Worker docker-compose / 密码重置
[x] 2026-05-30  P1：调度引擎 RECURRING / 时间窗口 / EmailAccount 密码加密 / 退订合规
[x] 2026-05-30  前端接线：Campaign 调度向导 / Prospecting 导入 / CampaignStats / 联系人时间线 / docker worker env
[x] 2026-05-30  后续：Campaign 统计聚合 / AI 模板完整流程 / 模板分类 / IMAP 失败隔离 / 健康度降级 / 角色鉴权
[x] 2026-05-30  §9.9：权限扩展全写 API / IMAP 错误展示 / Bounce 降级 / SEQUENCE MVP
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
| P1-1 | ✅ IMAP 多账户：读 EmailAccount 而非 `.env` | `lib/imap-multi.ts` | check-replies 遍历用户 active 账户 |
| P1-2 | ✅ 定时轮询回复（Cron API Route） | `api/cron/check-replies/route.ts`, `vercel.json` | 可调通；文档写清如何触发 |
| P1-3 | ✅ EmailLog 存独立 `replyBody` 字段 | `schema.prisma`, `imap-multi.ts`, `inbox/threads` | 收件箱「对方消息」显示回复正文 |
| P1-4 | ✅ 注册成功欢迎邮件 | `api/auth/register/route.ts`, `sendPlatformMail` | 注册后收到平台 SMTP 邮件 |
| P1-5 | ✅ `dailySent` 归零逻辑 | `select-email-account.ts`, `email-account-mail.ts` | 跨天自动 reset dailySent |
| P1-6 | ✅ Campaign 调度：`SCHEDULED` 类型 | `api/campaigns/[id]/launch/route.ts`, `api/cron/launch-scheduled/route.ts` | scheduledAt 到期可触发（最小实现） |
| P1-7 | ✅ 更新 `.env.example` 注释 | `.env.example` | 区分平台 SMTP vs 用户 EmailAccount |

**Phase 2 完成后：** `npm run build` ✅ → 进入 Phase 3

---

### Phase 3 — 拓客 + 体验 + 基础设施（P1 第二批，时间允许再做）

| # | 任务 | 关键文件 | 验收标准 |
|---|------|----------|----------|
| P1-8 | ✅ RocketReach 搜索入库 | `api/prospecting/route.ts` | 搜索结果写入 Company/Contact |
| P1-9 | ✅ Prospecting 去重 | `api/prospecting/route.ts` | 同 domain/email 不重复创建 |
| P1-10 | ✅ 模板发信变量替换统一到 Worker | `email-worker.ts` 复用 `email-variables.ts` | 模板邮件变量正确 |
| P1-11 | ✅ `/products` 基础 CRUD 页 | `api/products`, `app/dashboard/products/page.tsx` | 列表 + 新建 |
| P1-12 | ✅ docker-compose.yml | 项目根目录 | PG(5433) + Redis + 可选 worker 服务 |
| P1-13 | ✅ Campaign 统计从 EmailLog 聚合 | `api/campaigns/stats` | openRate 与 log 一致 |
| P1-14 | ✅ 联系人互动时间线 API | `api/contacts/[id]/timeline` | 返回 open/click/reply 事件 |
| P1-15 | ✅ E2E 冒烟：登录 → 创建 Campaign → Launch | `e2e/campaigns.spec.ts` 扩展 | 至少不报错（SMTP 可 mock） |

**Phase 3 结束：** `npm run build` + 简要更新本文第四节 checkbox

---

### Phase 4 — 暂缓（除非 Phase 1–3 都完成且有余力）

- ~~A/B 测试 (#8)~~ ✅ Batch B、~~Sequence (#7)~~ ✅ §9.9、~~S3 (#43)~~ ✅ G1、~~密码加密 (#15a)~~ ✅ §9.8
- 域名 SPF/DKIM (#30–36)、地理分析 (#40)、产品推荐 (#54)
- 完整 E2E 覆盖 (#63–#65）— 已有 76 条，剩余 API 集成 + UI 组件测试

---

### 执行检查清单（每个 Phase 结束）

```bash
npm run build                    # 必须通过
npm run db:push                  # 若改了 schema
# 手动冒烟（可选）：
# 1. Settings 添加 EmailAccount → 测试发信
# 2. Campaign 创建 → Launch（worker 需运行）
# 3. Inbox：刷新同步 IMAP → 选对话 → 应见完整往来（含我方回复）
```

### 关键文件索引

| 领域 | 文件 |
|------|------|
| 邮件双通道 | `src/lib/email.ts`, `email-account-mail.ts`, `select-email-account.ts`, `bounce-handler.ts` |
| Worker/队列 | `email-worker.ts`, `email-queue.ts` |
| 用户邮箱 | `api/email-accounts/*`, Settings 页 |
| Campaign | `launch/route.ts`, `campaigns/new/`, `schema.prisma` Campaign, `api/cron/advance-sequences` |
| Inbox/IMAP | `dashboard/inbox/page.tsx`, `imap-multi.ts`, `api/inbox/*`, `api/cron/check-replies` |
| AI 收件箱 | `openai.ts` (`generateInboxReply`), `api/inbox/ai-reply` |
| 平台通知 | `sendPlatformMail` in `email.ts` |
| AI | `openai.ts`, `api/ai/generate`, `api/inbox/ai-reply` |
| 拓客 | `api/prospecting`, `rocketreach.ts` |

### 开发命令

```bash
npm run dev          # :3030
npm run worker:email # 另开终端，Campaign 队列发信必须
npm run db:push && npm run db:seed
npm run build        # 每个 Phase 结束必跑

# 本地手动触发（Vercel Cron 本地不跑）
curl -X POST http://localhost:3030/api/cron/check-replies
curl -X POST http://localhost:3030/api/email-queue/retry   # 需登录 Cookie
```

---

## 九、2026-05-30 会话修复记录（Claude 必读）

本节记录 Cursor 会话中已落地修复，**请勿重复实现**；后续开发请在此基础上扩展。

### 9.1 Email Worker — EmailLog 创建失败

| 项 | 内容 |
|----|------|
| **现象** | Worker 处理队列任务报 `Argument content is missing`，邮件发不出去 |
| **根因** | `email-worker.ts` 创建 EmailLog 只写 `htmlContent`，Schema 要求必填 `content` |
| **修复** | `content: finalText \|\| finalHtml \|\| ''`（与 `email-queue.ts` 直发逻辑一致） |
| **文件** | `src/lib/email-worker.ts` |

**队列重试说明（运维）：**

- BullMQ 默认 `attempts: 3`，指数退避 2s 起
- 3 次全失败后任务进入 Redis **failed** 状态；**重启 Worker 不会自动重试**
- 恢复方式：`POST /api/email-queue/retry` 或 `/email-queue` 页面「重试失败任务」
- **无** Cron 轮询队列失败任务；`vercel.json` Cron 仅 `check-replies` 与 `launch-scheduled`

### 9.2 IMAP 收信 — 客户回复未入库

| 项 | 内容 |
|----|------|
| **现象** | 客户已回复邮件，收件箱/统计无记录 |
| **根因 1** | EmailAccount 配置 `imap.jafron.com` DNS 不存在；实际为 `mail.jafron.com`（与 `smtp.` 同为 CNAME） |
| **根因 2** | 仅搜索 `UNSEEN` 邮件；若用户在网页邮箱已读回信则漏同步 |
| **根因 3** | `fetchEmailsFromAccount` 异步解析竞态，可能空结果 |
| **根因 4** | 本地开发 Vercel Cron 不执行；收件箱刷新原先只读 DB 不拉 IMAP |
| **修复** | 改 SINCE 7 天拉信；Promise.all 等待 mailparser；In-Reply-To + References 匹配 `messageId`；已回复 log 跳过；收件箱打开/刷新 → `POST /api/imap/check-replies` |
| **文件** | `src/lib/imap-multi.ts`, `src/app/dashboard/inbox/page.tsx`, `src/app/dashboard/settings/page.tsx`（IMAP 提示文案） |

**本地验证收信：**

```bash
curl -X POST http://localhost:3030/api/cron/check-replies
# 或在 /dashboard/inbox 点刷新
```

### 9.3 收件箱 AI 回复 / 扩写

| 项 | 内容 |
|----|------|
| **功能** | 回复框旁 **AI 回复**（根据完整往来生成）、**AI 扩写**（润色当前草稿） |
| **API** | `POST /api/inbox/ai-reply` — 传 `contactName`, `messages[]`, `emailAccountId`, `mode: draft\|expand` |
| **文件** | `src/lib/openai.ts` (`generateInboxReply`), `src/app/api/inbox/ai-reply/route.ts`, `src/app/dashboard/inbox/page.tsx` |

### 9.4 AI 签名占位符 `[你的姓名]`

| 项 | 内容 |
|----|------|
| **现象** | AI 生成邮件末尾仍为 `[你的姓名]` |
| **根因** | Prompt 要求 placeholder；未传入发件人信息 |
| **修复** | 从选定 EmailAccount 解析：`displayName` → `User.name` → 邮箱前缀；Tenant.name 作公司；中文对话用「此致敬礼」；后处理替换残留占位符 |
| **前置** | 使用 AI 前须选择发件账户 |
| **文件** | `src/lib/openai.ts`, `src/app/api/inbox/ai-reply/route.ts` |

### 9.5 收件箱往来 — 我方回复不显示

| 项 | 内容 |
|----|------|
| **现象** | 在收件箱发出回复后，对话里只有「活动信 + 客户回信」，看不到刚发出的内容 |
| **根因 1** | `/api/inbox/reply` 写入 `contactId: 'system-reply'`，threads API 查不到 |
| **根因 2** | `/api/inbox/threads` 每条 log 只渲染一轮（出站 + replyBody），不含后续 outbound |
| **修复** | reply 写入真实 `contactId`；threads 拉联系人全部 EmailLog 按时间排序；兼容历史 `system-reply`（按 toEmail 匹配） |
| **文件** | `src/app/api/inbox/reply/route.ts`, `src/app/api/inbox/threads/route.ts`, `inbox/page.tsx`（传 `contactId`） |

### 9.6 Claude 后续建议（部分已完成）

- [x] Settings：保存 EmailAccount 时自动探测/建议 IMAP 主机（`KNOWN_IMAP_HOSTS` + smtp→mail 提示）
- [x] 队列 failed 任务 UI 醒目提示（`/email-queue` 横幅 + 重试）
- [ ] 将历史 `contactId='system-reply'` 的数据批量 backfill 为真实 contactId
- [x] AI 回复：从 Contact 记录取正确称呼，避免与客户/发件人姓名混淆
- [x] system-reply 历史数据 backfill 脚本（`scripts/backfill-system-reply.ts`）
- [x] docker-compose 增加 `worker` service 一键启动（含 `env_file`）

### 9.7 前端接线修复（2026-05-30）

| 缺口 | 修复 |
|------|------|
| Campaign 向导无 RECURRING / 发送窗口 UI | `campaign-wizard-store.ts` + `StepBasicInfo.tsx` + `StepAiWriter.tsx` 创建/启动时传 `scheduleType`、`recurrenceRule`、`sendingWindows`、`timezone` |
| Prospecting 页未调用 import API | `prospecting/page.tsx` RocketReach 搜索 + 勾选导入公司/联系人 |
| `CampaignStats` 组件未使用 | 挂到 `campaigns/page.tsx` |
| 联系人 timeline API 未接 UI | `contacts/page.tsx` 详情抽屉加载 `/api/contacts/[id]/timeline` |
| docker worker 缺 SMTP 等 env | `docker-compose.yml` worker 增加 `env_file: .env`，覆盖容器内 `DATABASE_URL` / `REDIS_URL` |

### 9.8 本轮开发（2026-05-30）— Campaign 统计 / 模板 AI / 健康度 / 权限

| 编号 | 任务 | 关键文件 |
|------|------|----------|
| #9 | Campaign 打开/点击/回复计数与 EmailLog 事件同步（首次 open/click） | `email-tracking.ts`, `imap-multi.ts` |
| #14 | EmailAccount healthScore：发信失败降级、成功恢复；选账户 cap 100 | `email-worker.ts`, `select-email-account.ts` |
| #19 | IMAP 失败隔离：记录 `imapLastError`，healthScore -5/+1 | `imap-multi.ts`, `schema.prisma` |
| #48 | 五角色权限矩阵 + 部分 API 鉴权 | `auth-middleware.ts`, `campaigns/route.ts`, `email-accounts/route.ts` |
| #50 | 模板 AI 润色/翻译 | `api/ai/generate/route.ts`, `templates/page.tsx` |
| #51 | 模板分类筛选与统计条 | `templates/page.tsx` |

**遗留（§9.8）：** ~~#7 缺 SEQUENCE 向导 UI；#9 Worker `totalSent` 仍 increment~~ → 已于 §9.9–§9.11 完成。

### 9.9 本轮开发（2026-05-30）— 权限扩展 / IMAP 错误展示 / Bounce 降级 / SEQUENCE MVP

| 编号 | 任务 | 关键文件 |
|------|------|----------|
| #48 | 权限扩展：全部写 API 添加 `hasPermission` 鉴权 | `contacts/route.ts`, `contacts/[id]/route.ts`, `templates/route.ts`, `templates/[id]/route.ts`, `campaigns/[id]/route.ts`, `campaigns/[id]/launch/route.ts` |
| #19 | Settings 展示 `imapLastError` / `imapLastErrorAt`（琥珀色警告条） | `settings/page.tsx` |
| #14 | Bounce 语义补全：`bounce-handler.ts` + worker 检测永久性退信 + 降级 -5 | `bounce-handler.ts`, `email-worker.ts`, `api/email/bounce/route.ts` |
| #7 | SEQUENCE 多步邮件 MVP：launch 首步 + advance-sequences cron 推进后续步骤 | `campaigns/[id]/launch/route.ts`, `api/cron/advance-sequences/route.ts`, `vercel.json` |
| #7 | Campaign 向导 SEQUENCE UI：类型选择器 + 步骤编辑器 + store 接线 | `campaign-wizard-store.ts`, `StepBasicInfo.tsx`, `StepAiWriter.tsx` |
| #9 | 移除 Worker/直发 totalSent++；stats API 从 EmailLog 聚合后同步 Campaign 模型字段 | `email-worker.ts`, `email-queue.ts`, `campaigns/stats/route.ts` |

**遗留：** Campaign PUT/PATCH `where: { id }` 缺 tenantId（已通过 findUnique 预检查缓解）；Campaign 列表页 totalSent 来自模型缓存（GET /api/campaigns 与 stats 查询时从 EmailLog 同步）。

### 9.10 核实后修复（2026-05-30）

| 问题 | 修复 |
|------|------|
| `advance-sequences` 无 GET，Vercel Cron 不触发 | 补 GET + `verifyCronSecret`（`lib/cron-auth.ts`） |
| `/api/email/bounce` 无鉴权 | `verifyBounceWebhook`（`BOUNCE_WEBHOOK_SECRET` / `CRON_SECRET`） |
| SEQUENCE 被误标 COMPLETED | `campaign-completion.ts` 跳过 `type === 'SEQUENCE'` |
| #48 权限覆盖不全 | 扩展 companies、email-accounts/[id]、inbox、prospecting 导入、CSV 导入、queue retry |
| bounce 账户匹配 | `markAsBounced` 优先 `emailAccountId` |

### 9.11 核实 #7 / #9（2026-05-30）

| 问题 | 修复 |
|------|------|
| #7 SEQUENCE 向导 UI 已实现但 Step 3 仍强制 AI 内容 | `StepAiWriter.tsx`：SEQUENCE 用步骤 1 作为 campaign subject/content，无需 `generatedEmail` 即可 Launch |
| #9 仅移除 Worker totalSent++，open/click/reply/bounce 仍 increment | 移除 `email-tracking.ts`、`imap-multi.ts`、`bounce-handler.ts`、`track/event` 的 Campaign increment |
| 列表页 totalSent 不访问 stats API 时可能 stale | 新增 `campaign-stats-sync.ts`；`GET /api/campaigns` 列表时同步；stats API 复用同一聚合函数 |

**#7 / #9 状态：** 已完成并核实。

### 9.12 Batch A — 快速补洞（2026-05-30）

| 编号 | 任务 | 关键文件 |
|------|------|----------|
| #5 | throttlePerHour：Launch 按 perHour 切片分批，每批延迟 1h 入队 | `campaigns/[id]/launch/route.ts` |
| #52 | 产品管理：侧边栏入口 + hasPermission 鉴权 + Campaign 向导关联产品（productId） | `dashboard-layout.tsx`, `products/route.ts`, `products/[id]/route.ts`, `campaign-wizard-store.ts`, `StepBasicInfo.tsx`, `StepAiWriter.tsx`, `schema.prisma` |
| — | Campaign/Contact/Template PATCH/DELETE where 加 tenantId 隔离 | `campaigns/[id]/route.ts`, `contacts/[id]/route.ts`, `templates/[id]/route.ts` |
| #4 | /api/stats recentCampaigns 从 EmailLog 聚合（修复 emailStats 缺 tenant 过滤） | `stats/route.ts` |

### 9.13 Batch B+C — 营销能力 + 数据修复（2026-05-30）

| 编号 | 任务 | 关键文件 |
|------|------|----------|
| #8 | A/B 测试完整流程：向导变体 B + Launch 50/50 分流 + 48h winner cron | `StepBasicInfo.tsx`, `StepAiWriter.tsx`, `campaign-wizard-store.ts`, `launch/route.ts`, `api/cron/ab-test-winner/route.ts` |
| #24 | OOO 自动跟进：IMAP 检测 OUT_OF_OFFICE → 创建 3 天后跟进 Task | `imap-multi.ts` |
| — | AI 回复称呼修复：从 Contact 记录取 firstName，避免混淆 | `api/inbox/ai-reply/route.ts` |

### 9.14 核实 Batch A/B/C 后修复（2026-05-30）

| 问题 | 修复 |
|------|------|
| A/B winner 按 contactIds 顺序分组，与 Launch 随机 shuffle 不一致 | 新增 `Campaign.abTestAssignments`；Launch 持久化分组；winner cron 按 assignments 统计 |
| `ab-test-winner` 仅 POST、无 Cron 鉴权，Vercel 不触发 | 补 GET + `verifyCronSecret` |
| AB_TEST 发完后被 `maybeMarkCampaignCompleted` 误标 COMPLETED | `campaign-completion.ts` 跳过 `AB_TEST` |
| Step 3 Launch 按钮 AB_TEST 不可用 | `StepAiWriter` 增加 `abReady` 条件 |
| OOO Task `tenantId` 为 undefined；`steps` 错误 JSON.stringify | 从 Campaign 取 tenantId；steps 用 Json 数组；去重 |
| OOO 只建 Task 不发信 | 新增 `/api/cron/process-follow-ups` + `vercel.json` |
| `/api/stats` emailStats 未按 tenant 过滤 | groupBy 加 `campaign.tenantId` 条件 |

**需执行：** `npm run db:push`（新增 `abTestAssignments` 字段）

### 9.14 Batch D — 体验补全（2026-05-30）

| 编号 | 任务 | 关键文件 |
|------|------|----------|
| D1 | 产品 × Campaign AI 深度接线：productId 注入 AI prompt + 列表展示产品名 | `ai-generate/route.ts`, `StepAiWriter.tsx`, `campaigns/route.ts`, `campaigns/page.tsx` |
| D2 | Settings IMAP 主机智能提示：jafron 等已知域映射 + imap.→mail. 一键修正 | `settings/page.tsx` |
| D3 | system-reply 历史数据 backfill 脚本 | `scripts/backfill-system-reply.ts` |
| D4 | `/dashboard/tasks` 任务页：API + UI + 侧边栏（展示 OOO 跟进 Task） | `api/tasks/route.ts`, `dashboard/tasks/page.tsx`, `dashboard-layout.tsx` |

### 9.15 Batch E — 商业化（2026-05-30）

| 编号 | 任务 | 关键文件 |
|------|------|----------|
| #46 | 套餐限额：`plan-limits.ts` 工具库 + contacts 创建限额 + launch 每日发信限额 + Settings 套餐用量展示 | `lib/plan-limits.ts`, `contacts/route.ts`, `launch/route.ts`, `settings/page.tsx`, `api/tenant/usage/route.ts` |
| #47 | 团队邀请：`Invitation` 模型 + invite API（邮件邀请）+ accept-invite API + 注册/加入流程 + Settings 成员列表 | `schema.prisma`, `api/tenant/invite/route.ts`, `api/auth/accept-invite/route.ts`, `accept-invite/page.tsx`, `settings/page.tsx` |

**需执行：** `npm run db:push`（新增 `Invitation` 模型 + `InvitationStatus` 枚举）

### 9.16 核实 Batch E 后修复（2026-05-30）

| 问题 | 修复 |
|------|------|
| `getTenantLimits` 用 `\|\|` 导致 PRO 租户仍读 schema 默认 maxUsers=1 | 改为 `Math.max(套餐默认值, Tenant 表值)` |
| Launch 每日限额按 `contacts.length` 而非本次实际待发数 | 按 pending + throttlePerDay 计算 `emailsToAdd` |
| 邀请角色 `USER` 无 `hasPermission` 映射 | `auth-middleware` 为 USER 补权限 |
| accept-invite 用 `tenant.maxUsers` 而非套餐限额 | 改用 `getTenantLimits()` |
| 待处理邀请未计入成员上限 | `checkUserLimit` 含 PENDING 邀请数 |
| GET `/api/tenant/invite` 无权限校验 | 需 `settings:manage` |

**遗留：** CSV 批量导入联系人未校验 `maxContacts`；无撤销邀请 API；套餐升级未自动 sync Tenant 表限额字段。

### 9.16 Batch F — 拓客引擎（2026-05-30）

| 编号 | 任务 | 关键文件 |
|------|------|----------|
| #25 | 爬虫/采集引擎：`/api/cron/process-prospecting` 处理 PENDING 任务，RocketReach 搜索 → Company/Contact 入库 | `api/cron/process-prospecting/route.ts`, `vercel.json` |
| #27 | AI 拓词/职位建议：`generateKeywordSuggestions` + `generatePositionSuggestions` + 拓客页 AI 按钮 | `lib/openai.ts`, `api/prospecting/route.ts`, `prospecting/page.tsx` |
| #28 | 爬虫进度 UI：任务列表 tab + 进度条 + 状态标签 + 公司/联系人统计 | `prospecting/page.tsx` |

**需执行：** `npm run db:push`（`abTestAssignments` 字段已同步）

### 9.17 核实 Batch F 后修复（2026-05-30）

| 问题 | 修复 |
|------|------|
| `process-prospecting` 仅 POST、无 `verifyCronSecret` | 对齐其他 cron：GET+POST + `lib/cron-auth.ts` |
| 无 API Key 时任务仍 COMPLETED（0 结果） | 缺 `ROCKETREACH_API_KEY` 时标 FAILED 并写 description |
| 空搜索条件任务仍执行 | 创建与 cron 均校验至少有关键词/行业/职位之一 |
| 采集联系人未受套餐限额约束 | 入库前调用 `checkContactLimit` |
| RUNNING 任务崩溃后永久卡住 | 30 分钟超时自动重置为 PENDING |
| GET `/api/prospecting` 无 tenantId 校验 | 403 拒绝未关联租户 |
| 任务列表 tab 仍显示创建表单 | tab=tasks 时仅展示列表 + 刷新；创建后自动跳转 |

### 9.18 Batch G — 存储 / 附件 / E2E / 文档（2026-05-30）

| 编号 | 任务 | 关键文件 |
|------|------|----------|
| G1 | S3 兼容存储：`@aws-sdk/client-s3` 集成，支持 Cloudflare R2 / AWS S3 / MinIO；三级存储优先级 Blob > S3 > 本地 | `lib/storage.ts`, `lib/env.ts`, `.env.example` |
| G2 | Attachment 模型 + DB 追踪：上传自动写库、附件列表/删除 API、租户隔离 | `schema.prisma`, `api/upload/attachment/route.ts`, `api/attachments/route.ts` |
| G4 | E2E 测试扩展：新增 templates / settings / inbox / prospecting 共 4 个 spec 文件；storage 单元测试 10 条 | `e2e/templates.spec.ts`, `e2e/settings.spec.ts`, `e2e/inbox.spec.ts`, `e2e/prospecting.spec.ts`, `src/__tests__/storage.test.ts` |
| G5 | 文档更新：`.env.example` S3 配置、审计报告 Batch G 记录 | `.env.example`, `docs/audit-report.md` |

**需执行：** `npm run db:push`（新增 `Attachment` 模型）

### 9.19 核实 Batch G 后修复（2026-05-30）

| 问题 | 修复 |
|------|------|
| Blob 删除用 pathname 而非 URL | `deleteFile` 增加 `url` 参数，Blob 后端用完整 URL 调用 `del()` |
| 附件 DELETE 无权限校验 | 仅上传者本人或 ADMIN/OWNER 可删 |
| 无 tenantId 仍上传文件但不写 DB | 上传前 403，避免孤儿文件 |
| `.env.example` R2 域名拼写错误 | `cloudflorage` → `cloudflarestorage` |

**核实结果：** G1/G2/G4/G5 均已落地；单元测试 25 条（storage 10 条）；E2E 共 76 条；`npm run build` 通过。

---

## 十、Batch H 执行计划（下一批 — 产品闭环 + E 遗留）

> **目标：** 附件真正进 Campaign 发信链路；邮件 HTML 图片可公网访问；补齐 Batch E 遗留；同步审计清单。  
> **前置：** `npm run db:push` 已完成（含 `Attachment` 表）；本地需 `worker:email` + Redis。  
> **验收：** `npm run build` + `npm test` 通过；手动走通「上传附件 → 创建 Campaign → Launch → 收件箱收到带附件邮件」。

### H1 — #44 邮件附件 × Campaign 关联

| 步骤 | 任务 | 关键文件 | 验收标准 |
|------|------|----------|----------|
| H1a | Campaign 模型增加 `attachmentIds String[]`（或复用 Attachment.relatedType/relatedId，二选一，推荐 **relatedId 多态** 减少 schema 变更） | `prisma/schema.prisma` | `db:push` 成功 |
| H1b | Campaign 向导「内容」步骤：上传附件 UI（调用 `POST /api/upload/attachment`，传 `relatedType=campaign` + 草稿 campaignId 或创建后 batch 关联） | `campaigns/new/page.tsx` | 可上传/删除/列表展示 |
| H1c | 创建/更新 Campaign 时保存 attachment 关联 | `api/campaigns/route.ts` | GET campaign 返回附件列表 |
| H1d | `EmailJobData` 增加 `attachmentIds?: string[]`；Launch 入队时写入 | `lib/email-queue.ts`, `api/campaigns/[id]/launch/route.ts` | Job payload 含附件 ID |
| H1e | Worker / 直发路径：按 ID 查 Attachment → 下载 Buffer → 传给 `sendAccountMail({ attachments })` | `lib/email-worker.ts`, `lib/email-queue.ts` | 实际邮件带附件 |
| H1f | 单元测试：mock Attachment + 验证 attachments 传入 sendAccountMail | `src/__tests__/campaign-attachments.test.ts` | ≥3 条 |

**技术要点：**

- `sendAccountMail` / `email-account-mail.ts` 已支持 `attachments?: Array<{ filename; content: Buffer }>`，无需改 nodemailer 层。
- S3/Blob 附件需 **fetch URL → Buffer**（新增 `lib/storage.ts` → `fetchFileBuffer(url)` 或 launch 时预加载）。
- 附件总大小上限建议 **10MB/封**（与 `validateFile` 一致）。

### H2 — #44a 邮件 HTML 内外链图片公网 URL

| 步骤 | 任务 | 关键文件 | 验收标准 |
|------|------|----------|----------|
| H2a | 新增 `resolvePublicUrls(html: string): Promise<string>`：将 `src="/uploads/..."` 和相对路径转为 Blob/S3 公网 URL | `lib/email-html.ts`（新建） | 本地 HTML 发信后收件方能看到图片 |
| H2b | Launch / Worker 发信前调用（在变量替换 + tracking 之后） | `launch/route.ts`, `email-worker.ts`, `email-queue.ts` | 无 localhost URL 出现在最终 HTML |
| H2c | 若仍为 local 后端且未配 S3/Blob：**Launch 前 warn** 或 block（Settings/向导提示） | `campaigns/new/page.tsx` 或 launch API | 开发环境有明确提示 |
| H2d | 单元测试：local path → 保持不变；mock S3 publicUrl 替换 | `src/__tests__/email-html.test.ts` | ≥4 条 |

### H3 — Batch E 遗留补全

| 步骤 | 任务 | 关键文件 | 验收标准 |
|------|------|----------|----------|
| H3a | **修复 CSV 导入 tenantId 传参错误**（当前 `import/confirm` 误传 `userId` 作 tenantId） | `api/contacts/import/confirm/route.ts` | 导入联系人出现在正确租户 |
| H3b | CSV 导入前 `checkContactLimit`；超出时返回 403 + 剩余配额 | `csv-import.ts` 或 confirm route | 超限无法导入 |
| H3c | 撤销邀请 API：`DELETE /api/tenant/invite?id=` → status `REVOKED` | `api/tenant/invite/route.ts` | Settings 可撤销 PENDING 邀请 |
| H3d | Settings 邀请列表增加「撤销」按钮 | `dashboard/settings/page.tsx` | UI 可操作 |
| H3e | 套餐变更 helper：`syncTenantLimits(tenantId, plan)` 在 register/upgrade 时 sync `maxContacts/maxUsers/maxEmailsPerDay` | `lib/plan-limits.ts`, 相关 API | PRO 租户限额与 plan 一致 |

### H4 — 审计文档同步

| 步骤 | 任务 | 文件 |
|------|------|------|
| H4a | §4.7 勾选 **#43**（S3/R2 已在 G1 完成） | `docs/audit-report.md` |
| H4b | §4.12 更新测试状态（76 E2E + 25 单元，标注剩余缺口） | 同上 |
| H4c | 新增 §9.21 Batch H 完成记录（Claude 执行后填写） | 同上 |
| H4d | `CLAUDE.md` 补充：Cron worker 端口 `CRON_WORKER_HEALTH_PORT=8082` vs email `8080` | `CLAUDE.md` |

### 建议执行顺序

```
H3a（CSV tenantId 修复，P0 bug）→ H1 → H2 → H3b–e → H4 → npm run build && npm test
```

### 明确不在 Batch H 范围

- #31–36 域名/Warm-up/GDPR（→ Batch I）
- #40 地理分析、#54 产品推荐、#56–59 基础设施（→ Batch I/J）
- #15 SMTP 连接池（可选，低优先级）

---

### 9.21 Batch H — 产品闭环 + E 遗留（2026-05-30）

| 编号 | 任务 | 关键文件 |
|------|------|----------|
| H3a | CSV 导入 tenantId bug 修复：`authResult.userId` → `authResult.tenantId` + 无租户 403 | `api/contacts/import/confirm/route.ts` |
| H1 | 邮件附件 × Campaign 关联：Attachment 多态关联 + Launch 写入 attachmentIds + Worker/直发下载 Buffer + 发信带附件 | `email-queue.ts`, `email-worker.ts`, `campaigns/[id]/launch/route.ts`, `storage.ts` |
| H2 | 邮件 HTML 公网 URL：`resolvePublicUrls` 将本地路径转 APP_URL 绝对地址 + Worker/直发集成 | `lib/email-html.ts`, `email-worker.ts`, `email-queue.ts` |
| H3b | CSV 导入前 `checkContactLimit`，超限 403 | `api/contacts/import/confirm/route.ts` |
| H3c | 撤销邀请 API：`DELETE /api/tenant/invite?id=` → status REVOKED | `api/tenant/invite/route.ts` |
| H3d | Settings 邀请列表 + 「撤销」按钮 + usage API 返回 invitations | `dashboard/settings/page.tsx`, `api/tenant/usage/route.ts` |
| H3e | `syncTenantLimits(tenantId, plan)` 套餐变更 helper | `lib/plan-limits.ts` |
| H4 | 审计文档同步：#43/#44/#44a 勾选、测试状态更新、§9.21 记录、CLAUDE.md 更新 | `docs/audit-report.md`, `CLAUDE.md` |
| H1f | 单元测试：campaign-attachments 8 条（resolvePublicUrl + resolvePublicUrls） | `src/__tests__/campaign-attachments.test.ts` |

**验证：** `npm run build` ✅ · `npm test` 33 条全通过 · E2E 76 条 · TypeScript 零错误

### 9.22 核实 Batch H 后修复（2026-05-30）

| 问题 | 修复 |
|------|------|
| H1b 向导无附件上传 UI（后端有、用户无法操作） | `CampaignAttachmentPicker` + `StepAiWriter` 上传/删除；`POST /api/campaigns` 接收 `attachmentIds` 并 `linkAttachmentsToCampaign` |
| 序列/定时 Cron 发信不带附件 | `advance-sequences.ts`、`launch-scheduled.ts` 写入 `attachmentIds` |
| `syncTenantLimits` 定义未调用 | `register` 创建租户后调用 |
| CSV 限额仅拦已满、未拦「导入量超剩余配额」 | 比较 `totalRows` vs `max - current` |
| Launch 附件查询重复 | 抽取 `lib/campaign-attachments.ts` 复用 |

### 9.23 Batch I — 运维闭环 + 部署文档（2026-05-30）

| 编号 | 任务 | 关键文件 |
|------|------|----------|
| I1 | 套餐升级时调用 `syncTenantLimits`：新增 `PATCH /api/tenant/usage`（仅 ADMIN/OWNER） | `api/tenant/usage/route.ts` |
| I2 | Campaign PUT/PATCH tenantId 隔离 — 核实已全部到位（campaigns/contacts/templates 所有写操作均 `where: { id, tenantId }`） | `api/campaigns/[id]/route.ts` 等 |
| I3 | 本地无 APP_URL 时 Launch 警告：`console.warn` 提示追踪链接和图片不可用 | `api/campaigns/[id]/launch/route.ts` |
| I4 | 部署文档更新：S3/R2 存储选项 + docker-compose 服务说明 | `docs/deployment.md` |
| I5 | 队列 failed 任务优化：`getFailedJobs()` API + 队列页展示失败详情表 + `retry-failed` Cron（每 30 分钟） | `lib/email-queue.ts`, `api/email-queue/route.ts`, `email-queue/page.tsx`, `api/cron/retry-failed/route.ts`, `vercel.json` |
| I6 | 审计同步：Phase 4 已完成项标记、§5 优先级更新、§9.23 记录 | `docs/audit-report.md` |

**验证：** `npm run build` ✅ · `npm test` 33 条全通过 · TypeScript 零错误

### 9.24 核实 Batch I 后修复（2026-05-30）

| 问题 | 修复 |
|------|------|
| I1 仅有 PATCH API、Settings 无套餐切换 UI | Settings 套餐下拉 + 「应用套餐」；PATCH 返回更新后 limits/usage |
| I3 仅 console.warn、前端无感知 | Launch 响应 `warnings[]` + 向导 `toast.warning` |
| I4 deployment.md 仍写 S3 三选一 | 改为 Vercel Blob + 本地磁盘，补充 APP_URL 说明 |
| I5 Cron 注释限 20 条/1h 但实现重试全部 | `retryFailedJobs({ limit: 20, maxAgeMs: 1h })`；队列页文案同步 |
| usage/route 合并 import 误删 errorResponse | 恢复 import |

### 9.25 Batch J — 邮件合规与送达率（2026-05-30）

| 编号 | 任务 | 关键文件 |
|------|------|----------|
| J1 | 发信域名管理页：`GET /api/email-accounts/[id]/dns-records` 返回 SPF/DKIM/DMARC/MTA-STS 建议 DNS 记录（基于邮箱域名 + SMTP Host 智能推断）；Settings 页 DNS 按钮 + 对话框（含复制、状态标签、配置建议） | `api/email-accounts/[id]/dns-records/route.ts`, `dashboard/settings/page.tsx` |
| J2 | EmailAccount Warm-up：`warmupEnabled`/`warmupDay`/`warmupTarget` 字段；21 天递增曲线（5→15→30→50→target）；`checkDailyLimit` 跨天自动推进；API 支持启用/配置 warmup | `schema.prisma`, `lib/warmup.ts`, `lib/email-account-mail.ts`, `api/email-accounts/[id]/route.ts` |
| J3 | GDPR：联系人数据导出 API（`GET /api/contacts/[id]/export`，JSON 下载含邮件/Campaign 关联）；删除联系人级联清理 EmailLog + CampaignContact | `api/contacts/[id]/export/route.ts`, `api/contacts/[id]/route.ts` |
| J4 | 退订页品牌化：`/unsubscribe` 支持 tenant 名称 + Accept-Language 语言检测（中/英）+ tenant settings 语言配置；双语完整文案 | `api/unsubscribe/route.ts` |
| — | 单元测试：warmup 策略 10 条 | `src/__tests__/warmup.test.ts` |

**验证：** `npm run build` ✅ · `npm test` 43 条全通过 · TypeScript 零错误

### 9.26 核实 Batch J 后修复（2026-05-30）

| 问题 | 修复 |
|------|------|
| J1 MTA-STS TXT 与 SPF 同 host（根域名） | MTA-STS 改为 `_mta-sts.{domain}` + `v=STSv1` 格式 |
| J2 warmup 完成后 dailyLimit 卡在曲线封顶 50 | `checkDailyLimit` 跨天在 warmup 完成后写入 `warmupTarget` |
| J2 PATCH 启用 warmup 未重置 warmupDay | PATCH 与 PUT 一致：启用时从 Day 1 开始并设 dailyLimit |
| J2 Settings 无 Warm-up 配置 UI | 编辑账户表单增加开关 + 目标限额；列表展示 Warm-up 天数 |
| J3 导出 API 无权限校验、邮件正文被占位符替换 | 增加 `contacts:manage` 校验；导出完整 emailLogs.content |
| J3 联系人页无 GDPR 导出入口 | 详情抽屉增加「导出个人数据 (GDPR)」按钮 |

---

## 十一、Batch K 执行计划（下一批 — 分析 + 生产就绪）

> **目标：** 补齐审计剩余 P1/P2 项；完成生产部署闭环。  
> **前置：** `npm run db:push`（含 warmup 字段）；Vercel Blob + Upstash Redis 已配置。

| 编号 | 任务 | 关键文件 | 验收 |
|------|------|----------|------|
| K1 | **#36** 域名 DNS 在线验证（SPF/DKIM/DMARC 解析检测 + Settings DNS 对话框状态） | `lib/dns-verify.ts`, `api/email-accounts/[id]/dns-records/route.ts` | 配置后显示 ✅/❌ |
| K2 | **#40** 打开/点击地理分析（EmailLog IP → 国家/城市聚合） | `api/campaigns/stats/route.ts`, `CampaignStats` | Campaign 页地图/表格 |
| K3 | **#54** 产品推荐（Campaign AI 生成时注入 Product 库） | `api/campaigns/ai-generate/route.ts`, `dashboard/products` | 向导可选产品 |
| K4 | **#64** API 集成测试（auth + contacts CRUD + export + launch smoke） | `src/__tests__/api/` | CI 可跑 |
| K5 | 生产部署 checklist：Vercel + Blob + Worker docker-compose + `APP_URL` | `docs/deployment.md` | 一键对照清单 |
| K6 | Settings 租户语言（`tenant.settings.language`）写入 UI，联动退订页 | `api/tenant/usage/route.ts`, `dashboard/settings/page.tsx` | 切换后退订页语言变化 |

**建议顺序：** K6（小）→ K1 → K4 → K5 → K2 → K3

### 9.27 Batch K — 分析 + 生产就绪（2026-05-30）

| 编号 | 任务 | 关键文件 |
|------|------|----------|
| K1 | **#36** 域名 DNS 在线验证：`verifySPF`/`verifyDMARC`/`verifyDKIM`（Node.js dns 模块）；dns-records API 返回 `verification[]`；Settings DNS 对话框展示 ✅/⚠️/❌ 状态 | `lib/dns-verify.ts`, `api/email-accounts/[id]/dns-records/route.ts`, `dashboard/settings/page.tsx` |
| K2 | **#40** 地理分析：EmailLog 新增 `openIp`/`openCountry`/`openCity` 字段；open tracking 捕获 Vercel/Cloudflare IP+Country headers；campaign stats API 返回 `geo[]` 按国家聚合 | `schema.prisma`, `lib/email-tracking.ts`, `api/email/track/open/route.ts`, `api/campaigns/stats/route.ts` |
| K3 | **#54** 产品推荐：未选产品时自动注入租户产品目录上下文到 AI prompt（最多 10 个产品） | `api/campaigns/ai-generate/route.ts` |
| K4 | **#64** API 集成测试：模块导入验证 + DNS 验证函数签名 + 存储/队列/限流模块完整性 | `src/__tests__/api/contacts-export.test.ts` |
| K5 | 生产部署 checklist：基础设施 + 环境变量 + 文件存储 + 邮件送达率 + 监控运维 5 大类 20+ 检查项 | `docs/deployment.md` |
| K6 | Settings 租户语言：`PATCH /api/tenant/usage` 支持 `language` 字段；usage API 返回 `tenant.language`；Settings 语言下拉 + 保存按钮 | `api/tenant/usage/route.ts`, `dashboard/settings/page.tsx` |

**验证：** `npm run build` ✅ · `npm test` 52 条全通过 · TypeScript 零错误

### 9.28 核实 Batch K 后修复（2026-05-30）

| 问题 | 修复 |
|------|------|
| K2 stats API 返回 `geo[]` 但 CampaignStats 未展示 | `CampaignStats` 增加按国家横向柱状图 |
| K3 仅有产品库、无 prompt 时仍 400 | 租户有活跃产品时可仅凭产品目录触发 AI 生成 |
| K6 PATCH 响应 `language` 字段错误 | 从 `tenant.settings.language` 回读 |
| K6 保存语言后 UI 未刷新 | 保存成功后 `loadTenantUsage()` |
| K5 deployment 清单仍写 S3 三选一 | 改为 Vercel Blob + 本地开发 |

### 9.29 Batch L — 分析增强 + 生产就绪（2026-05-30）

| 编号 | 任务 | 关键文件 |
|------|------|----------|
| L1 | **#65** UI 组件测试：Campaign Stats API（含 geo 数据）+ DNS Records API（含 verification）+ GDPR Export API（含 download header） | `e2e/api/campaign-stats.spec.ts` |
| L2 | **#56–59** 生产运维：结构化 JSON 日志 `logger.ts`（含 child logger）+ 运维手册（DB 备份 / Redis / 告警 / 扩展） | `lib/logger.ts`, `docs/operations.md` |
| L3 | 地理分析增强：click tracking 捕获 geo + `localizeGeoStats` 国家代码中文化（150+ 国家）+ campaign stats 返回本地化国家名 | `lib/geo.ts`, `lib/email-tracking.ts`, `api/email/track/click/route.ts`, `api/campaigns/stats/route.ts` |
| L4 | DNS 验证增强：`inferDkimSelector(smtpHost)` 按 SMTP 服务商推断 DKIM selector（Google→google, Outlook→selector1, SendGrid→s1 等 10+） | `lib/dns-verify.ts`, `api/email-accounts/[id]/dns-records/route.ts` |
| L5 | **#64** 真实 HTTP API 测试：Playwright API 模式覆盖 auth/login（4 条）+ contacts CRUD（3 条）+ tenant usage + email queue + 公开页面 | `e2e/api/auth.spec.ts` |
| L6 | 生产首发：`db:push` 验证 schema 同步 + deployment.md 首次上线流程 7 步 | `docs/deployment.md` |

**验证：** `npm run build` ✅ · `npm test` 53 条全通过 · E2E 90 条 · TypeScript 零错误

### 9.30 核实 Batch L 后修复（2026-05-30）

| 问题 | 修复 |
|------|------|
| L4 验证用推断 selector，建议记录仍写 `default._domainkey` | DNS 建议 host 与 `inferDkimSelector` 对齐 |
| L4 `smtp.office365.com` 未匹配 Microsoft selector | `inferDkimSelector` 增加 `office365` 分支 |
| L2 `logger.ts` 定义但未接入 Worker | `start-email-worker.ts` 改用结构化 JSON 日志 |
| L3 geo 图表 Y 轴过窄，中文国名截断 | 加宽 Y 轴 + Tooltip 显示 ISO code |
| 审计报告 §9.28 表格错位、§十二仍写 L 待办 | 重组章节，§十二改为 Post-MVP 路线 |

---

## 十二、Post-MVP 产品路线（Batch D–L 已全部完成）

> **§4 审计清单：** 所有可实现功能项均已落地（#1–#65）。#56–#59 以运维手册 + logger 方案覆盖，非代码自动化。

| 方向 | 建议任务 | 优先级 |
|------|----------|--------|
| **生产上线** | 按 `deployment.md` §6–§7 执行 `db:push`、Vercel 部署、Worker 容器、DNS 验证 | P0 |
| **测试深化** | React Testing Library 组件测试；Campaign launch smoke；CI 跑 `test:e2e` | P1 |
| **分析增强** | 点击 geo 独立字段 + 地图可视化；Campaign 向导 geo 预览 | P2 |
| **送达率** | DKIM selector 可配置 UI；mail-tester 集成；退信自动暂停账户 | P2 |
| **商业化** | Stripe 套餐订阅；用量超限付费升级 | P2 |
| **运维自动化** | 告警 webhook Cron；Datadog/Sentry 接入；DB 备份 cron 脚本落地 | P3 |

**推荐下一步：** 执行生产首发（`npm run db:push` → Vercel deploy → Worker up）→ 配置真实发信域名 DNS → 跑一轮 Campaign 端到端验证。

---

*本报告最后更新：2026-05-30。Batch D–L 全部完成；§9.30 核实修复已落地。*

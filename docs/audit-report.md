# OutreachHub 项目现状与开发缺口报告

> **生成日期**：2026-05-29  
> **最后更新**：2026-05-30（前端接线：Campaign 调度向导 / Prospecting 导入 / CampaignStats / 联系人时间线 / docker worker env）  
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
- **用户营销邮件已走 EmailAccount SMTP**（见 Phase 1 完成情况）；平台系统邮件仍用 `.env`
- **Email Worker 需单独终端运行**；失败任务不会自动重试，需手动 `/api/email-queue/retry` 或队列监控页
- **本地开发 Cron 不自动执行**；IMAP 收信需手动刷新收件箱或 `POST /api/cron/check-replies`

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

**P0' / Phase 1–3 已完成（2026-05-29～30）。当前遗留重点：**

- **Worker / Cron 本地运维说明**（#55）— 文档/脚本
- **IMAP 配置 UX** — 常见坑：`smtp.xxx.com` 对应 IMAP 常为 `mail.xxx.com`（见 §九）
- **队列 failed 任务手动重试** — 无自动 Cron（见 §九）

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

- [ ] 25. 爬虫/采集引擎
- [x] 26. RocketReach → 保存 Company/Contact（API + **prospecting 页勾选导入**）
- [ ] 27. AI 拓词/职位建议
- [ ] 28. 爬虫进度更新
- [x] 29. 去重（`import-companies` 按 domain/name 去重；`import-contacts` 按 email 去重）

### 4.5 域名与合规

- [x] 30. 退订功能（`/api/unsubscribe` + Contact.unsubscribed + 邮件退订链接）
- [ ] 31–36. 域名验证、SPF/DKIM/DMARC、Warm-up、GDPR

### 4.6 追踪与分析

- [x] 37. Worker / 直发追踪 URL（`addEmailTracking`，`e`/`c`/`u`）
- [x] 38. Campaign 趋势图（`CampaignStats` 已挂到 `/campaigns` + `/api/campaigns/stats`）
- [x] 39. 联系人互动时间线（API + **contacts 详情抽屉 UI**）
- [ ] 40. 地理/IP 分析

### 4.7 文件存储

- [x] 41. 头像 → `User.avatar`
- [x] 42. `/api/users/me`
- [ ] 43. 生产对象存储 S3/R2
- [ ] 44. 邮件附件与 Campaign 关联
- [ ] 44a. 邮件 HTML 内外链图片公网 URL（非 localhost）

### 4.8 用户与租户

- [x] 45. 注册邮箱验证 + **平台 SMTP 发欢迎信**（已有 `/api/auth/forgot-password` + `/reset-password` + 注册欢迎信）
- [ ] 46. 套餐限额
- [ ] 47. 团队邀请
- [x] 48. 角色差异化鉴权（五角色矩阵 + 写 API：campaigns/contacts/templates/companies/prospecting/inbox/email-accounts/queue-retry）

### 4.9 模板与 AI

- [x] 49. Launch 变量替换（见 9a）
- [x] 50. AI 生成模板完整流程（生成 + 主题行推荐 + 润色 + 翻译）
- [x] 51. 模板分类与统计（分类筛选 + 分类统计条）

### 4.10 产品管理

- [x] 52. 产品管理：侧边栏入口 + hasPermission 鉴权 + Campaign 向导关联产品（productId）
- [x] 53. 产品 × Campaign AI 深度接线（productId 注入 prompt + 列表展示关联产品名）
- [ ] 54. 产品推荐 / 关联分析

### 4.11 基础设施

- [x] 55. Worker 守护（PM2 / docker-compose service）— worker 服务 + `env_file: .env` 继承 SMTP/ENCRYPTION_KEY
- [ ] 56–59. Redis HA、备份、日志、告警
- [x] 60. `.env.example` 已补充 Redis + 火山方舟（部分）
- [x] 61. Dockerfile + docker-compose（PG + Redis + App + Worker）— docker-compose.yml 已配置 postgres + redis + worker

### 4.12 测试

- [ ] 62–65. 单元 / E2E / API / UI 测试

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

9. A/B、Sequence、S3、完整 E2E 覆盖

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

---

*本报告最后更新：2026-05-30。Batch D 已完成；后续从 Batch E 继续。*

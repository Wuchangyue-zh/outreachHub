# OutreachHub 开发规章

> **Claude / Agent 必读**：修改任何后端、队列、Cron、邮件、租户、Campaign 相关代码前，先读本文「架构硬性规则」。详细部署见 [`docs/deployment.md`](docs/deployment.md)，模块索引见 [`docs/architecture.md`](docs/architecture.md)。

## 核心开发命令

| 用途 | 命令 |
|------|------|
| 本地 Web | `npm run dev`（端口 **3030**，勿用 3000） |
| 数据库迁移 | `npm run db:push`（**禁止**裸跑 `npx prisma`，会拉到 Prisma 7） |
| Prisma Studio | `npm run db:studio` |
| 打包 | `npm run build` |
| Email Worker | `npm run worker:email`（**另开终端**，Campaign 发信必须跑） |
| Cron Worker | `npm run worker:cron`（50+ 租户推荐） |
| IMAP Worker | `npm run worker:imap`（大量 EmailAccount 推荐） |
| 本地基础设施 | `docker compose up -d postgres redis` |

Prisma 版本锁定 **5.22**，Schema 唯一真相源：`prisma/schema.prisma`。

## 代码风格

- 全面使用 TailwindCSS，禁止手写独立 CSS 文件。
- 路由使用 Next.js 15 App Router（`src/app/`）。
- 所有数据模型必须遵循 `prisma/schema.prisma`，改 Schema 后执行 `npm run db:push`。

---

## 架构硬性规则（禁止回退）

### 1. 部署拓扑 — 分体式，不是单体

```
Vercel (Next.js Web + Cron HTTP 触发)
    ↓ enqueue
Redis (BullMQ 队列)
    ↓ consume
独立 Worker 进程（Docker / Fly / Railway，7×24）
    ↓
PostgreSQL (生产必须用 pooler URL)
Vercel Blob (生产文件存储)
```

**禁止事项：**
- ❌ 在 Vercel Serverless 内跑长期 Worker、IMAP 长连接、或同步批量发信
- ❌ 假设 `pnpm dev` 会自动消费邮件队列（必须手动 `worker:email`）
- ❌ 生产只部署 Vercel 而不部署 Worker（有 Redis 则队列堆积，无 Redis 则 API 内同步发信超时）

**必须事项：**
- ✅ 生产：`REDIS_URL` + 三个 Worker 至少跑 `worker:email`
- ✅ 生产：`DATABASE_URL` 使用 Neon/Supabase **连接池 URL**
- ✅ 生产：`CRON_SECRET`、`NEXTAUTH_SECRET`、`ENCRYPTION_KEY` 必填（见 `src/lib/env.ts`）

### 2. 三个 BullMQ 队列 — 各司其职

| 队列名 | 生产者 | 消费者 | 关键文件 |
|--------|--------|--------|----------|
| `email-queue` | Launch、Cron、Inbox | `npm run worker:email` | `src/lib/email-queue.ts`, `email-worker.ts` |
| `cron-jobs` | `/api/cron/*` HTTP | `npm run worker:cron` | `src/lib/cron-queue.ts`, `cron-jobs/*.ts` |
| `imap-jobs` | `/api/cron/check-replies` | `npm run worker:imap` | `src/lib/imap-queue.ts`, `imap-multi.ts` |

**Cron 路由规则：**
- `/api/cron/*` **只做鉴权 + 入队**，业务逻辑在 `src/lib/cron-jobs/`，由 `cron-worker` 消费
- 无 Redis 时降级为进程内同步执行（仅适合本地开发）
- **禁止**在 Cron route 里写大段业务逻辑（应加到 `src/lib/cron-jobs/`）

### 3. 邮件双通道 — 不可混用

| 邮件类型 | 发信入口 | SMTP 来源 |
|----------|----------|-----------|
| 注册欢迎、密码重置、系统通知 | `sendPlatformMail()` | `.env` SMTP |
| Campaign / 队列 / Worker / Inbox 回复 | `sendAccountMail({ emailAccountId })` | DB `EmailAccount` |
| 邮件测试 | 用户选定的 `EmailAccount` | DB `EmailAccount` |

**禁止** Campaign 发信走平台 `.env` SMTP（除非明确降级且无 EmailAccount）。

### 4. Campaign 联系人 — 用关联表，不是裸数组

- **读写联系人列表**：用 `src/lib/campaign-contacts.ts`
  - `getCampaignContactIds(campaignId)` — 优先读 `CampaignContact` 表，回退 `Campaign.contactIds[]`
  - `replaceCampaignContacts()` / `syncCampaignContacts()` — 写入时同步关联表
- **禁止**在新代码里直接依赖 `campaign.contactIds` 做发信逻辑（遗留字段保留兼容，逐步废弃）
- `EmailLog.contactId` 已有 FK 关系到 `Contact`

### 5. 多租户隔离 — 必须带 tenantId

- 所有租户数据查询：**必须**使用 `tenantWhere(tenantId, filter)`（`src/lib/auth-middleware.ts`）
- 无 `tenantId` 时返回 `{ id: '__no_tenant__' }` 永不匹配，**禁止**返回空 filter 导致全表泄露
- 新建 API route 时复制现有模式：`verifyAuthToken` → `tenantWhere(auth.tenantId)` → Prisma

### 6. 分布式组件 — 已 Redis 化，禁止改回进程内

| 能力 | 实现 | 文件 |
|------|------|------|
| API 限流 | Redis INCR + 内存降级 | `src/lib/rate-limit.ts`（`check` 是 **async**，必须 await） |
| 实时邮件事件 | Redis Pub/Sub + 本地 emitter | `src/lib/events.ts` |
| Dashboard 统计缓存 | Redis 预聚合 | `src/lib/stats-aggregate.ts` |
| 缓存删除 | Redis SCAN（**禁止**用 KEYS） | `src/lib/redis.ts` |

### 7. 文件上传 — Blob（生产）/ 本地磁盘（开发）

- 统一入口：`uploadFile()` / `deleteFile()` / `fetchFileBuffer()` in `src/lib/storage.ts`
- **本地开发**：不配 `BLOB_READ_WRITE_TOKEN` → `public/uploads/`
- **Vercel 生产**：关联 Blob Store 后平台注入 `BLOB_READ_WRITE_TOKEN`
- 附件 DB 追踪：`Attachment` 模型（`relatedType`/`relatedId` 多态关联 Campaign 等）
- 邮件附件：Worker 通过 `fetchFileBuffer(url)` 下载 → `sendAccountMail({ attachments })`
- 邮件图片公网化：`resolvePublicUrls(html)` 将 `/uploads/...` 转为 `APP_URL` 绝对地址
- **禁止**在新代码里直接 `fs.writeFile` 到 `public/uploads`

### 8. 安全 — 生产无 fallback

- JWT：`getJwtSecret()` — 生产无 `NEXTAUTH_SECRET` 则启动失败，**禁止**加 hardcoded fallback
- Cron：`verifyCronSecret()` — 生产无 `CRON_SECRET` 返回 503，**禁止**未鉴权开放
- 启动校验：`src/instrumentation.ts` → `validateEnv()`

### 9. Worker 可扩展配置

环境变量（可选）：
- `EMAIL_WORKER_CONCURRENCY`（默认 5）
- `EMAIL_WORKER_RATE_MAX` / `EMAIL_WORKER_RATE_DURATION_MS`
- `WORKER_HEALTH_PORT`（Email，默认 8080）
- `CRON_WORKER_HEALTH_PORT`（Cron，默认 8082）
- `IMAP_WORKER_HEALTH_PORT`（IMAP，默认 8081）
- 各 Worker 暴露 `GET /health`；端口被占用时 Worker 仍运行，仅跳过健康检查

多实例 Worker 共享同一 Redis 队列即可水平扩展。

---

## 本地开发速查

```bash
docker compose up -d postgres redis   # PG 5433, Redis 6379
npm run dev                             # :3030
npm run worker:email                    # 终端 2 — 必须
npm run worker:cron                     # 终端 3 — 可选
npm run worker:imap                     # 终端 4 — 可选
```

- Redis 未配置：邮件队列降级为 API 内同步 SMTP 直发（**仅开发**）
- Vercel Cron 本地不自动跑：手动 `curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3030/api/cron/launch-scheduled`
- 队列失败任务：3 次重试后进 failed，需 `/api/email-queue/retry` 或队列监控页手动重试

---

## 修改前自检清单

- [ ] Campaign 联系人是否走 `campaign-contacts.ts`？
- [ ] API 查询是否带 `tenantWhere(tenantId)`？
- [ ] Cron 新逻辑是否放在 `src/lib/cron-jobs/` 而非 route？
- [ ] 发信是否走队列 + Worker，而非 API 内循环 SMTP？
- [ ] 上传是否走 `storage.ts`？
- [ ] 限流 `await limiter.check()` 了吗？
- [ ] 生产 env 是否不依赖 fallback secret？

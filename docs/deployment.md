# OutreachHub 生产部署指南

> 架构模块索引与禁止回退规则见 [`architecture.md`](architecture.md) 和 [`CLAUDE.md`](../CLAUDE.md)。

## 架构拓扑

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────────────────┐
│ Vercel          │     │ Upstash      │     │ Worker 容器 (Fly/Railway)│
│ Next.js + Cron  │────▶│ Redis        │◀────│ - email-worker          │
└────────┬────────┘     └──────────────┘     │ - cron-worker (可选)    │
         │                                     │ - imap-worker (可选)    │
         ▼                                     └─────────────────────────┘
   Neon PostgreSQL (pooler URL)
   Vercel Blob（生产）/ public/uploads（本地开发）
```

## 1. Vercel（Web + Cron）

1. 连接 GitHub 仓库并部署
2. 设置环境变量（见 `.env.example`）
3. `DATABASE_URL` 必须使用 **连接池 URL**（Neon `-pooler` 或 Supabase Transaction pooler）
4. `CRON_SECRET`、`NEXTAUTH_SECRET`、`ENCRYPTION_KEY` 生产必填
5. **文件存储**：Vercel 控制台 → Storage → 创建 Blob Store 并关联项目（平台自动注入 `BLOB_READ_WRITE_TOKEN`）；本地开发留空即可，文件写入 `public/uploads/`
6. `REDIS_URL` 指向 Upstash Redis
7. `APP_URL` 设为生产域名（邮件追踪链接与 HTML 图片公网化依赖此项）

Vercel Cron 已在 `vercel.json` 配置，会自动携带 `Authorization: Bearer $CRON_SECRET`。

## 2. Email Worker（必须独立部署）

```bash
# Docker Compose（推荐，含 PG + Redis + Worker）
docker compose up -d

# 仅启动 Worker
docker compose up -d worker

# 或 Fly.io / Railway
npm run worker:email
```

环境变量：`DATABASE_URL`、`REDIS_URL`、`ENCRYPTION_KEY`、`SMTP_*`

可选扩展：
- `EMAIL_WORKER_CONCURRENCY=10` — 并发数（默认 5）
- `EMAIL_WORKER_RATE_MAX=200` — 每分钟最大任务数
- `WORKER_HEALTH_PORT=8080` — Email Worker 健康检查
- `CRON_WORKER_HEALTH_PORT=8082` — Cron Worker 健康检查
- `IMAP_WORKER_HEALTH_PORT=8081` — IMAP Worker 健康检查

健康检查：`GET http://worker-host:<port>/health`（各 Worker 端口见上）

### docker-compose 服务说明

| 服务 | 用途 | 必须 |
|------|------|------|
| `postgres` | PostgreSQL 数据库（端口 5433→5432） | ✅ |
| `redis` | BullMQ 队列（端口 6379） | ✅ |
| `app` | Next.js Web 服务（端口 3030） | 本地开发 |
| `worker` | Email Worker（Campaign 发信） | ✅ 生产 |
| `cron-worker` | Cron 任务消费（50+ 租户推荐） | 可选 |
| `imap-worker` | IMAP 收信（大量 EmailAccount 推荐） | 可选 |

Worker 服务通过 `env_file: .env` 继承 SMTP/ENCRYPTION_KEY 等配置，容器内 `DATABASE_URL`/`REDIS_URL` 覆盖为容器网络地址。

## 3. Cron Worker（推荐，50+ 租户）

Cron HTTP 端点仅入队，由独立进程消费，避免 Vercel 60s 超时：

```bash
npm run worker:cron
```

## 4. IMAP Worker（推荐，大量 EmailAccount）

```bash
npm run worker:imap
```

## 5. 本地开发

```bash
docker compose up -d postgres redis
pnpm dev                    # 端口 3030
npm run worker:email        # 另开终端
npm run worker:cron         # 可选
```

## 6. 上线检查清单

### 基础设施
- [ ] PostgreSQL 连接池 URL（Neon `-pooler` / Supabase Transaction pooler）
- [ ] Redis（Upstash）已创建，`REDIS_URL` 已配置
- [ ] Email Worker 7×24 运行（`docker compose up -d worker`）
- [ ] Vercel Cron 已启用（`vercel.json` crons 自动触发）

### 环境变量
- [ ] `CRON_SECRET` — 生产必填，32+ 随机字符
- [ ] `NEXTAUTH_SECRET` — 生产必填，32+ 随机字符
- [ ] `ENCRYPTION_KEY` — 生产必填，64 hex 字符（`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`）
- [ ] `APP_URL` / `NEXTAUTH_URL` — 与生产域名一致（`https://your-domain.com`）
- [ ] `DATABASE_URL` — pooler URL + `sslmode=require`

### 文件存储
- [ ] **Vercel Blob**（生产推荐）：Storage → 创建 Blob Store 并关联项目
- [ ] 本地开发：`BLOB_READ_WRITE_TOKEN` 留空，文件写入 `public/uploads/`
- [ ] `APP_URL` 与生产域名一致（邮件 HTML 图片公网化依赖此项）

### 邮件送达率
- [ ] SPF 记录已配置（`GET /api/email-accounts/[id]/dns-records` 验证）
- [ ] DKIM 记录已配置
- [ ] DMARC 记录已配置（建议先 `p=none` 观察，再改 `p=quarantine`）
- [ ] `APP_URL` 非 localhost（否则邮件追踪链接和图片不可用）
- [ ] EmailAccount Warm-up 已启用（新账户建议 21 天递增）

### 监控与运维
- [ ] 队列监控：`GET /api/email-queue` stats
- [ ] Worker 健康检查：`GET http://worker:8080/health`
- [ ] `npm run build` 通过
- [ ] `npm test` 通过
- [ ] 演示账户可登录（`admin@outreachhub.com` / `admin123`）

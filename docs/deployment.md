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
   Vercel Blob (文件存储)
```

## 1. Vercel（Web + Cron）

1. 连接 GitHub 仓库并部署
2. 设置环境变量（见 `.env.example`）
3. `DATABASE_URL` 必须使用 **连接池 URL**（Neon `-pooler` 或 Supabase Transaction pooler）
4. `CRON_SECRET`、`NEXTAUTH_SECRET`、`ENCRYPTION_KEY` 生产必填
5. `BLOB_READ_WRITE_TOKEN` 用于头像/附件存储
6. `REDIS_URL` 指向 Upstash Redis

Vercel Cron 已在 `vercel.json` 配置，会自动携带 `Authorization: Bearer $CRON_SECRET`。

## 2. Email Worker（必须独立部署）

```bash
# Docker
docker compose up -d worker

# 或 Fly.io / Railway
npm run worker:email
```

环境变量：`DATABASE_URL`、`REDIS_URL`、`ENCRYPTION_KEY`、`SMTP_*`

可选扩展：
- `EMAIL_WORKER_CONCURRENCY=10` — 并发数（默认 5）
- `EMAIL_WORKER_RATE_MAX=200` — 每分钟最大任务数
- `WORKER_HEALTH_PORT=8080` — 健康检查端口

健康检查：`GET http://worker-host:8080/health`

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

- [ ] Redis + Email Worker 7×24 运行
- [ ] `DATABASE_URL` 使用 pooler URL
- [ ] `CRON_SECRET`、`NEXTAUTH_SECRET`、`ENCRYPTION_KEY` 已设置
- [ ] `APP_URL` / `NEXTAUTH_URL` 与生产域名一致
- [ ] `BLOB_READ_WRITE_TOKEN` 已配置（Vercel 部署）
- [ ] 监控队列：`GET /api/email-queue` stats

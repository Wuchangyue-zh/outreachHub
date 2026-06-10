# OutreachHub 开发规章

> 与 [`CLAUDE.md`](CLAUDE.md) 内容一致，供 Cursor Agent / Codex 读取。**架构硬性规则以 CLAUDE.md 为准。**

## 核心开发命令

- 本地 Web：`npm run dev`（端口 **3030**）
- 数据库：`npm run db:push`（禁止裸跑 `npx prisma`）
- Email Worker：`npm run worker:email`（Campaign 发信必须另开终端）
- Cron Worker：`npm run worker:cron`
- IMAP Worker：`npm run worker:imap`
- 基础设施：`docker compose up -d postgres redis worker cron-worker imap-worker`

## 架构要点（摘要）

1. **分体部署**：Vercel Web + Redis + 独立 Worker（email/cron/imap），禁止在 Serverless 跑 Worker
2. **三队列**：`email-queue` / `cron-jobs` / `imap-jobs` — Cron route 只入队，逻辑在 `src/lib/cron-jobs/`
3. **邮件双通道**：平台 SMTP（`sendPlatformMail`）vs 用户 EmailAccount（`sendAccountMail`）
4. **Campaign 联系人**：用 `src/lib/campaign-contacts.ts`，禁止新代码依赖裸 `contactIds[]`
5. **租户隔离**：`tenantWhere(tenantId)` 强制注入
6. **Redis 化**：限流、SSE 事件、统计预聚合 — 禁止改回进程内单例
7. **文件存储**：`src/lib/storage.ts`（Vercel Blob 生产 / 本地 `public/uploads/` 开发；附件 DB 追踪 `Attachment` 模型）
8. **安全**：生产必填 `CRON_SECRET`、`NEXTAUTH_SECRET`、`ENCRYPTION_KEY`，无 fallback

完整规则与禁止事项见 [`CLAUDE.md`](CLAUDE.md) 和 [`docs/architecture.md`](docs/architecture.md)。

## 代码风格

- TailwindCSS only，Next.js App Router，Schema 遵循 `prisma/schema.prisma`。

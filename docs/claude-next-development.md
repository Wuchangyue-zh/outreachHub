# Claude Code 下一阶段开发清单

> 基线：2026-06-19 Codex 修复轮次。执行前先读 `CLAUDE.md` 与 `docs/architecture.md`。

## 已完成，勿重复

- 修复 `src/lib/i18n.ts` 重复键导致的 TypeScript/生产构建失败。
- 修复登录页与新翻译键契约不一致，认证 E2E 12/12 通过。
- `prisma/seed.ts` 可重复执行，不覆盖已有开发数据。
- Playwright webServer 命令已改为 Windows/Linux 通用形式。
- CI 已安装 Chromium，并串行执行认证、Landing 与 API 核心 smoke E2E。
- Footer 死链接已移除，新增 `/about`；CSV 导入加载态已核实存在。
- Docker Compose 顶层废弃 `version` 字段已移除。

## P0：现代化完整 E2E 套件

目标：`npm run test:e2e` 的全部 99 条用例通过，然后把 CI 从 `test:e2e:ci` 切回完整 `test:e2e`。

1. 抽取登录 fixture/storageState，禁止每条测试重复 UI 登录。
2. 更新 `e2e/campaigns.spec.ts`：当前页面没有旧版“列表/统计”切换和创建弹窗；按 `/campaigns` + `/campaigns/new` 真实流程重写。
3. 更新联系人、Dashboard 等测试，使用 `domcontentloaded` 和可观察 UI 状态，避免 `networkidle` 等待 SSE。
4. 所有创建型测试使用唯一数据，并在测试后清理；不得依赖上次运行残留。
5. 将 Playwright 并发固定为可控值，验证本地与 GitHub Actions 均稳定。

验收：连续运行两次 `npm run test:e2e` 均全绿，第二次不能因唯一键冲突失败。

## P1：核心产品缺口

1. **Campaign 编辑模式**：实现 `/campaigns/new?edit=<id>` 数据加载、Zustand hydration、PATCH 保存；仅允许编辑 DRAFT/PAUSED，RUNNING 需明确限制。
2. **Webhook 投递历史**：Settings 展示最近 `WebhookDelivery`，包含状态码、尝试次数、时间和错误摘要。
3. **Demo 预约后台**：新增受权限保护的 `/dashboard/demo-leads`，支持列表、状态和跟进备注。
4. **移动端**：Pipeline Kanban 横向滚动提示、联系人详情抽屉全屏、Developers 文档移动端可读性。

验收：每项包含 API 权限/tenant 过滤、页面空态/错误态、至少一条 API 或 E2E 测试。

## P2：可靠性与商业化

1. 公海客户 N 天未跟进自动回收，业务逻辑放 `src/lib/cron-jobs/`，Cron route 只入队。
2. Stripe `customer.subscription.updated` 的 `past_due`、`unpaid`、恢复支付状态处理及 webhook 幂等测试。
3. TOTP secret 使用现有 AES-256-GCM 加密层存储，并兼容历史明文迁移。
4. API Key permissions 服务端细粒度 enforcement、按 Key 独立限流、OpenAPI 补齐 `/api/v1`。
5. SMTP 连接池先做压测与连接生命周期设计，再决定是否启用；不得跨 Serverless 请求保存进程级 transporter。

## P3：外部依赖任务

1. 企业 SSO/OIDC：先确定身份提供商、租户域名发现和账号绑定规则。
2. 生产部署：配置 Vercel Web、Redis、PG pooler、Blob 和三个独立 Worker。
3. 生产监控：Worker `/health`、队列积压、Cron 成功率、邮件 bounce、Stripe webhook 告警。

## 每批强制验证

```bash
npx tsc --noEmit
npm test -- --runInBand
npm run build
npm run test:e2e:ci
```

涉及完整浏览器流程时额外执行 `npm run test:e2e`。完成后更新 `docs/audit-report.md`，记录真实测试数量与未完成项，不沿用旧数字。

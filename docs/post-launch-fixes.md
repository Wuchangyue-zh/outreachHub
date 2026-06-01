# Post-Launch Fixes 实施计划

> 基于 CLAUDE.md 架构规则全量代码审查，2026-06-01

---

## P0 — 多租户隔离（数据安全） ✅ 已完成

**问题**: `EmailLog` 和 `CampaignContact` 没有 `tenantId` 字段，需要通过关联关系做租户过滤。大量路由在先查后改的模式中，update/delete 只用 `{ id }` 而未带 `tenantId`。

**修复方案：** ContactEmail / EmailLog / CampaignContact 统一使用关系过滤：
- `{ contact: { id, tenantId } }` — 按联系人租户过滤
- `{ campaign: { id, tenantId } }` — 按活动租户过滤

**已修复 12 个文件，25+ 个查询。详见 audit-report.md §9.42。**

### 1. EmailLog / CampaignContact 读查询 — 关系过滤

| # | 文件 | 行 | 操作 | 修复方式 |
|---|------|-----|------|----------|
| 1 | `contacts/[id]/timeline/route.ts` | 44 | emailLog.findMany | 改为 `{ contact: { id, tenantId } }` |
| 2 | `contacts/[id]/export/route.ts` | 39, 59 | emailLog.findMany, campaignContact.findMany | 同上 |
| 3 | `contacts/[id]/360/route.ts` | 38, 45 | emailLog.findMany, campaignContact.findMany | 同上 |
| 4 | `campaigns/[id]/launch/route.ts` | 178, 205, 314, 409 | emailLog.findMany ×4 | 改为 `{ campaign: { id, tenantId } }` |

### 2. Cascade delete — 关系过滤

| # | 文件 | 行 | 操作 | 修复方式 |
|---|------|-----|------|----------|
| 5 | `contacts/[id]/route.ts` DELETE | 126-128 | deleteMany ×3 | emailLog/campaignContact 用关系过滤，contactEmail 加 tenantId |
| 6 | `campaigns/[id]/route.ts` DELETE | 147 | emailLog.deleteMany | 改为 `{ campaign: { id, tenantId } }` |
| 7 | `v1/contacts/[id]/route.ts` DELETE | 83, 131-133 | deleteMany ×3 + delete | 同 #5 |

### 3. Update/Delete where 子句加 tenantId

| # | 文件 | 行 | 操作 | 修复方式 |
|---|------|-----|------|----------|
| 8 | `contacts/[id]/claim/route.ts` | 41 | contact.update | `where: { id, tenantId }` |
| 9 | `contacts/[id]/release/route.ts` | 46 | contact.update | `where: { id, tenantId }` |
| 10 | `companies/[id]/route.ts` PUT | 51 | company.update | `where: { id, tenantId }` |
| 11 | `companies/[id]/route.ts` DELETE | 81, 90 | contact.count + company.delete | count 加 tenantId，delete 加 tenantId |
| 12 | `contacts/[id]/route.ts` PUT | 89 | contactEmail deleteMany | 加 tenantId |
| 13 | `campaigns/[id]/launch/route.ts` | 98, 263, 365, 460 | campaign.update ×4 | `where: { id, tenantId }` |
| 14 | `campaigns/[id]/sequence/route.ts` | 201 | campaign.update | `where: { id, tenantId }` |
| 15 | `v1/contacts/[id]/route.ts` PUT | 67 | contact.update | `where: { id, tenantId }` |

**涉及约 25 个查询，12 个文件。**

---

## P1 — 邮件双通道

| # | 文件 | 行 | 问题 | 修复 |
|---|------|-----|------|------|
| 16 | `api/email/test/route.ts` | 2, 87-109 | 直接 import nodemailer 构造 transporter，绕过 sendPlatformMail/sendAccountMail | 删除 nodemailer import，platform fallback 改用 `sendPlatformMail()` |
| 17 | `lib/email-queue.ts` | 231-240 | sendEmailDirectly() 降级路径：有 campaignId 但无 emailAccountId 时静默走 platform SMTP | 加 `console.warn` + 尝试从 Campaign 解析 EmailAccount |

---

## P2 — 安全

| # | 文件 | 行 | 问题 | 修复 |
|---|------|-----|------|------|
| 18 | `lib/env.ts` | 65 | `getJwtSecret()` 返回 hardcoded `'dev-only-secret-not-for-production'`，违反「禁止加 hardcoded fallback」 | 非生产环境也要求 NEXTAUTH_SECRET，或启动时生成随机 ephemeral key |

---

## P3 — Campaign 联系人遗留

| # | 文件 | 行 | 问题 | 修复 |
|---|------|-----|------|------|
| 19 | `lib/campaign-completion.ts` | 37 | 死代码：select `contactIds: true` 但从未使用 | 删除 `contactIds: true` |
| 20 | `api/campaigns/[id]/route.ts` | 100 | PATCH 同时写 legacy `contactIds[]` 和新 CampaignContact 表 | 删除 `updateData.contactIds = body.contactIds`，只保留 `replaceCampaignContacts()` |
| 21 | `app/campaigns/page.tsx` | 390 | 读 `campaign.contactIds.length` 显示数量 | 改为 `campaign._count?.campaignContacts` 或 API 返回 count |

---

## P4 — 限流覆盖

以下 API 路由完全没有 rate limiting（已认证但无保护）：

**高优先级（写操作 / 敏感操作）**：
- `POST /api/campaigns` / `POST /api/campaigns/[id]/launch`
- `POST /api/contacts/import/confirm`
- `POST /api/inbox/reply` / `POST /api/inbox/ai-reply`
- `POST /api/billing/checkout`
- `POST /api/tenant/invite`
- `POST /api/ai/generate`

**中优先级（读操作）**：
- `GET /api/campaigns` / `GET /api/contacts/[id]`
- `GET /api/stats` / `GET /api/tasks`
- `GET /api/companies` / `GET /api/templates`

**修复方式**：在每个 route handler 开头添加 `const limiter = rateLimit({ interval: 60000, uniqueTokenPerInterval: 100 })` + `await limiter.check(req, N)`。写操作 N=10，读操作 N=30。

---

## 执行顺序

```
Phase A (P0): 多租户隔离修复 → 15 项 ✅ 完成
Phase B (P1): 邮件双通道 → 2 项 ✅
Phase C (P2+P3): JWT secret + Campaign 遗留 → 4 项 ✅
Phase D (P4): 限流覆盖 → 按优先级分批 ✅
Phase E: 前端补全 → 见 docs/frontend-gaps.md（D1/D7 ✅，下一步 D3/D5）
```

每 Phase 完成后：`npx tsc --noEmit` → `npm test` → `npm run build`

---

*本计划最后更新：2026-06-01。Phase A 已完成，共 21 项修复 + 限流覆盖 + 前端补全。*

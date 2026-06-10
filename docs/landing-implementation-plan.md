# OutreachHub 首页承诺 → 产品落地执行规划

> **目的**：首页（`src/lib/landing-data.ts`）描述的是**产品目标**，不是当前已实现能力。  
> **原则**：按 Batch 分批交付，每批可独立验收；Claude 执行时**必须先读本节 + `docs/audit-report.md` + `CLAUDE.md`**。  
> **基线**：Batch D–L 已完成「邮件营销 MVP 工程清单」；本规划从 **Batch M** 起补齐首页承诺。

---

## 一、差距总览（首页区块 → 实现状态）

| 首页区块 | 核心承诺 | 当前状态 | 目标 Batch |
|----------|----------|----------|------------|
| Hero | 9 亿联系人 + 60 亿海关 + 全流程自动化 | 仅 RocketReach 部分接入 | M + N |
| Solutions Tab1 | 海关数据获客、采购意向评分、竞争情报 | ❌ 无 | **N** |
| Solutions Tab2 | AI 邮件、智能调度、域名预热、A/B | ⚠️ 部分（AI/Warm-up/A/B 有） | **O** |
| Solutions Tab3 | 可视化序列、行为触发、条件分支 | ⚠️ 后端 SEQUENCE 有，无可视化编辑器 | **O** |
| Solutions Tab4 | 全链路 CRM、销售漏斗、公海/私海 | ⚠️ 联系人/任务有，无漏斗 | **P** |
| Features ×8 | 拓客/验证/多语言/AB/追踪/健康/轮换/看板 | ⚠️ 各块不完整 | **M + O + Q** |
| How It Works | 定义 ICP → 多源验证 → 自动化营销 | ⚠️ 缺统一向导 | **M + O** |
| Pricing | 14 天试用、¥599 专业版、企业版 | ❌ 无支付 | **R** |
| FAQ / Security | GDPR、12 语言、2FA/SSO、SOC2 | ⚠️ 部分合规；认证需长期项目 | **R + S** |
| Knowledge | 知识库文章可阅读 | ❌ 仅卡片无页面 | **T** |
| Case Studies | 行业案例叙事 | 营销文案；产品需支撑所述工作流 | N + O + P |

**图例**：✅ 可对外说已实现 · ⚠️ 有雏形 · ❌ 未开始

---

## 二、外部依赖（执行前必须决策）

| 能力 | 推荐供应商 | 环境变量 | 备注 |
|------|------------|----------|------|
| 联系人搜索（已有） | RocketReach | `ROCKETREACH_API_KEY` | 已集成 |
| 联系人搜索（新增） | Apollo.io | `APOLLO_API_KEY` | Batch M1 |
| 邮箱查找 | Hunter.io | `HUNTER_API_KEY` | Batch M2 |
| 邮箱验证 | MillionVerifier | `MILLION_VERIFIER_API_KEY` | 已有 stub |
| 海关数据 | **待选型**（见下） | `CUSTOMS_API_*` | Batch N 阻塞项 |
| 支付 | Stripe | `STRIPE_*` | Batch R |
| 预约演示 | Cal.com 或自建表单 | `CALCOM_URL` | Batch T |

### 海关数据源选型（Batch N 前置决策）

首页「60 亿+海关记录」通常来自 **第三方 B2B 数据平台**，不是自建爬虫。可选：

1. **ImportGenius / Panjiva / 通海关** 等 API（按查询计费）
2. **自建索引**（成本极高，不推荐首期）
3. **阶段性方案**：先接 **1 家海关 API** + UI 与数据模型对齐首页；文案中「60 亿+」注明为**合作数据源规模**（与 vendor 一致）

> Claude 执行 Batch N 前：在 `.env.example` 增加 `CUSTOMS_PROVIDER` + 对应 Key，并在 Settings 增加「数据源配置」说明页。

---

## 三、Batch 执行顺序（依赖关系）

```
M（多数据源拓客 + 邮箱验证强化）
  ↓
N（海关数据模块）          O（序列可视化 + 智能调度）  ← 可并行
  ↓                           ↓
P（CRM 漏斗 + 公海/私海） ←───┘
  ↓
Q（多语言 + 高级分析 + 送达率看板）
  ↓
R（Stripe 订阅 + 14 天试用）
  ↓
S（安全：2FA / 审计日志 / 法律页）     T（知识库 + API 文档 + 预约演示）  ← 可并行
  ↓
U（开放 API + 对外集成）
```

**建议 Claude 严格按 M → N → O → P → Q → R → S/T → U 顺序**；N 与 O 可并行需不同 worktree。

---

## 四、Batch M — 多数据源拓客 + 邮箱验证（首页：7 大数据源 / 98.5% 验证）

> **对齐首页**：How It Works 步骤 2、Features「邮箱验证与清洗」、Solutions 决策人联系方式

### M1 — 数据 Provider 抽象层

| 步骤 | 任务 | 关键文件 | 验收 |
|------|------|----------|------|
| M1a | 新建 `lib/data-providers/types.ts`：`SearchPeopleInput`、`EnrichedContact` 统一结构 | `lib/data-providers/` | 类型可被 RR/Apollo 共用 |
| M1b | 重构 RocketReach → `RocketReachProvider implements DataProvider` | `lib/rocketreach.ts`, `lib/data-providers/rocketreach.ts` | 现有 prospecting 行为不变 |
| M1c | 新增 Apollo.io Provider：search people / enrich by email | `lib/data-providers/apollo.ts` | 单测 mock Apollo 响应 |
| M1d | `POST /api/prospecting/search` 支持 `sources: ['rocketreach','apollo']` 多源并行 | `api/prospecting/route.ts` | 返回带来源标签的结果 |
| M1e | 多源去重：同 email 合并，保留多 source 元数据 | `lib/contact-dedup.ts` | 导入不重复创建 ContactEmail |

### M2 — Hunter 域名邮箱 + 格式推测

| 步骤 | 任务 | 关键文件 | 验收 |
|------|------|----------|------|
| M2a | `lib/email-guess.ts`：firstname/lastname/domain → 常见 pattern 列表 | 新建 | ≥6 种 pattern |
| M2b | Hunter.io domain search API | `lib/data-providers/hunter.ts` | domain → emails[] |
| M2c | MX 记录校验（`dns.resolveMx`） | `lib/email-guess.ts` | 无 MX 的 domain 标记 invalid |
| M2d | UI：Company 详情页「查找邮箱」按钮 | `companies/page.tsx` | 展示猜测 + Hunter 结果 |

### M3 — 邮箱验证流水线（98.5% 目标 = 多层级验证）

| 步骤 | 任务 | 关键文件 | 验收 |
|------|------|----------|------|
| M3a | 验证管道：格式 → MX → MillionVerifier → 结果枚举 | `lib/email-verify-pipeline.ts` | 单测 4 层 |
| M3b | 批量验证 API：`POST /api/contacts/verify-batch` | 新建 route | 异步 job 或同步 ≤100 |
| M3c | 联系人列表「验证邮箱」批量操作 + 状态徽章 | `contacts/page.tsx` | verified / invalid / catch-all |
| M3d | 导入 CSV 后自动触发验证（可选 toggle） | `import/confirm/route.ts` | Settings 可开关 |
| M3e | Dashboard 展示验证率统计 | `api/stats/route.ts` | 与首页 98.5% 文案一致为**租户真实比率** |

### M4 — 拓客页升级（9 大渠道 → 首期 3 源可勾选）

| 步骤 | 任务 | 关键文件 | 验收 |
|------|------|----------|------|
| M4a | Prospecting 页：数据源多选（RR / Apollo / Hunter） | `prospecting/page.tsx` | 未配置 Key 的源灰显 + 说明 |
| M4b | AI 拓词/职位建议保留，结果可一键导入 | 已有 + 接线确认 | E2E 1 条 |
| M4c | Settings「数据源」Tab：各 API Key 状态（ masked ） | `dashboard/settings/page.tsx` | 只读展示 env 是否配置 |

**Batch M 验证**：`npm test` + `npm run build` + prospecting E2E；`.env.example` 更新。

---

## 五、Batch N — 海关数据获客（首页 Solutions Tab1 + Hero Workflow「Prospect」）

> **阻塞**：需确定 `CUSTOMS_PROVIDER`；无 Key 时 UI 显示「联系管理员配置」。

### N1 — 数据模型

| 步骤 | 任务 | 关键文件 | 验收 |
|------|------|----------|------|
| N1a | `CustomsShipment`：importer, exporter, hsCode, country, date, amount, ... | `schema.prisma` | `db:push` |
| N1b | `CustomsBuyerProfile`：domain, score, lastShipmentDate, supplierCount | 同上 | 与 Company 可选关联 |
| N1c | `CustomsSearch` 搜索历史（类似 SearchHistory） | 同上 | tenant 隔离 |

### N2 — Provider + API

| 步骤 | 任务 | 关键文件 | 验收 |
|------|------|----------|------|
| N2a | `lib/data-providers/customs/` 适配器接口 + 首个实现 | 新建 | mock provider 单测 |
| N2b | `GET /api/customs/search?hsCode&country&keyword` | 新建 route | 分页 + tenant 限流 |
| N2c | `GET /api/customs/buyers/[id]` 详情 + 供应商列表 | 新建 | 竞争情报原始数据 |
| N2d | `POST /api/customs/import-to-campaign` 选中买家 → Company/Contact | 新建 | 与现有 import 复用 dedup |

### N3 — AI 采购意向评分

| 步骤 | 任务 | 关键文件 | 验收 |
|------|------|----------|------|
| N3a | `lib/customs-scoring.ts`：频次、金额趋势、供应商分散度 → 0–100 分 | 新建 | 单测 ≥8 条 |
| N3b | Cron 或 on-import 计算 score 写入 `CustomsBuyerProfile` | cron 或 inline | 列表可排序 |
| N3c | AI 摘要：为何是高意向买家（1 段中文） | `openai.ts` | 可选开关 |

### N4 — 前端

| 步骤 | 任务 | 关键文件 | 验收 |
|------|------|----------|------|
| N4a | 新路由 `/customs` 或 Prospecting Tab「海关数据」 | 新 page | HS 编码 + 国家 + 关键词 |
| N4b | 买家列表：score、最近采购、一键导入联系人 | 同上 | 与 Campaign 向导跳转 |
| N4c | 竞争情报侧栏：主要供应商、切换信号 | 同上 | 案例页工作流可演示 |
| N4d | Dashboard 卡片：海关导入数 / 高意向买家数 | `dashboard/page.tsx` | 真实数据 |

**Batch N 验证**：海关搜索 → 评分 → 导入 → Campaign Launch 全链路手动走通。

---

## 六、Batch O — 自动化序列 + 智能邮件（Solutions Tab2/3 + Features）

### O1 — 可视化序列编辑器

| 步骤 | 任务 | 关键文件 | 验收 |
|------|------|----------|------|
| O1a | Campaign `sequenceSteps` JSON schema 文档化 | `docs/architecture.md` | 与 advance-sequences 一致 |
| O1b | 引入 `@xyflow/react` 或类似：节点类型 Email / Wait / Condition | `components/sequence-builder/` | 拖拽保存 |
| O1c | 条件节点：opened / clicked / replied / not_opened | 同上 | 编译为现有 cron 可执行结构 |
| O1d | `/campaigns/new` SEQUENCE 类型嵌入编辑器 | `campaigns/new/page.tsx` | 替代纯表单 |
| O1e | `GET/PUT /api/campaigns/[id]/sequence` 专用端点 | 新建 | 版本校验 |

### O2 — 行为触发与智能间隔

| 步骤 | 任务 | 关键文件 | 验收 |
|------|------|----------|------|
| O2a | `advance-sequences.ts` 支持 condition 分支 | `lib/cron-jobs/advance-sequences.ts` | 单测 opened→跳步 |
| O2b | 智能间隔：Contact.timezone + industry 默认窗口 | `lib/send-scheduler.ts` | 与 sendingWindows 合并 |
| O2c | Launch 前冲突检测：同联系人多 Campaign | `launch/route.ts` | warnings[] |

### O3 — 送达率与 A/B 产品化

| 步骤 | 任务 | 关键文件 | 验收 |
|------|------|----------|------|
| O3a | Campaign 向导 A/B 步骤 UI 完善（主题+正文+样本比例） | `campaigns/new` | 已有字段全暴露 |
| O3b | `/deliverability` 页：域名 DNS 状态 + Warm-up 进度 + bounce 率 | 新 page | 聚合 EmailAccount + dns-verify |
| O3c | 多邮箱轮换可视化：今日配额 per account | Settings + 新组件 | 对齐 Features「5 倍发送量」 |

**Batch O 验证**：创建 3 步序列（含 opened 分支）→ Launch → 模拟 open → Cron 推进下一步。

---

## 七、Batch P — 全链路 CRM（Solutions Tab4 + Hero「Win」）

### P1 — 销售漏斗

| 步骤 | 任务 | 关键文件 | 验收 |
|------|------|----------|------|
| P1a | `Deal` model：stage, amount, currency, expectedClose, contactId, companyId | `schema.prisma` | stages 枚举 |
| P1b | 默认阶段：线索 → 商机 → 报价 → 成交 / 流失 | seed 或 migration | 可配置 |
| P1c | `GET/POST/PATCH /api/deals` + 漏斗统计 | 新建 routes | conversion rate |
| P1d | `/dashboard/pipeline` 看板（Kanban 拖拽） | 新 page | 拖 card 改 stage |

### P2 — 公海 / 私海

| 步骤 | 任务 | 关键文件 | 验收 |
|------|------|----------|------|
| P2a | Contact.ownerId + pool: `PRIVATE` / `PUBLIC` | schema | 租户内可见性 |
| P2b | 领取 / 释放 API | `api/contacts/[id]/claim` | 权限 contacts:manage |
| P2c | 公海列表 + 自动回收规则（N 天未跟进） | Cron + UI | Settings 可配天数 |

### P3 — 360° 客户视图

| 步骤 | 任务 | 关键文件 | 验收 |
|------|------|----------|------|
| P3a | Contact 详情聚合：邮件 + Campaign + 海关 + Deal + Task | `api/contacts/[id]/360` | 单次请求 |
| P3b | 联系人抽屉升级 Tabs：时间线 / 海关 / 商机 | `contacts/page.tsx` | 案例页场景可演示 |
| P3c | 团队绩效：按用户 sent/opened/replied/deals won | `api/stats/team` | Dashboard 表格 |

### P4 — 自动化提醒

| 步骤 | 任务 | 关键文件 | 验收 |
|------|------|----------|------|
| P4a | Task 类型扩展：跟进 / 报价到期 / 自定义 | schema + tasks API | 与 Contact 关联 |
| P4b | Cron 扫描到期 Task → 邮件/站内通知 | `cron-jobs/task-reminders.ts` | Worker 可跑 |
| P4c | Dashboard「今日待办」组件 | `dashboard/page.tsx` | 点击跳转 Contact |

**Batch P 验证**：公海领取 → 跟进 → 建 Deal → 拖入成交；漏斗转化率与 stats 一致。

---

## 八、Batch Q — 多语言 + 高级分析（Features + FAQ）

### Q1 — 12 语言邮件

| 步骤 | 任务 | 关键文件 | 验收 |
|------|------|----------|------|
| Q1a | `lib/i18n/languages.ts` 枚举 12 语言 + locale 名 | 新建 | 与 FAQ 列表一致 |
| Q1b | Campaign / Template 创建必选「目标语言」 | 向导 UI | 传入 generateCampaignEmail |
| Q1c | `translateEmail` 批量：模板库「翻译到…」 | `templates/page.tsx` | 12 语言下拉 |
| Q1d | 退订页 + 系统邮件按 tenant.language（已有 K6） | 确认覆盖 | en/zh + 10 语言 stub |

### Q2 — 数据看板与报表

| 步骤 | 任务 | 关键文件 | 验收 |
|------|------|----------|------|
| Q2a | `/reports` 页：团队 / Campaign / 渠道 维度 | 新 page | 导出 CSV |
| Q2b | 地理分析地图（Recharts 或 MapLibre choropleth） | `CampaignStats` 升级 | 国家级 + 城市 Top N |
| Q2c | 首页 Hero mock 数据 → 登录后 Dashboard 用**真实租户数据** | `dashboard/page.tsx` | 不再写死 1247 封 |
| Q2d | SSE stats 推送 Dashboard 卡片 | 已有 sse/stats | 5 分钟刷新 |

**Batch Q 验证**：德语 Campaign 生成 + 发送；Reports 导出与 stats API 一致。

---

## 九、Batch R — 商业化（Pricing + FAQ 试用/退款）

### R1 — Stripe 订阅

| 步骤 | 任务 | 关键文件 | 验收 |
|------|------|----------|------|
| R1a | 安装 `stripe`；Checkout Session API | `api/billing/checkout/route.ts` | 测试模式 |
| R1b | Webhook：`checkout.session.completed` → 更新 Tenant.plan | `api/billing/webhook/route.ts` | 签名验证 |
| R1c | Customer Portal（管理订阅） | `api/billing/portal/route.ts` | Settings 入口 |
| R1d | Pricing 页 CTA → Checkout（专业版/企业联系销售表单） | `landing/Pricing.tsx` + `/pricing` | 注册后也可升级 |

### R2 — 14 天试用

| 步骤 | 任务 | 关键文件 | 验收 |
|------|------|----------|------|
| R2a | Tenant.trialStartedAt / trialEndsAt；注册时写入 | `register/route.ts` | 14 天 |
| R2b | 试用期满 middleware：限制 Launch / 导入 | `middleware.ts` 或 API guard | 403 + 升级提示 |
| R2c | 试用倒计时 Banner | Dashboard layout | 剩余天数 |
| R2d | plan-limits 与 Pricing 文案对齐（100 封/天等） | `plan-limits.ts` + landing-data | 文档一致 |

### R3 — 退款与发票

| 步骤 | 任务 | 关键文件 | 验收 |
|------|------|----------|------|
| R3a | Stripe refund API 管理端或 support 脚本 | `scripts/refund.ts` | 内部使用 |
| R3b | FAQ 退款政策 → Settings「账单历史」 | UI 只读 | 链接 Stripe invoice |

**Batch R 验证**：测试卡订阅 → 升级 PRO → 限额变化 → 取消订阅。

---

## 十、Batch S — 安全与合规（Security + FAQ）

> **说明**：SOC 2 / ISO 27001 为**认证流程**（数月 + 审计费），代码层做「可审计基础」；首页认证 badge 在 **S5 完成外部审计前**应加「进行中」或移除。

### S1 — 账户安全

| 步骤 | 任务 | 关键文件 | 验收 |
|------|------|----------|------|
| S1a | TOTP 2FA：启用/禁用/备用码 | `api/auth/2fa/*` | Settings 安全 Tab |
| S1b | 登录 flow 支持 2FA 第二步 | `login/page.tsx` | E2E |
| S1c | 会话列表 + 撤销（可选） | UserSession model | 安全 Tab |

### S2 — 审计与权限

| 步骤 | 任务 | 关键文件 | 验收 |
|------|------|----------|------|
| S2a | `AuditLog`：userId, action, resource, ip, meta | schema + middleware helper | 写操作记录 |
| S2b | Admin 查看审计日志 | `/dashboard/audit` | 分页 |
| S2c | 公海/Deal 权限矩阵扩展 | `auth-middleware.ts` | 与 #48 一致 |

### S3 — 法律与隐私

| 步骤 | 任务 | 关键文件 | 验收 |
|------|------|----------|------|
| S3a | `/terms` `/privacy` 静态页（MDX） | `app/terms`, `app/privacy` | Footer 链接有效 |
| S3b | 注册勾选同意记录 consentAt | User 或 Tenant | GDPR |
| S3c | 数据导出扩展：Tenant 级全量导出 | `api/tenant/export` | 管理员 |

### S4 — SSO（企业版）

| 步骤 | 任务 | 关键文件 | 验收 |
|------|------|----------|------|
| S4a | SAML 或 OIDC（NextAuth 扩展） | 视选型 | ENTERPRISE plan gating |
| S4b | 文档：企业 IdP 配置步骤 | `docs/sso-setup.md` | 交付企业客户 |

**Batch S 验证**：2FA 登录；AuditLog 有 Launch/Delete；法律页可访问。

---

## 十一、Batch T — 内容与增长（Knowledge + CTA + 演示）

### T1 — 知识库

| 步骤 | 任务 | 关键文件 | 验收 |
|------|------|----------|------|
| T1a | MDX 内容目录 `content/knowledge/*.mdx` | 3 篇与 landing-data slug 一致 | 可读 |
| T1b | `/knowledge/[slug]` 动态路由 | `app/knowledge/` | SEO metadata |
| T1c | 首页 Knowledge 卡片链到真实文章 | `landing` 组件 | 点击可读 |

### T2 — 演示预约 + 帮助

| 步骤 | 任务 | 关键文件 | 验收 |
|------|------|----------|------|
| T2a | `/demo` 表单 → 邮件通知销售或写 Lead 表 | 新 model `DemoRequest` | 提交成功页 |
| T2b | Hero「预约产品演示」→ `/demo` | `Hero.tsx` | 不再空链接 |
| T2c | `/help` FAQ 与 landing faqData 同步 | 单数据源 | 减少重复 |

### T3 — API 文档

| 步骤 | 任务 | 关键文件 | 验收 |
|------|------|----------|------|
| T3a | OpenAPI 3.0 spec 生成（主要 REST routes） | `docs/openapi.yaml` | 覆盖 contacts/campaigns |
| T3b | Swagger UI `/developers` | 静态或 Redoc | PRO 计划 gating |

**Batch T 验证**：3 篇文章可分享；demo 表单入库；OpenAPI 可 Try it out（本地）。

---

## 十二、Batch U — 开放 API 与集成（Pricing「API 接口访问」）

| 步骤 | 任务 | 关键文件 | 验收 |
|------|------|----------|------|
| U1 | `ApiKey` model + `Authorization: Bearer oh_xxx` | schema + middleware | 租户隔离 |
| U2 | 公开 API v1：`/api/v1/contacts` CRUD | 版本路由 | 限流 |
| U3 | Webhook：Campaign completed / reply received | `WebhookEndpoint` model | 重试 |
| U4 | Settings API Keys 管理 UI | settings | 创建/吊销 |

**Batch U 验证**：用 API Key 创建联系人；Webhook 收到 test payload。

---

## 十三、每 Batch Claude 执行模板

```markdown
## Batch X 执行指令（复制给 Claude）

1. 阅读 `docs/landing-implementation-plan.md` Batch X 全节
2. 阅读 `docs/audit-report.md` 最新 §9 记录
3. 执行本 Batch 所有步骤表（按 a→b→c 顺序）
4. 更新 `.env.example`、必要时 `CLAUDE.md`
5. 验收：`npm run db:push`（若改 schema）→ `npm test` → `npm run build`
6. 新增/更新 E2E：至少覆盖本 Batch 核心路径
7. 在 `audit-report.md` 新增 §9.xx Batch X 完成记录 + 核实修复节
8. 输出：变更摘要、未完成项、下一 Batch 前置条件
```

---

## 十四、里程碑与首页诚实度

| 里程碑 | 完成 Batch | 首页可对外说法 |
|--------|------------|----------------|
| **Alpha** | M + O 部分 | 「邮件自动化 + 多源拓客 + 邮箱验证」 |
| **Beta** | M + N + O + P | 「+ 海关数据 + 可视化序列 + CRM 漏斗」 |
| **GA 付费** | + Q + R | 「完整定价 + 14 天试用 + 多语言」 |
| **Enterprise** | + S + U | 「2FA/SSO/API + 企业安全」 |
| **内容与信任** | + T | 知识库 + 演示 + 开发者文档 |

**Case Studies / 2,800+ 企业 / SOC2 badge**：仅在**有真实客户与认证**后恢复；或改为「目标案例（演示环境）」并标注。

---

## 十五、工作量粗估（供排期）

| Batch | 复杂度 | 预估（1 全职 dev + Claude） |
|-------|--------|----------------------------|
| M | 高 | 2–3 周 |
| N | 很高（依赖海关 vendor） | 3–4 周 |
| O | 高 | 2–3 周 |
| P | 高 | 2–3 周 |
| Q | 中 | 1–2 周 |
| R | 中 | 1–2 周 |
| S | 中高 | 2–3 周 |
| T | 低 | 1 周 |
| U | 中 | 1–2 周 |

**合计约 15–22 周** 达到首页承诺的可演示、可收费状态（不含 SOC2 正式审计）。

---

## 十六、立即给 Claude 的第一条指令（Batch M）

```
执行 Batch M（多数据源拓客 + 邮箱验证强化）。
按 docs/landing-implementation-plan.md 第四节 M1→M4 逐步完成。
不要修改 landing-data 营销文案。
完成后写 audit-report §9.31，并列出 Batch N 前置：海关 API 选型建议。
```

---

*文档版本：2026-05-30 · 与首页 `landing-data.ts` 对齐*

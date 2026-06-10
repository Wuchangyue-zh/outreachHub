# Phase D — Frontend Gaps

> 基于 CLAUDE.md 全量审查，列出前端需要补全的功能缺口。本文件不包含后端修复。

---

## D1 — Campaign 列表：联系人数量显示依赖 legacy 字段 ✅

**文件:** `src/app/campaigns/page.tsx:390`

已修复：后端 `GET /api/campaigns` 返回 `_count: { campaignContacts }`，前端改为 `campaign._count?.campaignContacts ?? 0`。

---

## D2 — Deal 创建：联系人/公司选择器已有，但编辑时 label 需优化 ✅

**文件:** `src/app/dashboard/pipeline/page.tsx`

已修复：`GET /api/deals` 返回嵌套 `contact` / `company` 对象，但 Deal 接口缺少这两个字段。编辑弹窗 `initialLabel` 始终为空。

- Deal 接口增加 `contact?: { id; fullName }` / `company?: { id; name }` 可选字段
- `openEditDialog` 改为 `deal.contactName || deal.contact?.fullName || ''`
- Kanban 卡片同样增加嵌套 fallback

---

## D3 — 联系人详情页：Timeline / 360 / Export 无加载错误提示 ✅

**文件:** `src/app/contacts/page.tsx`（detail drawer）

已修复：
- `openDetailDrawer` catch 块添加 `addToast({ type: 'error', title: '加载失败' })`
- API 返回失败时清空对应状态（timeline/deals/tasks），避免残留旧数据
- 空状态文案已有：「暂无邮件互动记录」「暂无商机记录」「暂无关联任务」

---

## D4 — 联系人导入：无进度指示

**文件:** `src/components/CSVImport.tsx`

CSV 导入是同步 API 调用，大文件（1000+ 行）时前端无加载指示。用户可能重复点击。

**修复方向：**
- 提交时禁用按钮 + 显示 loading spinner
- 添加 `导入中...` 状态文案

---

## D5 — 通用：大量路由无前端错误处理 ✅

已修复：

| 页面 | 修复内容 |
|------|----------|
| `companies/page.tsx` | `fetchCompanies` catch 添加 `addToast` |
| `templates/page.tsx` | `fetchTemplates` catch 添加 `addToast` |
| `dashboard/settings/page.tsx` | 已使用 sonner `toast.error`，无需修改 |
| `prospecting/page.tsx` | `fetchTasks` catch 从 silent 改为 `setMessage`（与页面内联模式一致） |

---

## D6 — 移动端响应式

以下页面在窄屏下布局可能溢出：

| 页面 | 问题 |
|------|------|
| `pipeline/page.tsx` | Kanban 列在手机上需要横向滚动，但无触摸提示 |
| `contacts/page.tsx` | 详情 drawer 在窄屏下应全屏 |
| `developers/page.tsx` | Redoc iframe 在手机上可能太小 |

---

## D7 — Campaign 详情页 ✅

**文件:** `src/app/campaigns/[id]/page.tsx`

已实现：统计卡片、概览/发送日志/受众 Tab、暂停/恢复；列表页活动名链接至详情页。Campaign 向导编辑模式（`?edit=`）尚未实现。

---

## D8 — 营销静态页 / Footer 占位链接

**现状：** Footer「公司介绍 / 加入我们 / 合作伙伴 / 联系我们」及社交链接仍为 `#`。

**修复方向：**
- `/about`、`/careers`、`/partners` 静态页，或链到 `/demo`、`mailto:support@...`
- 不改 landing-data 营销文案，仅修正 `href`

---

## D9 — Webhook 投递历史 + Demo 预约后台（可选）

**现状：** `WebhookDelivery` / `DemoRequest` 有模型，Settings 无 delivery 列表，销售无 Demo 管理 UI。

**修复方向：**
- Settings API Keys Tab 下增加「最近 Webhook 投递」
- 可选：`/dashboard/demo-leads` 内部页

---

## 执行顺序

```
D1 ✅ → D7 ✅ → D3 ✅ → D5 ✅ → D2 ✅ → D4 → D8 → D6 → D9
```

D1/D7/D3/D5/D2 已完成，D4/D8/D6/D9 为优化项。

---

*本文件最后更新：2026-06-01。Phase E 第一批（D2/D3/D5）已完成。*

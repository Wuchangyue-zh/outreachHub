# Phase D — Frontend Gaps

> 基于 CLAUDE.md 全量审查，列出前端需要补全的功能缺口。本文件不包含后端修复。

---

## D1 — Campaign 列表：联系人数量显示依赖 legacy 字段

**文件:** `src/app/campaigns/page.tsx:390`

```tsx
{campaign.contactIds.length.toLocaleString()}
```

当前直接读 `campaign.contactIds[]` 数组长度显示受众数量。应改为从 API 获取 `campaignContactsCount`，或在列表 API 中用 `_count` 聚合。

**修复方向：**
- 后端 `GET /api/campaigns` 返回 `_count: { campaignContacts: number }`
- 前端改为 `campaign._count?.campaignContacts ?? 0`

---

## D2 — Deal 创建：联系人/公司选择器已有，但编辑时 label 需优化

**文件:** `src/app/dashboard/pipeline/page.tsx`

SearchableSelect 的 `initialLabel` 在编辑模式下依赖 Deal 列表返回的 `contactName` / `companyName`。如果列表 API 未返回这两个字段，编辑弹窗会显示空标签。

**验证：** 确认 `GET /api/deals` 的 `include` 中包含 `contact: { select: { fullName } }` 和 `company: { select: { name } }`。

---

## D3 — 联系人详情页：Timeline / 360 / Export 无加载错误提示

**文件:** `src/app/contacts/page.tsx`（detail drawer）

当 Timeline、360 或 Export API 返回错误时，前端静默失败（catch 块无 toast）。用户看到的是空白区域，不知道是加载失败还是真的没数据。

**修复方向：**
- 在各 fetch 的 catch 块中添加 `addToast({ type: 'error', ... })`
- 添加空状态文案（如「暂无互动记录」vs「加载失败，请重试」）

---

## D4 — 联系人导入：无进度指示

**文件:** `src/components/CSVImport.tsx`

CSV 导入是同步 API 调用，大文件（1000+ 行）时前端无加载指示。用户可能重复点击。

**修复方向：**
- 提交时禁用按钮 + 显示 loading spinner
- 添加 `导入中...` 状态文案

---

## D5 — 通用：大量路由无前端错误处理

以下页面的 API 调用 catch 块只 `console.error`，不通知用户：

| 页面 | 缺失 |
|------|------|
| `companies/page.tsx` | fetchCompanies catch |
| `templates/page.tsx` | fetchTemplates catch |
| `dashboard/settings/page.tsx` | 多个 fetch 无 toast |
| `prospecting/page.tsx` | fetchProspects catch |

**修复方向：** 统一使用 `addToast({ type: 'error', title: '加载失败', description: '...' })`。

---

## D6 — 移动端响应式

以下页面在窄屏下布局可能溢出：

| 页面 | 问题 |
|------|------|
| `pipeline/page.tsx` | Kanban 列在手机上需要横向滚动，但无触摸提示 |
| `contacts/page.tsx` | 详情 drawer 在窄屏下应全屏 |
| `developers/page.tsx` | Redoc iframe 在手机上可能太小 |

---

## 执行顺序

```
D1 → D3 → D5 → D2 → D4 → D6
```

D1 影响数据准确性，D3/D5 影响用户体验，其余为优化项。

---

*本文件最后更新：2026-06-01。*

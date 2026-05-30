/**
 * 邮件 HTML 后处理：将本地相对路径图片 URL 转为公网可访问 URL。
 *
 * 场景：邮件 HTML 中包含 `<img src="/uploads/attachments/xxx.png">` 等本地路径，
 * 收件方无法访问发件服务器的 localhost。此模块将其替换为 APP_URL 绝对地址。
 *
 * 架构规则：见 CLAUDE.md / docs/audit-report.md §十 H2
 */

import { resolvePublicUrl } from './storage'

/**
 * 将 HTML 中的相对路径 src 属性转为公网绝对 URL。
 * - `/uploads/...` → `APP_URL/uploads/...`
 * - 已是 `http(s)://` 开头 → 保持不变
 * - `data:` URI → 保持不变
 */
export function resolvePublicUrls(html: string): string {
  const appUrl = (process.env.APP_URL || '').replace(/\/$/, '')
  if (!appUrl) return html

  // 匹配 src="/..." 或 src='/...' 或 src="相对路径"
  return html.replace(
    /src=(["'])(?!https?:\/\/|data:|cid:)(\/?[^"']+)\1/gi,
    (match, quote, path) => {
      const resolved = resolvePublicUrl(path)
      return `src=${quote}${resolved}${quote}`
    }
  )
}

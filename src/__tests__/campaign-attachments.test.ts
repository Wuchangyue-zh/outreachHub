/**
 * H1f: Campaign 附件单元测试
 * 验证 Attachment 查询 + fetchFileBuffer 链路
 */

import { resolvePublicUrls } from '@/lib/email-html'
import { resolvePublicUrl } from '@/lib/storage'

describe('campaign attachments', () => {
  describe('resolvePublicUrl', () => {
    it('should return http URLs unchanged', () => {
      expect(resolvePublicUrl('https://cdn.example.com/file.png')).toBe('https://cdn.example.com/file.png')
      expect(resolvePublicUrl('http://localhost:3030/file.png')).toBe('http://localhost:3030/file.png')
    })

    it('should prepend APP_URL to relative paths', () => {
      const original = process.env.APP_URL
      process.env.APP_URL = 'https://app.example.com'
      expect(resolvePublicUrl('/uploads/attachments/test.png')).toBe('https://app.example.com/uploads/attachments/test.png')
      process.env.APP_URL = original
    })

    it('should return path unchanged when APP_URL is not set', () => {
      const original = process.env.APP_URL
      delete process.env.APP_URL
      expect(resolvePublicUrl('/uploads/attachments/test.png')).toBe('/uploads/attachments/test.png')
      process.env.APP_URL = original
    })
  })

  describe('resolvePublicUrls (HTML)', () => {
    it('should replace local src paths with APP_URL', () => {
      const original = process.env.APP_URL
      process.env.APP_URL = 'https://app.example.com'

      const html = '<img src="/uploads/attachments/photo.jpg"><img src="/uploads/avatars/user.png">'
      const result = resolvePublicUrls(html)
      expect(result).toContain('src="https://app.example.com/uploads/attachments/photo.jpg"')
      expect(result).toContain('src="https://app.example.com/uploads/avatars/user.png"')

      process.env.APP_URL = original
    })

    it('should not modify http(s) URLs', () => {
      const original = process.env.APP_URL
      process.env.APP_URL = 'https://app.example.com'

      const html = '<img src="https://cdn.example.com/img.png">'
      const result = resolvePublicUrls(html)
      expect(result).toBe(html)

      process.env.APP_URL = original
    })

    it('should not modify data: URIs', () => {
      const original = process.env.APP_URL
      process.env.APP_URL = 'https://app.example.com'

      const html = '<img src="data:image/png;base64,abc123">'
      const result = resolvePublicUrls(html)
      expect(result).toBe(html)

      process.env.APP_URL = original
    })

    it('should not modify cid: URIs', () => {
      const original = process.env.APP_URL
      process.env.APP_URL = 'https://app.example.com'

      const html = '<img src="cid:inline-image">'
      const result = resolvePublicUrls(html)
      expect(result).toBe(html)

      process.env.APP_URL = original
    })

    it('should return HTML unchanged when APP_URL is not set', () => {
      const original = process.env.APP_URL
      delete process.env.APP_URL

      const html = '<img src="/uploads/test.png">'
      expect(resolvePublicUrls(html)).toBe(html)

      process.env.APP_URL = original
    })
  })
})

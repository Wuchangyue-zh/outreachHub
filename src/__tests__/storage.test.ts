/**
 * 存储模块单元测试
 */

// Mock 环境变量
const originalEnv = process.env

beforeEach(() => {
  jest.resetModules()
  process.env = { ...originalEnv }
})

afterAll(() => {
  process.env = originalEnv
})

describe('storage', () => {
  describe('getStorageBackend', () => {
    it('should return blob when BLOB_READ_WRITE_TOKEN is set', () => {
      process.env.BLOB_READ_WRITE_TOKEN = 'test-token'
      const { getStorageBackend } = require('@/lib/env')
      expect(getStorageBackend()).toBe('blob')
    })

    it('should return s3 when S3 credentials are set', () => {
      delete process.env.BLOB_READ_WRITE_TOKEN
      process.env.S3_ACCESS_KEY = 'test-key'
      process.env.S3_SECRET_KEY = 'test-secret'
      process.env.S3_BUCKET = 'test-bucket'
      const { getStorageBackend } = require('@/lib/env')
      expect(getStorageBackend()).toBe('s3')
    })

    it('should return local when no remote storage is configured', () => {
      delete process.env.BLOB_READ_WRITE_TOKEN
      delete process.env.S3_ACCESS_KEY
      delete process.env.S3_SECRET_KEY
      delete process.env.S3_BUCKET
      const { getStorageBackend } = require('@/lib/env')
      expect(getStorageBackend()).toBe('local')
    })

    it('should prefer blob over s3 when both are set', () => {
      process.env.BLOB_READ_WRITE_TOKEN = 'test-token'
      process.env.S3_ACCESS_KEY = 'test-key'
      process.env.S3_SECRET_KEY = 'test-secret'
      process.env.S3_BUCKET = 'test-bucket'
      const { getStorageBackend } = require('@/lib/env')
      expect(getStorageBackend()).toBe('blob')
    })
  })

  describe('generateFilename', () => {
    it('should generate unique filenames with original extension', () => {
      const { generateFilename } = require('@/lib/storage')
      const name1 = generateFilename('test.pdf')
      const name2 = generateFilename('test.pdf')

      expect(name1).toMatch(/\.pdf$/)
      expect(name2).toMatch(/\.pdf$/)
      expect(name1).not.toBe(name2)
    })

    it('should preserve file extension', () => {
      const { generateFilename } = require('@/lib/storage')
      expect(generateFilename('image.png')).toMatch(/\.png$/)
      expect(generateFilename('doc.docx')).toMatch(/\.docx$/)
      expect(generateFilename('data.csv')).toMatch(/\.csv$/)
    })
  })

  describe('validateFile', () => {
    it('should accept valid file types', () => {
      const { validateFile } = require('@/lib/storage')
      expect(validateFile({ originalname: 'test.pdf', mimetype: 'application/pdf', size: 1000 })).toBeNull()
      expect(validateFile({ originalname: 'test.jpg', mimetype: 'image/jpeg', size: 1000 })).toBeNull()
      expect(validateFile({ originalname: 'test.png', mimetype: 'image/png', size: 1000 })).toBeNull()
      expect(validateFile({ originalname: 'test.csv', mimetype: 'text/csv', size: 1000 })).toBeNull()
      expect(validateFile({ originalname: 'test.txt', mimetype: 'text/plain', size: 1000 })).toBeNull()
    })

    it('should reject files over 10MB', () => {
      const { validateFile } = require('@/lib/storage')
      const largeSize = 11 * 1024 * 1024
      expect(validateFile({ originalname: 'big.pdf', mimetype: 'application/pdf', size: largeSize })).toBe('文件大小不能超过 10MB')
    })

    it('should reject unsupported file types', () => {
      const { validateFile } = require('@/lib/storage')
      expect(validateFile({ originalname: 'virus.exe', mimetype: 'application/x-msdownload', size: 1000 })).toBe('不支持的文件类型')
      expect(validateFile({ originalname: 'script.js', mimetype: 'application/javascript', size: 1000 })).toBe('不支持的文件类型')
    })

    it('should accept files within size limit', () => {
      const { validateFile } = require('@/lib/storage')
      const validSize = 5 * 1024 * 1024 // 5MB
      expect(validateFile({ originalname: 'ok.pdf', mimetype: 'application/pdf', size: validSize })).toBeNull()
    })
  })
})

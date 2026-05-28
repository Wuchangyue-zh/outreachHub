import { z } from 'zod'

// ==================== 认证相关 ====================

export const loginSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
  password: z.string().min(6, '密码至少6个字符'),
})

export const registerSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
  password: z.string().min(6, '密码至少6个字符'),
  name: z.string().min(1, '请输入姓名').optional(),
  company: z.string().optional(),
})

// ==================== 联系人相关 ====================

export const contactCreateSchema = z.object({
  firstName: z.string().min(1, '姓名为必填项'),
  lastName: z.string().optional(),
  title: z.string().optional(),
  department: z.string().optional(),
  company: z.string().optional(),
  emails: z.array(z.string().email('请输入有效的邮箱地址')).min(1, '至少需要一个邮箱'),
  phones: z.array(z.string()).optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
})

export const contactUpdateSchema = contactCreateSchema.partial().extend({
  status: z.enum(['NEW', 'CONTACTED', 'INTERESTED', 'NOT_INTERESTED', 'QUALIFIED', 'CONVERTED', 'UNREACHABLE']).optional(),
})

// ==================== 公司相关 ====================

export const companyCreateSchema = z.object({
  name: z.string().min(1, '公司名称为必填项'),
  domain: z.string().optional(),
  website: z.string().url('请输入有效的网站地址').optional().or(z.literal('')),
  industry: z.string().optional(),
  size: z.enum(['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+']).optional(),
  country: z.string().optional(),
  countryCode: z.string().optional(),
  city: z.string().optional(),
  region: z.string().optional(),
  linkedinUrl: z.string().url('请输入有效的LinkedIn链接').optional().or(z.literal('')),
  description: z.string().optional(),
})

// ==================== 邮件模板相关 ====================

export const templateCreateSchema = z.object({
  name: z.string().min(1, '模板名称为必填项'),
  subject: z.string().min(1, '邮件主题为必填项'),
  content: z.string().min(10, '邮件内容至少10个字符'),
  category: z.enum(['cold-outreach', 'follow-up', 'introduction', 'promotion', 'meeting-request']),
  language: z.enum(['en', 'zh', 'de', 'fr', 'es', 'ja', 'ko', 'pt', 'ru', 'ar']),
  variables: z.array(z.string()).optional(),
})

// ==================== 邮件营销活动相关 ====================

export const campaignCreateSchema = z.object({
  name: z.string().min(1, '活动名称为必填项'),
  subject: z.string().min(1, '邮件主题为必填项'),
  content: z.string().min(10, '邮件内容至少10个字符'),
  type: z.enum(['SINGLE', 'SEQUENCE', 'AB_TEST']),
  scheduleType: z.enum(['IMMEDIATE', 'SCHEDULED', 'RECURRING']),
  scheduledAt: z.string().optional(),
})

// ==================== 搜索相关 ====================

export const prospectingSearchSchema = z.object({
  keywords: z.array(z.string()).optional(),
  positions: z.array(z.string()).optional(),
  locations: z.array(z.string()).optional(),
  industries: z.array(z.string()).optional(),
  companySizes: z.array(z.string()).optional(),
})

// ==================== 邮箱验证相关 ====================

export const emailVerifySchema = z.object({
  emails: z.array(z.string().email()).min(1, '至少需要一个邮箱'),
})

// ==================== 工具函数 ====================

export function validateForm<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean
  data?: T
  errors?: Record<string, string>
} {
  const result = schema.safeParse(data)

  if (result.success) {
    return { success: true, data: result.data }
  }

  const errors: Record<string, string> = {}
  for (const issue of result.error.issues) {
    const path = issue.path.join('.')
    errors[path] = issue.message
  }

  return { success: false, errors }
}

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type ContactCreateInput = z.infer<typeof contactCreateSchema>
export type ContactUpdateInput = z.infer<typeof contactUpdateSchema>
export type CompanyCreateInput = z.infer<typeof companyCreateSchema>
export type TemplateCreateInput = z.infer<typeof templateCreateSchema>
export type CampaignCreateInput = z.infer<typeof campaignCreateSchema>
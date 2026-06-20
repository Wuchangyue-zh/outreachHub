'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { LANGUAGES } from '@/lib/i18n/languages'
import { useI18n } from '@/hooks/use-i18n'
import {
  Mail,
  Plus,
  TestTube,
  Trash2,
  RefreshCw, Clock, ChevronDown,
  CheckCircle,
  XCircle,
  Settings as SettingsIcon,
  Server,
  Shield,
  Pencil,
  AlertTriangle,
  Crown,
  Users,
  UserPlus,
  Copy,
  Globe,
  Check,
  CreditCard,
  ArrowUpRight,
  Building2,
  Lock,
  Smartphone,
  KeyRound,
  Eye,
  EyeOff,
  Monitor,
  Key,
  Webhook,
  Zap,
} from 'lucide-react'

const emptyFormData = {
  email: '',
  displayName: '',
  smtpHost: '',
  smtpPort: '587',
  smtpUser: '',
  smtpPassword: '',
  imapHost: '',
  imapPort: '993',
  imapUser: '',
  imapPassword: '',
  warmupEnabled: false,
  warmupTarget: '50',
}

// 常见邮箱服务商 IMAP 配置
const KNOWN_IMAP_HOSTS: Record<string, { host: string; port: number }> = {
  'smtp.gmail.com': { host: 'imap.gmail.com', port: 993 },
  'smtp.outlook.com': { host: 'outlook.office365.com', port: 993 },
  'smtp.office365.com': { host: 'outlook.office365.com', port: 993 },
  'smtp-mail.outlook.com': { host: 'outlook.office365.com', port: 993 },
  'smtp.qq.com': { host: 'imap.qq.com', port: 993 },
  'smtp.163.com': { host: 'imap.163.com', port: 993 },
  'smtp.126.com': { host: 'imap.126.com', port: 993 },
  'smtp.aliyun.com': { host: 'imap.aliyun.com', port: 993 },
  'smtp.sina.com': { host: 'imap.sina.com', port: 993 },
  'smtp.yahoo.com': { host: 'imap.mail.yahoo.com', port: 993 },
  'smtp.mail.yahoo.com': { host: 'imap.mail.yahoo.com', port: 993 },
  'smtp.zoho.com': { host: 'imap.zoho.com', port: 993 },
  'smtp.yandex.com': { host: 'imap.yandex.com', port: 993 },
  // D2: 企业邮箱 — imap.xxx DNS 不存在，必须用 mail.xxx
  'smtp.jafron.com': { host: 'mail.jafron.com', port: 993 },
}

// D2: 已知 imap. 前缀 DNS 不存在，应改用 mail. 的域
const IMAP_TO_MAIL_OVERRIDES: Record<string, string> = {
  'imap.jafron.com': 'mail.jafron.com',
}

// D2: 检测 imapHost 是否应改为 mail. 前缀
function suggestImapFix(imapHost: string, smtpHost: string): string | null {
  if (!imapHost) return null
  const lower = imapHost.toLowerCase().trim()

  // 精确匹配已知问题域
  if (IMAP_TO_MAIL_OVERRIDES[lower]) {
    return IMAP_TO_MAIL_OVERRIDES[lower]
  }

  // 通用规则：imap.xxx.com 且与 smtpHost 同域 → 建议 mail.xxx.com
  if (lower.startsWith('imap.')) {
    const imapDomain = lower.slice(5)
    const smtpLower = smtpHost.toLowerCase().trim()
    // 只有同域时才建议（避免误改第三方）
    if (smtpLower.endsWith(imapDomain)) {
      return `mail.${imapDomain}`
    }
  }

  return null
}

// 根据 SMTP 主机推断 IMAP 主机
function inferImapHost(smtpHost: string): { host: string; port: number } | null {
  if (!smtpHost) return null
  const lower = smtpHost.toLowerCase().trim()

  // 精确匹配已知服务商
  if (KNOWN_IMAP_HOSTS[lower]) {
    return KNOWN_IMAP_HOSTS[lower]
  }

  // 通用规则：smtp.xxx.com → mail.xxx.com
  if (lower.startsWith('smtp.')) {
    const domain = lower.slice(5)
    return { host: `mail.${domain}`, port: 993 }
  }

  return null
}

interface EmailAccount {
  id: string
  email: string
  displayName: string | null
  smtpHost: string
  smtpPort: number
  smtpUser: string
  smtpPassword: string
  imapHost: string | null
  imapPort: number | null
  imapUser: string | null
  imapPassword?: string | null
  isActive: boolean
  dailySent: number
  dailyLimit: number
  healthScore: number
  warmupEnabled?: boolean
  warmupDay?: number
  warmupTarget?: number
  imapLastError: string | null
  imapLastErrorAt: string | null
  createdAt: string
}

interface TenantUsage {
  tenant: { id: string; name: string; plan: string; expiresAt: string | null; createdAt: string; language?: string }
  limits: { maxContacts: number; maxUsers: number; maxEmailsPerDay: number }
  usage: {
    contactCount: number; userCount: number; emailsSentToday: number; campaignCount: number
    contactPercent: number; emailPercent: number; userPercent: number
  }
  members: Array<{ id: string; email: string; name: string | null; role: string; avatar: string | null; createdAt: string }>
  invitations: Array<{ id: string; email: string; role: string; createdAt: string; expiresAt: string }>
}

interface DataSourceProvider {
  name: string
  env: string
  desc: string
  docs: string
  configured: boolean
}

interface ApiKey {
  id: string
  name: string
  keyPrefix: string
  permissions: string[]
  rateLimit: number
  lastUsedAt: string | null
  status: 'active' | 'revoked'
  createdAt: string
}

interface WebhookEndpoint {
  id: string
  url: string
  events: string[]
  status: 'active' | 'inactive'
  lastTriggeredAt: string | null
  createdAt: string
}

const AVAILABLE_PERMISSIONS = [
  { id: 'contacts:read', label: '联系人 - 读取' },
  { id: 'contacts:write', label: '联系人 - 写入' },
  { id: 'campaigns:read', label: '活动 - 读取' },
  { id: 'campaigns:write', label: '活动 - 写入' },
]

const AVAILABLE_WEBHOOK_EVENTS = [
  { id: 'contact.created', label: '联系人创建' },
  { id: 'campaign.started', label: '活动启动' },
  { id: 'campaign.completed', label: '活动完成' },
  { id: 'reply.received', label: '收到回复' },
  { id: 'deal.won', label: '商机成交' },
  { id: 'deal.lost', label: '商机流失' },
]

const PLAN_LABELS: Record<string, string> = { FREE: '免费版', BASIC: '基础版', PRO: '专业版', ENTERPRISE: '企业版' }
const PLAN_COLORS: Record<string, string> = { FREE: 'bg-gray-100 text-gray-700', BASIC: 'bg-blue-100 text-blue-700', PRO: 'bg-purple-100 text-purple-700', ENTERPRISE: 'bg-amber-100 text-amber-700' }

export default function SettingsPage() {
  const { t } = useI18n()
  const [accounts, setAccounts] = useState<EmailAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [testEmail, setTestEmail] = useState('')
  const [formData, setFormData] = useState(emptyFormData)

  // #46: 租户套餐与用量
  const [tenantData, setTenantData] = useState<TenantUsage | null>(null)
  const [tenantLoading, setTenantLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  // K6: 租户语言
  const [tenantLanguage, setTenantLanguage] = useState('zh')
  const [savingLanguage, setSavingLanguage] = useState(false)

  // J1: DNS 记录
  const [dnsAccountId, setDnsAccountId] = useState<string | null>(null)
  const [dnsData, setDnsData] = useState<{ domain: string; records: Array<{ type: string; host: string; value: string; description: string; status: string }>; verification?: Array<{ record: string; found: boolean; valid: boolean; message: string }>; tips: string[] } | null>(null)
  const [dnsLoading, setDnsLoading] = useState(false)
  const [dataSources, setDataSources] = useState<DataSourceProvider[]>([])
  const [dataSourcesLoading, setDataSourcesLoading] = useState(false)

  // S1c: Security tab state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [twoFactorLoading, setTwoFactorLoading] = useState(true)
  const [twoFactorSetupStep, setTwoFactorSetupStep] = useState<'idle' | 'scan' | 'verify'>('idle')
  const [twoFactorQrCode, setTwoFactorQrCode] = useState('')
  const [twoFactorSecret, setTwoFactorSecret] = useState('')
  const [twoFactorCode, setTwoFactorCode] = useState('')
  const [twoFactorBackupCodes, setTwoFactorBackupCodes] = useState<string[]>([])
  const [twoFactorActionLoading, setTwoFactorActionLoading] = useState(false)
  const [twoFactorDisableCode, setTwoFactorDisableCode] = useState('')
  const [showDisable2fa, setShowDisable2fa] = useState(false)
  const [securityMessage, setSecurityMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Change password state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)

  // U4: API Keys state
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [loadingKeys, setLoadingKeys] = useState(true)
  const [showCreateKeyDialog, setShowCreateKeyDialog] = useState(false)
  const [newKeyForm, setNewKeyForm] = useState({ name: '', permissions: [] as string[], rateLimit: 100 })
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [creatingKey, setCreatingKey] = useState(false)

  // U4: Webhooks state
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>([])
  const [loadingWebhooks, setLoadingWebhooks] = useState(true)
  const [showCreateWebhookDialog, setShowCreateWebhookDialog] = useState(false)
  const [newWebhookForm, setNewWebhookForm] = useState({ url: '', events: [] as string[] })
  const [creatingWebhook, setCreatingWebhook] = useState(false)
  const [testingWebhookId, setTestingWebhookId] = useState<string | null>(null)
  const [createdWebhookSecret, setCreatedWebhookSecret] = useState<string | null>(null)
  const [showWebhookSecretDialog, setShowWebhookSecretDialog] = useState(false)

  // P1-2: Webhook delivery history
  const [deliveries, setDeliveries] = useState<any[]>([])
  const [loadingDeliveries, setLoadingDeliveries] = useState(false)
  const [deliveryFilter, setDeliveryFilter] = useState({ endpointId: "", status: "" })
  const [deliveryPage, setDeliveryPage] = useState(1)
  const [deliveryPagination, setDeliveryPagination] = useState({ total: 0, totalPages: 0 })
  const [expandedDelivery, setExpandedDelivery] = useState<string | null>(null)

  // 加载邮件账户列表
  const loadAccounts = async () => {
    try {
      const res = await fetch('/api/email-accounts')
      const data = await res.json()
      if (data.success) {
        setAccounts(data.data)
      }
    } catch (error) {
      toast.error(t('dashboardSettings.loadAccountsFailed'))
    } finally {
      setLoading(false)
    }
  }

  // #46: 加载租户用量
  const loadTenantUsage = async () => {
    try {
      const res = await fetch('/api/tenant/usage')
      const data = await res.json()
      if (data.success) {
        setTenantData(data.data)
        if (data.data.tenant.language) setTenantLanguage(data.data.tenant.language)
      }
      // Plan data loaded successfully
    } catch { /* silent */ } finally {
      setTenantLoading(false)
    }
  }

  // #47: 邀请成员
  const handleInvite = async () => {
    if (!inviteEmail.trim()) return
    setInviting(true)
    try {
      const res = await fetch('/api/tenant/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(t('dashboardSettings.inviteSent').replace('{email}', inviteEmail))
        setInviteEmail('')
        loadTenantUsage()
      } else {
        toast.error(data.error?.message || data.error || t('dashboardSettings.inviteFailed'))
      }
    } catch { toast.error(t('dashboardSettings.inviteFailed')) } finally { setInviting(false) }
  }

  // R2c: Stripe 客户门户
  const [portalLoading, setPortalLoading] = useState(false)
  const handleManageSubscription = async () => {
    setPortalLoading(true)
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' })
      const data = await res.json()
      if (data.success && data.data?.url) {
        window.location.href = data.data.url
      } else {
        toast.error(data.error?.message || t('dashboardSettings.portalFailed'))
      }
    } catch {
      toast.error(t('dashboardSettings.portalUnavailable'))
    } finally {
      setPortalLoading(false)
    }
  }

  // K6: 保存租户语言
  const handleSaveLanguage = async () => {
    setSavingLanguage(true)
    try {
      const res = await fetch('/api/tenant/usage', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: tenantLanguage }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(t('dashboardSettings.languageUpdated'))
        await loadTenantUsage()
      } else {
        toast.error(data.error?.message || t('dashboardSettings.saveFailed'))
      }
    } catch { toast.error(t('dashboardSettings.saveFailed')) } finally { setSavingLanguage(false) }
  }

  // H3d: 撤销邀请
  const handleRevokeInvite = async (inviteId: string) => {
    try {
      const res = await fetch(`/api/tenant/invite?id=${inviteId}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        toast.success(t('dashboardSettings.inviteRevoked'))
        loadTenantUsage()
      } else {
        toast.error(data.error?.message || t('dashboardSettings.revokeFailed'))
      }
    } catch { toast.error(t('dashboardSettings.revokeFailed')) }
  }

  // J1: 获取 DNS 记录
  const fetchDnsRecords = async (accountId: string) => {
    setDnsAccountId(accountId)
    setDnsLoading(true)
    setDnsData(null)
    try {
      const res = await fetch(`/api/email-accounts/${accountId}/dns-records`)
      const data = await res.json()
      if (data.success) setDnsData(data.data)
      else toast.error(data.error?.message || '获取 DNS 记录失败')
    } catch { toast.error('获取 DNS 记录失败') } finally { setDnsLoading(false) }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success('已复制到剪贴板'))
  }

  // U4: Fetch API Keys
  const fetchApiKeys = async () => {
    setLoadingKeys(true)
    try {
      const res = await fetch('/api/api-keys')
      const data = await res.json()
      if (data.success) setApiKeys(data.data)
    } catch {
      toast.error('加载 API Keys 失败')
    } finally {
      setLoadingKeys(false)
    }
  }

  // U4: Fetch Webhooks
  const fetchWebhooks = async () => {
    setLoadingWebhooks(true)
    try {
      const res = await fetch('/api/webhooks')
      const data = await res.json()
      if (data.success) {
        setWebhooks(
          data.data.map((wh: WebhookEndpoint & { isActive?: boolean }) => ({
            ...wh,
            status: wh.status ?? (wh.isActive ? 'active' : 'inactive'),
          }))
        )
      }
    } catch {
      toast.error('加载 Webhook 端点失败')
    } finally {
      setLoadingWebhooks(false)
    }
  }

  // U4: Create API Key
  const handleCreateKey = async () => {
    if (!newKeyForm.name.trim()) {
      toast.error('请输入 Key 名称')
      return
    }
    if (newKeyForm.permissions.length === 0) {
      toast.error('请至少选择一项权限')
      return
    }
    setCreatingKey(true)
    try {
      const res = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newKeyForm),
      })
      const data = await res.json()
      if (data.success) {
        setCreatedKey(data.data.key)
        setNewKeyForm({ name: '', permissions: [], rateLimit: 100 })
        fetchApiKeys()
      } else {
        toast.error(data.error?.message || '创建失败')
      }
    } catch {
      toast.error('创建 API Key 失败')
    } finally {
      setCreatingKey(false)
    }
  }

  // U4: Revoke API Key
  const handleRevokeKey = async (id: string) => {
    if (!confirm('确定要吊销此 API Key 吗？吊销后将立即失效。')) return
    try {
      const res = await fetch(`/api/api-keys/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        toast.success('API Key 已吊销')
        fetchApiKeys()
      } else {
        toast.error(data.error?.message || '吊销失败')
      }
    } catch {
      toast.error('吊销失败')
    }
  }

  // U4: Create Webhook
  const handleCreateWebhook = async () => {
    if (!newWebhookForm.url.trim()) {
      toast.error('请输入 Webhook URL')
      return
    }
    if (newWebhookForm.events.length === 0) {
      toast.error('请至少选择一个事件')
      return
    }
    setCreatingWebhook(true)
    try {
      const res = await fetch('/api/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newWebhookForm),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Webhook 端点已创建')
        setShowCreateWebhookDialog(false)
        setNewWebhookForm({ url: '', events: [] })
        if (data.secret) {
          setCreatedWebhookSecret(data.secret)
          setShowWebhookSecretDialog(true)
        }
        fetchWebhooks()
    fetchDeliveries()
      } else {
        toast.error(data.error?.message || '创建失败')
      }
    } catch {
      toast.error('创建 Webhook 失败')
    } finally {
      setCreatingWebhook(false)
    }
  }

  // U4: Test Webhook
  const handleTestWebhook = async (id: string) => {
    setTestingWebhookId(id)
    try {
      const res = await fetch(`/api/webhooks/${id}/test`, { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        toast.success('测试请求已发送')
      } else {
        toast.error(data.error?.message || '测试失败')
      }
    } catch {
      toast.error('测试请求失败')
    } finally {
      setTestingWebhookId(null)
    }
  }

  // U4: Delete Webhook
  const handleDeleteWebhook = async (id: string) => {
    if (!confirm('确定要删除此 Webhook 端点吗？')) return
    try {
      const res = await fetch(`/api/webhooks/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        toast.success('Webhook 端点已删除')
        fetchWebhooks()
      } else {
        toast.error(data.error?.message || '删除失败')
      }
    } catch {
      toast.error('删除失败')
    }
  }

  const fetchDeliveries = async (p = 1) => {
    setLoadingDeliveries(true)
    try {
      const params = new URLSearchParams({ page: String(p), limit: "10" })
      if (deliveryFilter.endpointId) params.set("endpointId", deliveryFilter.endpointId)
      if (deliveryFilter.status) params.set("status", deliveryFilter.status)
      const res = await fetch("/api/webhooks/deliveries?" + params)
      const data = await res.json()
      if (data.success) {
        setDeliveries(data.data)
        setDeliveryPagination(data.pagination)
        setDeliveryPage(p)
      }
    } catch { /* silent */ } finally {
      setLoadingDeliveries(false)
    }
  }

  // U4: Toggle permission checkbox
  const togglePermission = (perm: string) => {
    setNewKeyForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(perm)
        ? prev.permissions.filter((p) => p !== perm)
        : [...prev.permissions, perm],
    }))
  }

  // U4: Toggle webhook event checkbox
  const toggleWebhookEvent = (evt: string) => {
    setNewWebhookForm((prev) => ({
      ...prev,
      events: prev.events.includes(evt)
        ? prev.events.filter((e) => e !== evt)
        : [...prev.events, evt],
    }))
  }

  const loadDataSources = async () => {
    setDataSourcesLoading(true)
    try {
      const res = await fetch('/api/settings/data-sources')
      const data = await res.json()
      if (data.success) setDataSources(data.data.providers || [])
    } catch {
      toast.error('加载数据源状态失败')
    } finally {
      setDataSourcesLoading(false)
    }
  }

  // S1c: Load 2FA status
  const loadTwoFactorStatus = async () => {
    try {
      const res = await fetch('/api/auth/2fa/status')
      const data = await res.json()
      if (data.success) {
        setTwoFactorEnabled(data.data.enabled)
      }
    } catch { /* silent */ } finally {
      setTwoFactorLoading(false)
    }
  }

  // S1c: 2FA enable - request QR code
  const handle2faEnableStart = async () => {
    setSecurityMessage(null)
    setTwoFactorActionLoading(true)
    try {
      const res = await fetch('/api/auth/2fa/enable', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setTwoFactorQrCode(data.data.qrCode)
        setTwoFactorSecret(data.data.secret)
        setTwoFactorSetupStep('scan')
      } else {
        setSecurityMessage({ type: 'error', text: data.error?.message || '操作失败' })
      }
    } catch {
      setSecurityMessage({ type: 'error', text: '请求失败，请稍后重试' })
    } finally {
      setTwoFactorActionLoading(false)
    }
  }

  // S1c: 2FA verify - confirm code and enable
  const handle2faVerify = async () => {
    if (!twoFactorCode.trim()) return
    setSecurityMessage(null)
    setTwoFactorActionLoading(true)
    try {
      const res = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: twoFactorCode.trim() }),
      })
      const data = await res.json()
      if (data.success) {
        setTwoFactorBackupCodes(data.data.backupCodes)
        setTwoFactorEnabled(true)
        setTwoFactorSetupStep('idle')
        setTwoFactorCode('')
        setSecurityMessage({ type: 'success', text: '两步验证已启用' })
      } else {
        setSecurityMessage({ type: 'error', text: data.error?.message || '验证码无效' })
      }
    } catch {
      setSecurityMessage({ type: 'error', text: '请求失败，请稍后重试' })
    } finally {
      setTwoFactorActionLoading(false)
    }
  }

  // S1c: 2FA disable
  const handle2faDisable = async () => {
    if (!twoFactorDisableCode.trim()) return
    setSecurityMessage(null)
    setTwoFactorActionLoading(true)
    try {
      const res = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: twoFactorDisableCode.trim() }),
      })
      const data = await res.json()
      if (data.success) {
        setTwoFactorEnabled(false)
        setShowDisable2fa(false)
        setTwoFactorDisableCode('')
        setSecurityMessage({ type: 'success', text: '两步验证已关闭' })
      } else {
        setSecurityMessage({ type: 'error', text: data.error?.message || '验证码无效' })
      }
    } catch {
      setSecurityMessage({ type: 'error', text: '请求失败，请稍后重试' })
    } finally {
      setTwoFactorActionLoading(false)
    }
  }

  // S1c: Change password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordMessage(null)

    if (newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: '新密码至少 6 位' })
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: '两次输入的密码不一致' })
      return
    }

    setPasswordSaving(true)
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = await res.json()
      if (data.success) {
        setPasswordMessage({ type: 'success', text: '密码已修改' })
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        setPasswordMessage({ type: 'error', text: data.error?.message || '修改失败' })
      }
    } catch {
      setPasswordMessage({ type: 'error', text: '请求失败，请稍后重试' })
    } finally {
      setPasswordSaving(false)
    }
  }

  const copyBackupCodes = () => {
    navigator.clipboard.writeText(twoFactorBackupCodes.join('\n')).then(() => toast.success('备份码已复制到剪贴板'))
  }

  useEffect(() => {
    loadAccounts()
    loadTenantUsage()
    loadDataSources()
    loadTwoFactorStatus()
    fetchApiKeys()
    fetchWebhooks()
  }, [])

  useEffect(() => {
    const billing = new URLSearchParams(window.location.search).get('billing')
    if (billing === 'success') {
      toast.success('订阅成功，套餐已升级')
      loadTenantUsage()
    } else if (billing === 'cancel') {
      toast.info('已取消结账')
    }
  }, [])

  const resetForm = () => {
    setDialogOpen(false)
    setEditingId(null)
    setFormData(emptyFormData)
  }

  // 处理 SMTP 主机变化，自动推断 IMAP
  const handleSmtpHostChange = (value: string) => {
    const newFormData = { ...formData, smtpHost: value }
    // 仅当 IMAP 主机为空时自动填充
    if (!formData.imapHost) {
      const inferred = inferImapHost(value)
      if (inferred) {
        newFormData.imapHost = inferred.host
        newFormData.imapPort = String(inferred.port)
      }
    }
    setFormData(newFormData)
  }

  const openAddForm = () => {
    setEditingId(null)
    setFormData(emptyFormData)
    setDialogOpen(true)
  }

  const openEditForm = (account: EmailAccount) => {
    setEditingId(account.id)
    setFormData({
      email: account.email,
      displayName: account.displayName || '',
      smtpHost: account.smtpHost,
      smtpPort: String(account.smtpPort),
      smtpUser: account.smtpUser,
      smtpPassword: '',
      imapHost: account.imapHost || '',
      imapPort: account.imapPort ? String(account.imapPort) : '993',
      imapUser: account.imapUser || account.email,
      imapPassword: '',
      warmupEnabled: account.warmupEnabled ?? false,
      warmupTarget: String(account.warmupTarget ?? 50),
    })
    setDialogOpen(true)
  }

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload: Record<string, string | boolean> = {
        email: formData.email,
        displayName: formData.displayName,
        smtpHost: formData.smtpHost,
        smtpPort: formData.smtpPort,
        smtpUser: formData.smtpUser,
        imapHost: formData.imapHost,
        imapPort: formData.imapPort,
        imapUser: formData.imapUser,
      }
      if (formData.smtpPassword) payload.smtpPassword = formData.smtpPassword
      if (formData.imapPassword) payload.imapPassword = formData.imapPassword
      if (editingId) {
        payload.warmupEnabled = formData.warmupEnabled
        payload.warmupTarget = formData.warmupTarget
      }

      const res = await fetch(
        editingId ? `/api/email-accounts/${editingId}` : '/api/email-accounts',
        {
          method: editingId ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            editingId
              ? payload
              : { ...formData }
          ),
        }
      )
      const data = await res.json()
      if (data.success) {
        toast.success(editingId ? '账户已更新' : '账户添加成功')
        resetForm()
        loadAccounts()
      } else {
        toast.error(data.error?.message || data.message || data.error || '保存失败')
      }
    } catch {
      toast.error('保存账户失败')
    } finally {
      setSaving(false)
    }
  }

  // 删除账户
  const handleDeleteAccount = async (id: string) => {
    if (!confirm('确定要删除这个邮件账户吗？')) return
    try {
      const res = await fetch(`/api/email-accounts/${id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (data.success) {
        toast.success('账户已删除')
        loadAccounts()
      } else {
        toast.error(data.error || '删除失败')
      }
    } catch (error) {
      toast.error('删除账户失败')
    }
  }

  // 测试邮件发送
  const handleTestEmail = async (accountId: string) => {
    if (!testEmail) {
      toast.error('请输入测试邮箱地址')
      return
    }
    setTestingId(accountId)
    try {
      const res = await fetch('/api/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: testEmail,
          subject: 'OutreachHub 账户测试邮件',
          content: '这是一封测试邮件，验证您的邮件账户配置是否正确。',
          emailAccountId: accountId,
          plain: true,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`测试邮件已发送至 ${testEmail}`)
      } else {
        toast.error(data.error || '发送失败')
      }
    } catch (error) {
      toast.error('测试邮件发送失败')
    } finally {
      setTestingId(null)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">设置</h1>
            <p className="mt-1 text-sm text-gray-500">
              管理您的邮件账户和系统配置
            </p>
          </div>
        </div>

        <Tabs defaultValue="email-accounts" className="space-y-4">
          <TabsList>
            <TabsTrigger value="email-accounts" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              邮件账户
            </TabsTrigger>
            <TabsTrigger value="general" className="flex items-center gap-2">
              <SettingsIcon className="h-4 w-4" />
              通用设置
            </TabsTrigger>
            <TabsTrigger value="data-sources" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              数据源
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              安全设置
            </TabsTrigger>
            <TabsTrigger value="api-keys" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              API Keys
            </TabsTrigger>
          </TabsList>

          {/* 邮件账户管理 */}
          <TabsContent value="email-accounts" className="space-y-4">
            {/* 添加账户按钮 */}
            <div className="flex justify-end">
              <Button onClick={openAddForm}>
                <Plus className="mr-2 h-4 w-4" />
                添加账户
              </Button>
            </div>

            <Dialog open={dialogOpen} onOpenChange={(open) => !open && resetForm()}>
              <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
                <DialogHeader>
                  <DialogTitle>{editingId ? '编辑邮件账户' : '添加邮件账户'}</DialogTitle>
                  <DialogDescription>
                    {editingId
                      ? '修改发信账户配置。密码留空表示不修改。'
                      : '配置 SMTP 发信账户，可选填 IMAP 用于收件箱同步。'}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSaveAccount} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">邮箱地址 *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="your@email.com"
                        required
                      />
                      <p className="text-xs text-gray-400">收件人看到的发件人地址</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="displayName">显示名称</Label>
                      <Input
                        id="displayName"
                        value={formData.displayName}
                        onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                        placeholder="您的名字"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="smtpHost">SMTP 服务器 *</Label>
                      <Input
                        id="smtpHost"
                        value={formData.smtpHost}
                        onChange={(e) => handleSmtpHostChange(e.target.value)}
                        placeholder="smtp.gmail.com"
                        required
                      />
                      {formData.smtpHost && inferImapHost(formData.smtpHost) && !formData.imapHost && (
                        <p className="text-xs text-blue-500">
                          已自动推断 IMAP: {inferImapHost(formData.smtpHost)?.host}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="smtpPort">SMTP 端口 *</Label>
                      <Input
                        id="smtpPort"
                        type="number"
                        value={formData.smtpPort}
                        onChange={(e) => setFormData({ ...formData, smtpPort: e.target.value })}
                        placeholder="587 或 465"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="smtpUser">SMTP 用户名 *</Label>
                      <Input
                        id="smtpUser"
                        value={formData.smtpUser}
                        onChange={(e) => setFormData({ ...formData, smtpUser: e.target.value })}
                        placeholder="通常与邮箱地址相同"
                        required
                      />
                      <p className="text-xs text-gray-400">登录 SMTP 服务器的账号</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="smtpPassword">SMTP 密码 {editingId ? '' : '*'}</Label>
                      <Input
                        id="smtpPassword"
                        type="password"
                        value={formData.smtpPassword}
                        onChange={(e) => setFormData({ ...formData, smtpPassword: e.target.value })}
                        placeholder={editingId ? '留空则不修改' : '应用专用密码'}
                        required={!editingId}
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <p className="text-sm font-medium text-gray-700">IMAP 配置（可选，用于统一收件箱）</p>
                      <p className="text-xs text-gray-400">
                        填写 SMTP 后会自动推断 IMAP 主机。常见服务商：Gmail、Outlook、QQ、163 等已内置配置。
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="imapHost">IMAP 服务器</Label>
                      <Input
                        id="imapHost"
                        value={formData.imapHost}
                        onChange={(e) => setFormData({ ...formData, imapHost: e.target.value })}
                        placeholder={formData.smtpHost ? inferImapHost(formData.smtpHost)?.host || 'mail.example.com' : 'mail.example.com'}
                      />
                      <p className="text-xs text-gray-500">
                        常见规律：smtp.xxx.com → mail.xxx.com（而非 imap.xxx.com）
                      </p>
                      {formData.imapHost && formData.smtpHost && !formData.imapHost.includes('.') && (
                        <p className="text-xs text-amber-500">
                          ⚠️ IMAP 主机格式可能不正确，通常为 mail.xxx.com
                        </p>
                      )}
                      {/* D2: imap. 前缀警告 — 已知域 DNS 不存在 */}
                      {formData.imapHost && suggestImapFix(formData.imapHost, formData.smtpHost) && (
                        <div className="flex items-center gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 mt-1">
                          <span className="text-xs text-amber-700">
                            ⚠️ <strong>{formData.imapHost}</strong> 的 DNS 可能不存在。
                            建议改为 <strong>{suggestImapFix(formData.imapHost, formData.smtpHost)}</strong>
                          </span>
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, imapHost: suggestImapFix(formData.imapHost, formData.smtpHost)! })}
                            className="ml-auto text-xs font-medium text-blue-600 hover:text-blue-800 underline whitespace-nowrap"
                          >
                            一键修正
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="imapPort">IMAP 端口</Label>
                      <Input
                        id="imapPort"
                        type="number"
                        value={formData.imapPort}
                        onChange={(e) => setFormData({ ...formData, imapPort: e.target.value })}
                        placeholder="993"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="imapUser">IMAP 用户名</Label>
                      <Input
                        id="imapUser"
                        value={formData.imapUser}
                        onChange={(e) => setFormData({ ...formData, imapUser: e.target.value })}
                        placeholder="通常与邮箱地址相同"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="imapPassword">IMAP 密码</Label>
                      <Input
                        id="imapPassword"
                        type="password"
                        value={formData.imapPassword}
                        onChange={(e) => setFormData({ ...formData, imapPassword: e.target.value })}
                        placeholder={editingId ? '留空则不修改' : '通常与 SMTP 密码相同'}
                      />
                    </div>
                  </div>

                  {editingId && (
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="warmupEnabled" className="text-sm font-medium">Warm-up 预热</Label>
                          <p className="text-xs text-gray-500 mt-0.5">
                            新账户 21 天递增发信限额（5→15→30→50→目标值），降低进垃圾箱风险
                          </p>
                        </div>
                        <input
                          id="warmupEnabled"
                          type="checkbox"
                          checked={formData.warmupEnabled}
                          onChange={(e) => setFormData({ ...formData, warmupEnabled: e.target.checked })}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                      </div>
                      {formData.warmupEnabled && (
                        <div className="space-y-2">
                          <Label htmlFor="warmupTarget">目标每日限额</Label>
                          <Input
                            id="warmupTarget"
                            type="number"
                            min={10}
                            max={500}
                            value={formData.warmupTarget}
                            onChange={(e) => setFormData({ ...formData, warmupTarget: e.target.value })}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={resetForm}>
                      取消
                    </Button>
                    <Button type="submit" disabled={saving}>
                      {saving ? '保存中...' : editingId ? '保存修改' : '保存账户'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            {/* 测试邮箱输入 */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <TestTube className="h-5 w-5 text-gray-500" />
                  <div className="flex-1">
                    <Label htmlFor="testEmail">测试收件邮箱</Label>
                    <Input
                      id="testEmail"
                      type="email"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      placeholder="输入接收测试邮件的邮箱地址"
                      className="mt-1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 账户列表 */}
            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">加载中...</p>
              </div>
            ) : accounts.length === 0 ? (
              <Card>
                <CardContent className="py-8">
                  <div className="text-center">
                    <Mail className="h-12 w-12 mx-auto text-gray-300" />
                    <p className="mt-2 text-sm text-gray-500">暂无邮件账户</p>
                    <p className="text-xs text-gray-400">点击上方"添加账户"开始配置</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {accounts.map((account) => (
                  <Card key={account.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <Mail className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{account.email}</p>
                              {account.isActive ? (
                                <Badge className="bg-green-100 text-green-700">
                                  <CheckCircle className="mr-1 h-3 w-3" />
                                  活跃
                                </Badge>
                              ) : (
                                <Badge className="bg-gray-100 text-gray-700">
                                  <XCircle className="mr-1 h-3 w-3" />
                                  停用
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-500">
                              {account.displayName || account.smtpUser} · {account.smtpHost}:{account.smtpPort}
                            </p>
                            <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                              <span className="flex items-center gap-1">
                                <Server className="h-3 w-3" />
                                SMTP: {account.smtpHost}
                              </span>
                              {account.imapHost && (
                                <span className="flex items-center gap-1">
                                  <Shield className="h-3 w-3" />
                                  IMAP: {account.imapHost}
                                </span>
                              )}
                              <span>
                                今日已发: {account.dailySent}/{account.dailyLimit}
                              </span>
                              <span>
                                健康度: {account.healthScore}%
                              </span>
                              {account.warmupEnabled && (
                                <Badge className="bg-orange-100 text-orange-700">
                                  Warm-up 第 {account.warmupDay ?? 0} 天
                                </Badge>
                              )}
                            </div>
                            {/* #19: IMAP 错误提示 */}
                            {account.imapLastError && (
                              <div className="mt-2 flex items-start gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2">
                                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-xs font-medium text-amber-700">IMAP 连接异常</p>
                                  <p className="text-xs text-amber-600 truncate" title={account.imapLastError}>
                                    {account.imapLastError}
                                  </p>
                                  {account.imapLastErrorAt && (
                                    <p className="text-xs text-amber-500 mt-0.5">
                                      {new Date(account.imapLastErrorAt).toLocaleString('zh-CN')}
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditForm(account)}
                          >
                            <Pencil className="mr-1 h-3 w-3" />
                            编辑
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTestEmail(account.id)}
                            disabled={testingId === account.id || !testEmail}
                          >
                            {testingId === account.id ? (
                              <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                            ) : (
                              <TestTube className="mr-1 h-3 w-3" />
                            )}
                            测试
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fetchDnsRecords(account.id)}
                          >
                            <Globe className="mr-1 h-3 w-3" />
                            DNS
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteAccount(account.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* 通用设置 — 套餐 / 用量 / 团队 */}
          <TabsContent value="general" className="space-y-6">
            {tenantLoading ? (
              <div className="text-center py-8"><RefreshCw className="h-6 w-6 animate-spin mx-auto text-gray-400" /></div>
            ) : tenantData ? (
              <>
                {/* 套餐信息 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Crown className="h-5 w-5" /> 套餐信息
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${PLAN_COLORS[tenantData.tenant.plan] || PLAN_COLORS.FREE}`}>
                        {PLAN_LABELS[tenantData.tenant.plan] || tenantData.tenant.plan}
                      </span>
                      <span className="text-sm text-gray-500">企业：{tenantData.tenant.name}</span>
                    </div>

                    {/* 用量进度条 */}
                    <div className="grid gap-4 sm:grid-cols-3">
                      <UsageMeter label="联系人" current={tenantData.usage.contactCount} max={tenantData.limits.maxContacts} percent={tenantData.usage.contactPercent} />
                      <UsageMeter label="今日发信" current={tenantData.usage.emailsSentToday} max={tenantData.limits.maxEmailsPerDay} percent={tenantData.usage.emailPercent} />
                      <UsageMeter label="团队成员" current={tenantData.usage.userCount} max={tenantData.limits.maxUsers} percent={tenantData.usage.userPercent} />
                    </div>

                    <div className="flex flex-wrap items-center gap-3 border-t border-gray-100 pt-4">
                      {tenantData.tenant.plan !== 'ENTERPRISE' && (
                        <Link href="/pricing">
                          <Button size="sm" className="gap-1">
                            <ArrowUpRight className="h-3.5 w-3.5" />
                            升级套餐
                          </Button>
                        </Link>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={portalLoading}
                        onClick={handleManageSubscription}
                      >
                        {portalLoading ? (
                          <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CreditCard className="mr-1.5 h-3.5 w-3.5" />
                        )}
                        管理订阅
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* R3b: 账单历史 — 通过 Stripe Portal 查看发票 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <CreditCard className="h-5 w-5" /> 账单历史
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-gray-500">
                      付款记录与 PDF 发票请在 Stripe 客户门户查看；退款政策见帮助中心 FAQ。
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={portalLoading}
                      onClick={handleManageSubscription}
                      className="gap-1"
                    >
                      {portalLoading ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CreditCard className="h-3.5 w-3.5" />
                      )}
                      查看账单与发票
                    </Button>
                  </CardContent>
                </Card>

                {/* K6: 退订页语言 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      🌐 退订页语言
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-gray-500 mb-3">设置邮件退订页面的显示语言（影响收件人看到的退订确认页）</p>
                    <div className="flex items-center gap-3">
                      <select
                        className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                        value={tenantLanguage}
                        onChange={(e) => setTenantLanguage(e.target.value)}
                      >
                        {LANGUAGES.map((lang) => (
                          <option key={lang.code} value={lang.code}>
                            {lang.nativeName}
                          </option>
                        ))}
                      </select>
                      <Button size="sm" onClick={handleSaveLanguage} disabled={savingLanguage}>
                        {savingLanguage ? '保存中...' : '保存'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* 团队成员 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" /> 团队成员（{tenantData.members.length}）
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* 邀请成员 */}
                    <div className="flex gap-2">
                      <Input
                        placeholder="输入邮箱地址邀请成员"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        type="email"
                        className="flex-1"
                      />
                      <Button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()} className="gap-1">
                        {inviting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                        邀请
                      </Button>
                    </div>

                    {/* 成员列表 */}
                    <div className="divide-y divide-gray-100">
                      {tenantData.members.map((m) => (
                        <div key={m.id} className="flex items-center gap-3 py-3">
                          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                            {(m.name || m.email)[0]?.toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{m.name || m.email.split('@')[0]}</p>
                            <p className="text-xs text-gray-500 truncate">{m.email}</p>
                          </div>
                          <span className="text-xs text-gray-400">{m.role}</span>
                        </div>
                      ))}
                    </div>

                    {/* H3d: 待处理邀请 */}
                    {tenantData.invitations && tenantData.invitations.length > 0 && (
                      <>
                        <p className="text-xs font-medium text-gray-500 mt-4 mb-2">待处理邀请</p>
                        <div className="divide-y divide-gray-100">
                          {tenantData.invitations.map((inv) => (
                            <div key={inv.id} className="flex items-center gap-3 py-3">
                              <div className="h-9 w-9 rounded-full bg-amber-100 flex items-center justify-center text-sm font-medium text-amber-600">
                                <Mail className="h-4 w-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{inv.email}</p>
                                <p className="text-xs text-gray-500 truncate">{inv.role} · 到期 {new Date(inv.expiresAt).toLocaleDateString('zh-CN')}</p>
                              </div>
                              <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleRevokeInvite(inv.id)}>
                                撤销
                              </Button>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card><CardContent className="py-8 text-center text-gray-500">无法加载套餐信息</CardContent></Card>
            )}
          </TabsContent>

          {/* M4c: 数据源配置 */}
          <TabsContent value="data-sources" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" /> 外部数据源
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-500">配置外部数据源 API Key 以启用多源拓客和邮箱验证功能。未配置的数据源在拓客页将显示为不可用。API Key 由管理员在服务器环境变量中配置。</p>
                {dataSourcesLoading ? (
                  <div className="flex items-center justify-center py-8 text-gray-400">
                    <RefreshCw className="h-5 w-5 animate-spin mr-2" /> 加载中...
                  </div>
                ) : dataSources.length === 0 ? (
                  <p className="text-sm text-gray-500">无法加载数据源状态</p>
                ) : (
                  dataSources.map((src) => (
                    <div key={src.env} className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{src.name}</p>
                        <p className="text-xs text-gray-500">{src.desc}</p>
                        <p className="text-xs text-gray-400 mt-1">环境变量：{src.env}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${src.configured ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {src.configured ? '✅ 已配置' : '未配置'}
                        </span>
                        <a href={src.docs} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                          文档
                        </a>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* S1c: 安全设置 */}
          <TabsContent value="security" className="space-y-6">
            {/* Global security message */}
            {securityMessage && (
              <div className={`rounded-lg p-3 text-sm ${securityMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {securityMessage.text}
              </div>
            )}

            {/* 2FA Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Smartphone className="h-5 w-5" /> 两步验证（2FA）
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {twoFactorLoading ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <RefreshCw className="h-4 w-4 animate-spin" /> 加载中...
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          两步验证：{twoFactorEnabled ? '已启用' : '未启用'}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          启用后登录时需输入动态验证码，提升账户安全性
                        </p>
                      </div>
                      <Badge className={twoFactorEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}>
                        {twoFactorEnabled ? '已启用' : '未启用'}
                      </Badge>
                    </div>

                    {!twoFactorEnabled && twoFactorSetupStep === 'idle' && (
                      <Button onClick={handle2faEnableStart} disabled={twoFactorActionLoading}>
                        {twoFactorActionLoading ? (
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Shield className="mr-2 h-4 w-4" />
                        )}
                        启用两步验证
                      </Button>
                    )}

                    {/* 2FA Setup: QR Code scanning step */}
                    {!twoFactorEnabled && twoFactorSetupStep === 'scan' && (
                      <div className="space-y-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
                        <p className="text-sm font-medium text-blue-800">第 1 步：扫描二维码</p>
                        <p className="text-xs text-blue-600">
                          使用 Google Authenticator、Authy 或其他 TOTP 应用扫描下方二维码
                        </p>
                        {twoFactorQrCode && (
                          <div className="flex justify-center">
                            <img
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(twoFactorQrCode)}`}
                              alt="2FA QR Code"
                              className="rounded-lg border border-gray-200 bg-white p-2"
                            />
                          </div>
                        )}
                        <div className="space-y-1">
                          <p className="text-xs text-gray-500">无法扫描？手动输入密钥：</p>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 rounded bg-white px-3 py-2 text-sm font-mono border border-gray-200">
                              {twoFactorSecret}
                            </code>
                            <Button variant="outline" size="sm" onClick={() => copyToClipboard(twoFactorSecret)}>
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <Button onClick={() => setTwoFactorSetupStep('verify')}>
                          下一步：输入验证码
                        </Button>
                      </div>
                    )}

                    {/* 2FA Setup: Verification step */}
                    {!twoFactorEnabled && twoFactorSetupStep === 'verify' && (
                      <div className="space-y-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
                        <p className="text-sm font-medium text-blue-800">第 2 步：输入验证码</p>
                        <p className="text-xs text-blue-600">
                          输入 authenticator 应用中显示的 6 位数字验证码
                        </p>
                        <div className="flex items-center gap-2">
                          <Input
                            value={twoFactorCode}
                            onChange={(e) => setTwoFactorCode(e.target.value)}
                            placeholder="000000"
                            maxLength={6}
                            className="w-40 text-center text-lg tracking-widest font-mono"
                          />
                          <Button onClick={handle2faVerify} disabled={twoFactorActionLoading || twoFactorCode.trim().length < 6}>
                            {twoFactorActionLoading ? (
                              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            ) : null}
                            确认启用
                          </Button>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setTwoFactorSetupStep('scan')}>
                          返回上一步
                        </Button>
                      </div>
                    )}

                    {/* Backup codes display (one-time) */}
                    {twoFactorBackupCodes.length > 0 && (
                      <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-600" />
                          <p className="text-sm font-medium text-amber-800">请保存备份码</p>
                        </div>
                        <p className="text-xs text-amber-700">
                          以下备份码仅显示一次。当您无法使用 authenticator 时，可使用备份码登录。每个备份码只能使用一次。
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {twoFactorBackupCodes.map((code) => (
                            <code key={code} className="rounded bg-white px-3 py-1.5 text-sm font-mono border border-amber-200 text-center">
                              {code}
                            </code>
                          ))}
                        </div>
                        <Button variant="outline" size="sm" onClick={copyBackupCodes}>
                          <Copy className="mr-2 h-3 w-3" />
                          复制备份码
                        </Button>
                      </div>
                    )}

                    {/* Disable 2FA */}
                    {twoFactorEnabled && (
                      <>
                        {!showDisable2fa ? (
                          <Button variant="outline" onClick={() => { setShowDisable2fa(true); setSecurityMessage(null) }}>
                            禁用两步验证
                          </Button>
                        ) : (
                          <div className="space-y-3 rounded-lg border border-red-200 bg-red-50 p-4">
                            <p className="text-sm font-medium text-red-800">禁用两步验证</p>
                            <p className="text-xs text-red-600">
                              请输入当前 authenticator 应用中的验证码以确认禁用
                            </p>
                            <div className="flex items-center gap-2">
                              <Input
                                value={twoFactorDisableCode}
                                onChange={(e) => setTwoFactorDisableCode(e.target.value)}
                                placeholder="000000"
                                maxLength={6}
                                className="w-40 text-center text-lg tracking-widest font-mono"
                              />
                              <Button variant="destructive" onClick={handle2faDisable} disabled={twoFactorActionLoading || twoFactorDisableCode.trim().length < 6}>
                                {twoFactorActionLoading ? (
                                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                ) : null}
                                确认禁用
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => { setShowDisable2fa(false); setTwoFactorDisableCode('') }}>
                                取消
                              </Button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Password Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Lock className="h-5 w-5" /> 修改密码
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                  {passwordMessage && (
                    <div className={`rounded-lg p-3 text-sm ${passwordMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                      {passwordMessage.text}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">当前密码</Label>
                    <div className="relative">
                      <Input
                        id="currentPassword"
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="输入当前密码"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">新密码</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="至少 6 位"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">确认新密码</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="再次输入新密码"
                      required
                      minLength={6}
                    />
                  </div>
                  <Button type="submit" disabled={passwordSaving}>
                    {passwordSaving ? (
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <KeyRound className="mr-2 h-4 w-4" />
                    )}
                    修改密码
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* S4a: SSO Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-5 w-5" /> SSO 单点登录
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-dashed p-6 text-center">
                  <Building2 className="mx-auto h-8 w-8 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">SSO 单点登录为企业版功能</p>
                  <p className="text-xs text-gray-400">支持 SAML 2.0 和 OIDC 协议</p>
                  <Button variant="outline" size="sm" className="mt-4" asChild>
                    <a href="mailto:sales@outreachhub.com">联系销售</a>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Sessions Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Monitor className="h-5 w-5" /> 会话管理
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-dashed p-6 text-center">
                  <Monitor className="mx-auto h-8 w-8 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">会话管理功能即将上线</p>
                  <p className="text-xs text-gray-400">查看和管理活跃登录会话</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* U4: API Keys & Webhooks */}
          <TabsContent value="api-keys" className="space-y-6">
            {tenantData?.tenant.plan === 'FREE' || tenantData?.tenant.plan === 'BASIC' ? (
              <Card>
                <CardContent className="py-12">
                  <div className="flex flex-col items-center text-center">
                    <div className="rounded-full bg-gray-100 p-4 mb-4">
                      <Lock className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">API Keys 和 Webhook 管理为专业版及以上功能</h3>
                    <p className="mt-2 text-sm text-gray-500 max-w-md">
                      升级至专业版或企业版即可创建和管理 API Keys、配置 Webhook 端点，实现程序化访问和实时事件通知。
                    </p>
                    <Button className="mt-6" asChild>
                      <Link href="/pricing">升级套餐</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
            <>
            {/* API Keys Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Key className="h-5 w-5" /> API Keys
                  </CardTitle>
                  <Button size="sm" onClick={() => setShowCreateKeyDialog(true)}>
                    <Plus className="mr-2 h-3 w-3" />
                    创建新 Key
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-500">
                  使用 API Key 以编程方式访问 OutreachHub API。每个 Key 可配置独立的权限和速率限制。
                </p>

                {loadingKeys ? (
                  <div className="flex items-center justify-center py-8 text-gray-400">
                    <RefreshCw className="h-5 w-5 animate-spin mr-2" /> 加载中...
                  </div>
                ) : apiKeys.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-6 text-center">
                    <Key className="mx-auto h-8 w-8 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-500">暂无 API Key</p>
                    <p className="text-xs text-gray-400">点击「创建新 Key」开始</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {apiKeys.map((apiKey) => (
                      <div key={apiKey.id} className="rounded-lg border border-gray-200 p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-gray-900">{apiKey.name}</p>
                              <Badge className={apiKey.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                                {apiKey.status === 'active' ? '活跃' : '已吊销'}
                              </Badge>
                            </div>
                            <p className="text-xs font-mono text-gray-500">{apiKey.keyPrefix}...</p>
                            <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                              <span>权限：{apiKey.permissions.join(', ')}</span>
                              <span>速率限制：{apiKey.rateLimit}/分钟</span>
                              {apiKey.lastUsedAt && (
                                <span>最后使用：{new Date(apiKey.lastUsedAt).toLocaleString('zh-CN')}</span>
                              )}
                            </div>
                          </div>
                          {apiKey.status === 'active' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRevokeKey(apiKey.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              吊销
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Webhook Endpoints Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Webhook className="h-5 w-5" /> Webhook 端点
                  </CardTitle>
                  <Button size="sm" onClick={() => setShowCreateWebhookDialog(true)}>
                    <Plus className="mr-2 h-3 w-3" />
                    添加 Webhook
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-500">
                  配置 Webhook 端点以接收实时事件通知。当指定事件发生时，系统将向您的 URL 发送 POST 请求。
                </p>

                {loadingWebhooks ? (
                  <div className="flex items-center justify-center py-8 text-gray-400">
                    <RefreshCw className="h-5 w-5 animate-spin mr-2" /> 加载中...
                  </div>
                ) : webhooks.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-6 text-center">
                    <Webhook className="mx-auto h-8 w-8 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-500">暂无 Webhook 端点</p>
                    <p className="text-xs text-gray-400">点击「添加 Webhook」开始配置</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {webhooks.map((wh) => (
                      <div key={wh.id} className="rounded-lg border border-gray-200 p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <code className="text-sm text-gray-900 truncate">{wh.url}</code>
                              <Badge className={wh.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}>
                                {wh.status === 'active' ? '活跃' : '停用'}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              {wh.events.map((evt) => (
                                <Badge key={evt} className="text-xs border border-gray-300">{evt}</Badge>
                              ))}
                            </div>
                            {wh.lastTriggeredAt && (
                              <p className="text-xs text-gray-400">
                                最后触发：{new Date(wh.lastTriggeredAt).toLocaleString('zh-CN')}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleTestWebhook(wh.id)}
                              disabled={testingWebhookId === wh.id}
                            >
                              {testingWebhookId === wh.id ? (
                                <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                              ) : (
                                <Zap className="mr-1 h-3 w-3" />
                              )}
                              测试
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteWebhook(wh.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* P1-2: Webhook Delivery History */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Clock className="h-5 w-5" /> {t('dashboardSettings.recentDeliveries') || '最近投递记录'}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <select
                      value={deliveryFilter.endpointId}
                      onChange={(e) => { setDeliveryFilter(f => ({...f, endpointId: e.target.value})); setDeliveryPage(1) }}
                      className="text-xs rounded border px-2 py-1"
                    >
                      <option value="">{t('dashboardSettings.allEndpoints') || '全部端点'}</option>
                      {webhooks.map(w => { const label = w.url.replace("https://","").replace("http://",""); return <option key={w.id} value={w.id}>{label.slice(0, 30)}</option>; })}
                    </select>
                    <select
                      value={deliveryFilter.status}
                      onChange={(e) => { setDeliveryFilter(f => ({...f, status: e.target.value})); setDeliveryPage(1) }}
                      className="text-xs rounded border px-2 py-1"
                    >
                      <option value="">{t('dashboardSettings.allStatuses') || '全部状态'}</option>
                      <option value="success">{t('dashboardSettings.statusSuccess') || '成功'}</option>
                      <option value="failed">{t('dashboardSettings.statusFailed') || '失败'}</option>
                      <option value="pending">{t('dashboardSettings.statusPending') || '待处理'}</option>
                    </select>
                    <Button variant="outline" size="sm" onClick={() => fetchDeliveries(1)} disabled={loadingDeliveries}>
                      <RefreshCw className={"h-3 w-3 " + (loadingDeliveries ? 'animate-spin' : '')} />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loadingDeliveries ? (
                  <div className="flex items-center justify-center py-8 text-gray-400">
                    <RefreshCw className="h-5 w-5 animate-spin mr-2" /> {t('dashboardSettings.loading') || '加载中...'}
                  </div>
                ) : deliveries.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-6 text-center">
                    <Clock className="mx-auto h-8 w-8 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-500">{t('dashboardSettings.noDeliveries') || '暂无投递记录'}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {deliveries.map((d) => (
                      <div key={d.id} className="rounded-lg border border-gray-200 p-3">
                        <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpandedDelivery(expandedDelivery === d.id ? null : d.id)}>
                          <div className="flex items-center gap-3 min-w-0">
                            <Badge className={d.status === 'success' ? 'bg-green-100 text-green-700' : d.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}>
                              {d.status === 'success' ? (t('dashboardSettings.statusSuccess') || '成功') : d.status === 'failed' ? (t('dashboardSettings.statusFailed') || '失败') : (t('dashboardSettings.statusPending') || '待处理')}
                            </Badge>
                            <span className="text-xs font-mono text-gray-600">{d.event}</span>
                            {d.statusCode && <span className="text-xs text-gray-400">HTTP {d.statusCode}</span>}
                            <span className="text-xs text-gray-400">{t('dashboardSettings.attempts') || '尝试'}: {d.attempts}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">{new Date(d.createdAt).toLocaleString('zh-CN')}</span>
                            <ChevronDown className={"h-4 w-4 text-gray-400 transition-transform " + (expandedDelivery === d.id ? 'rotate-180' : '')} />
                          </div>
                        </div>
                        {expandedDelivery === d.id && (
                          <div className="mt-2 pt-2 border-t border-gray-100 space-y-1">
                            <p className="text-xs text-gray-500">{t('dashboardSettings.endpoint') || '端点'}: <code className="text-xs">{d.endpointUrl}</code></p>
                            {d.responseSummary && (
                              <div className="rounded bg-gray-50 p-2">
                                <p className="text-xs text-gray-500 mb-1">{t('dashboardSettings.responseSummary') || '响应摘要'}:</p>
                                <pre className="text-xs text-gray-600 whitespace-pre-wrap break-all">{d.responseSummary}</pre>
                              </div>
                            )}
                            {d.nextRetryAt && <p className="text-xs text-gray-400">{t('dashboardSettings.nextRetry') || '下次重试'}: {new Date(d.nextRetryAt).toLocaleString('zh-CN')}</p>}
                          </div>
                        )}
                      </div>
                    ))}
                    {deliveryPagination.totalPages > 1 && (
                      <div className="flex items-center justify-between pt-2">
                        <span className="text-xs text-gray-400">{t('dashboardSettings.totalRecords') || '共'} {deliveryPagination.total} {t('dashboardSettings.records') || '条'}</span>
                        <div className="flex gap-1">
                          <Button variant="outline" size="sm" disabled={deliveryPage <= 1} onClick={() => fetchDeliveries(deliveryPage - 1)}>{t('dashboardSettings.prev') || '上一页'}</Button>
                          <Button variant="outline" size="sm" disabled={deliveryPage >= deliveryPagination.totalPages} onClick={() => fetchDeliveries(deliveryPage + 1)}>{t('dashboardSettings.next') || '下一页'}</Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
            </>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* J1: DNS 记录对话框 */}
      <Dialog open={!!dnsAccountId} onOpenChange={(open) => { if (!open) { setDnsAccountId(null); setDnsData(null) } }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" /> 发信域名 DNS 配置
            </DialogTitle>
            <DialogDescription>
              配置以下 DNS 记录以提高邮件送达率。添加后等待 24-48 小时生效。
            </DialogDescription>
          </DialogHeader>

          {dnsLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : dnsData ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">域名：<strong>{dnsData.domain}</strong></p>

              {/* K1: DNS 验证状态 */}
              {dnsData.verification && dnsData.verification.length > 0 && (
                <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 space-y-2">
                  <p className="text-xs font-medium text-gray-700">当前 DNS 状态</p>
                  {dnsData.verification.map((v, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className={v.found && v.valid ? 'text-green-600' : v.found ? 'text-amber-600' : 'text-red-500'}>
                        {v.found && v.valid ? '✅' : v.found ? '⚠️' : '❌'}
                      </span>
                      <span className="font-medium w-16">{v.record}</span>
                      <span className="text-gray-600 text-xs">{v.message}</span>
                    </div>
                  ))}
                </div>
              )}

              {dnsData.records.map((rec, idx) => (
                <div key={idx} className="rounded-lg border border-gray-200 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={rec.status === 'required' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}>
                        {rec.type}
                      </Badge>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${rec.status === 'required' ? 'bg-red-100 text-red-700' : rec.status === 'recommended' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                        {rec.status === 'required' ? '必须' : rec.status === 'recommended' ? '推荐' : '可选'}
                      </span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => copyToClipboard(rec.value)}>
                      <Copy className="h-3 w-3 mr-1" /> 复制
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">{rec.description}</p>
                  <div className="bg-gray-50 rounded p-2">
                    <p className="text-xs text-gray-400">主机记录</p>
                    <p className="text-sm font-mono text-gray-800">{rec.host}</p>
                  </div>
                  <div className="bg-gray-50 rounded p-2">
                    <p className="text-xs text-gray-400">记录值</p>
                    <p className="text-sm font-mono text-gray-800 break-all">{rec.value}</p>
                  </div>
                </div>
              ))}

              <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
                <p className="text-sm font-medium text-blue-800 mb-2">💡 配置建议</p>
                <ul className="text-xs text-blue-700 space-y-1">
                  {dnsData.tips.map((tip, idx) => (
                    <li key={idx}>• {tip}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* U4: Create API Key Dialog */}
      <Dialog open={showCreateKeyDialog} onOpenChange={(open) => { if (!open) { setShowCreateKeyDialog(false); setCreatedKey(null) } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" /> 创建 API Key
            </DialogTitle>
            <DialogDescription>
              创建一个新的 API Key 用于程序化访问 OutreachHub API。
            </DialogDescription>
          </DialogHeader>

          {createdKey ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <p className="text-sm font-medium text-amber-800">此密钥只会显示一次，请妥善保管</p>
                </div>
                <p className="text-xs text-amber-700 mb-3">
                  关闭此对话框后将无法再次查看完整密钥。请立即复制并保存到安全位置。
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded bg-white px-3 py-2 text-sm font-mono border border-amber-200 break-all">
                    {createdKey}
                  </code>
                  <Button variant="outline" size="sm" onClick={() => copyToClipboard(createdKey)}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => { setShowCreateKeyDialog(false); setCreatedKey(null) }}>
                  我已保存，关闭
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="keyName">名称 *</Label>
                <Input
                  id="keyName"
                  value={newKeyForm.name}
                  onChange={(e) => setNewKeyForm({ ...newKeyForm, name: e.target.value })}
                  placeholder="例如：生产环境、测试密钥"
                />
              </div>

              <div className="space-y-2">
                <Label>权限 *</Label>
                <div className="grid grid-cols-2 gap-2">
                  {AVAILABLE_PERMISSIONS.map((perm) => (
                    <label key={perm.id} className="flex items-center gap-2 rounded-lg border border-gray-200 p-3 cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={newKeyForm.permissions.includes(perm.id)}
                        onChange={() => togglePermission(perm.id)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-700">{perm.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rateLimit">速率限制（次/分钟）</Label>
                <Input
                  id="rateLimit"
                  type="number"
                  min={1}
                  max={1000}
                  value={newKeyForm.rateLimit}
                  onChange={(e) => setNewKeyForm({ ...newKeyForm, rateLimit: parseInt(e.target.value) || 100 })}
                />
                <p className="text-xs text-gray-400">默认 100 次/分钟，最大 1000</p>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateKeyDialog(false)}>
                  取消
                </Button>
                <Button onClick={handleCreateKey} disabled={creatingKey}>
                  {creatingKey ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Key className="mr-2 h-4 w-4" />
                  )}
                  创建 Key
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* U4: Create Webhook Dialog */}
      <Dialog open={showCreateWebhookDialog} onOpenChange={(open) => { if (!open) { setShowCreateWebhookDialog(false); setNewWebhookForm({ url: '', events: [] }) } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Webhook className="h-5 w-5" /> 添加 Webhook 端点
            </DialogTitle>
            <DialogDescription>
              配置一个 Webhook URL 以接收事件通知。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="webhookUrl">Webhook URL *</Label>
              <Input
                id="webhookUrl"
                type="url"
                value={newWebhookForm.url}
                onChange={(e) => setNewWebhookForm({ ...newWebhookForm, url: e.target.value })}
                placeholder="https://your-server.com/webhook"
              />
              <p className="text-xs text-gray-400">必须是公网可访问的 HTTPS 地址</p>
            </div>

            <div className="space-y-2">
              <Label>订阅事件 *</Label>
              <div className="grid grid-cols-2 gap-2">
                {AVAILABLE_WEBHOOK_EVENTS.map((evt) => (
                  <label key={evt.id} className="flex items-center gap-2 rounded-lg border border-gray-200 p-3 cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={newWebhookForm.events.includes(evt.id)}
                      onChange={() => toggleWebhookEvent(evt.id)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700">{evt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateWebhookDialog(false)}>
                取消
              </Button>
              <Button onClick={handleCreateWebhook} disabled={creatingWebhook}>
                {creatingWebhook ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Webhook className="mr-2 h-4 w-4" />
                )}
                添加端点
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* U4: Webhook Secret One-Time Display Dialog */}
      <Dialog open={showWebhookSecretDialog} onOpenChange={(open) => { if (!open) { setShowWebhookSecretDialog(false); setCreatedWebhookSecret(null) } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" /> Webhook 签名密钥
            </DialogTitle>
            <DialogDescription>
              此密钥用于验证 Webhook 请求的签名，请妥善保管。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <p className="text-sm font-medium text-amber-800">请立即保存此密钥，后续将无法再次查看</p>
              </div>
              <p className="text-xs text-amber-700 mb-3">
                关闭此对话框后将无法再次查看完整签名密钥。请立即复制并保存到安全位置。
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-white px-3 py-2 text-sm font-mono border border-amber-200 break-all">
                  {createdWebhookSecret}
                </code>
                <Button variant="outline" size="sm" onClick={() => createdWebhookSecret && copyToClipboard(createdWebhookSecret)}>
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => { setShowWebhookSecretDialog(false); setCreatedWebhookSecret(null) }}>
                我已保存
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}

function UsageMeter({ label, current, max, percent }: { label: string; current: number; max: number; percent: number }) {
  const color = percent >= 90 ? 'bg-red-500' : percent >= 70 ? 'bg-amber-500' : 'bg-blue-500'
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium text-gray-900">{current.toLocaleString()} / {max.toLocaleString()}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-gray-100">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(percent, 100)}%` }} />
      </div>
    </div>
  )
}

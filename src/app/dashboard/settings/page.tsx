'use client'

import { useState, useEffect } from 'react'
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
import {
  Mail,
  Plus,
  TestTube,
  Trash2,
  RefreshCw,
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
  tenant: { id: string; name: string; plan: string; expiresAt: string | null; createdAt: string }
  limits: { maxContacts: number; maxUsers: number; maxEmailsPerDay: number }
  usage: {
    contactCount: number; userCount: number; emailsSentToday: number; campaignCount: number
    contactPercent: number; emailPercent: number; userPercent: number
  }
  members: Array<{ id: string; email: string; name: string | null; role: string; avatar: string | null; createdAt: string }>
  invitations: Array<{ id: string; email: string; role: string; createdAt: string; expiresAt: string }>
}

const PLAN_LABELS: Record<string, string> = { FREE: '免费版', BASIC: '基础版', PRO: '专业版', ENTERPRISE: '企业版' }
const PLAN_COLORS: Record<string, string> = { FREE: 'bg-gray-100 text-gray-700', BASIC: 'bg-blue-100 text-blue-700', PRO: 'bg-purple-100 text-purple-700', ENTERPRISE: 'bg-amber-100 text-amber-700' }

export default function SettingsPage() {
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
  const [selectedPlan, setSelectedPlan] = useState('')
  const [upgradingPlan, setUpgradingPlan] = useState(false)

  // J1: DNS 记录
  const [dnsAccountId, setDnsAccountId] = useState<string | null>(null)
  const [dnsData, setDnsData] = useState<{ domain: string; records: Array<{ type: string; host: string; value: string; description: string; status: string }>; tips: string[] } | null>(null)
  const [dnsLoading, setDnsLoading] = useState(false)

  // 加载邮件账户列表
  const loadAccounts = async () => {
    try {
      const res = await fetch('/api/email-accounts')
      const data = await res.json()
      if (data.success) {
        setAccounts(data.data)
      }
    } catch (error) {
      toast.error('加载账户失败')
    } finally {
      setLoading(false)
    }
  }

  // #46: 加载租户用量
  const loadTenantUsage = async () => {
    try {
      const res = await fetch('/api/tenant/usage')
      const data = await res.json()
      if (data.success) setTenantData(data.data)
      if (data.success && data.data?.tenant?.plan) setSelectedPlan(data.data.tenant.plan)
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
        toast.success(`邀请已发送至 ${inviteEmail}`)
        setInviteEmail('')
        loadTenantUsage()
      } else {
        toast.error(data.error?.message || data.error || '邀请失败')
      }
    } catch { toast.error('邀请失败') } finally { setInviting(false) }
  }

  // I1: 套餐变更（需 settings:manage 权限）
  const handleUpgradePlan = async () => {
    if (!selectedPlan || selectedPlan === tenantData?.tenant.plan) return
    setUpgradingPlan(true)
    try {
      const res = await fetch('/api/tenant/usage', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: selectedPlan }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`套餐已切换为 ${PLAN_LABELS[selectedPlan] || selectedPlan}`)
        await loadTenantUsage()
      } else {
        toast.error(data.error?.message || '套餐变更失败')
      }
    } catch {
      toast.error('套餐变更失败')
    } finally {
      setUpgradingPlan(false)
    }
  }

  // H3d: 撤销邀请
  const handleRevokeInvite = async (inviteId: string) => {
    try {
      const res = await fetch(`/api/tenant/invite?id=${inviteId}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        toast.success('邀请已撤销')
        loadTenantUsage()
      } else {
        toast.error(data.error?.message || '撤销失败')
      }
    } catch { toast.error('撤销失败') }
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

  useEffect(() => {
    loadAccounts()
    loadTenantUsage()
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

                    <div className="flex flex-wrap items-end gap-2 border-t border-gray-100 pt-4">
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-500">切换套餐（管理员）</Label>
                        <select
                          value={selectedPlan || tenantData.tenant.plan}
                          onChange={(e) => setSelectedPlan(e.target.value)}
                          className="h-9 rounded-md border border-gray-200 bg-white px-3 text-sm"
                        >
                          {Object.entries(PLAN_LABELS).map(([key, label]) => (
                            <option key={key} value={key}>{label}</option>
                          ))}
                        </select>
                      </div>
                      <Button
                        size="sm"
                        disabled={upgradingPlan || selectedPlan === tenantData.tenant.plan}
                        onClick={handleUpgradePlan}
                      >
                        {upgradingPlan ? '保存中...' : '应用套餐'}
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

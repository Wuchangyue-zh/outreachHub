'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
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
} from 'lucide-react'

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
  isActive: boolean
  dailySent: number
  dailyLimit: number
  healthScore: number
  createdAt: string
}

export default function SettingsPage() {
  const [accounts, setAccounts] = useState<EmailAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [testEmail, setTestEmail] = useState('')
  const [formData, setFormData] = useState({
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
  })

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

  useEffect(() => {
    loadAccounts()
  }, [])

  // 添加新账户
  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/email-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('账户添加成功')
        setShowAddForm(false)
        setFormData({
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
        })
        loadAccounts()
      } else {
        toast.error(data.error || '添加失败')
      }
    } catch (error) {
      toast.error('添加账户失败')
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
              <Button onClick={() => setShowAddForm(!showAddForm)}>
                <Plus className="mr-2 h-4 w-4" />
                {showAddForm ? '取消' : '添加账户'}
              </Button>
            </div>

            {/* 添加账户表单 */}
            {showAddForm && (
              <Card>
                <CardHeader>
                  <CardTitle>添加邮件账户</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAddAccount} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* 基本信息 */}
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

                      {/* SMTP 配置 */}
                      <div className="space-y-2">
                        <Label htmlFor="smtpHost">SMTP 服务器 *</Label>
                        <Input
                          id="smtpHost"
                          value={formData.smtpHost}
                          onChange={(e) => setFormData({ ...formData, smtpHost: e.target.value })}
                          placeholder="smtp.gmail.com"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="smtpPort">SMTP 端口 *</Label>
                        <Input
                          id="smtpPort"
                          type="number"
                          value={formData.smtpPort}
                          onChange={(e) => setFormData({ ...formData, smtpPort: e.target.value })}
                          placeholder="587"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="smtpUser">SMTP 用户名 *</Label>
                        <Input
                          id="smtpUser"
                          value={formData.smtpUser}
                          onChange={(e) => setFormData({ ...formData, smtpUser: e.target.value })}
                          placeholder="your@email.com"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="smtpPassword">SMTP 密码 *</Label>
                        <Input
                          id="smtpPassword"
                          type="password"
                          value={formData.smtpPassword}
                          onChange={(e) => setFormData({ ...formData, smtpPassword: e.target.value })}
                          placeholder="应用专用密码"
                          required
                        />
                      </div>

                      {/* IMAP 配置（可选） */}
                      <div className="space-y-2">
                        <Label htmlFor="imapHost">IMAP 服务器（可选）</Label>
                        <Input
                          id="imapHost"
                          value={formData.imapHost}
                          onChange={(e) => setFormData({ ...formData, imapHost: e.target.value })}
                          placeholder="imap.gmail.com"
                        />
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
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                        取消
                      </Button>
                      <Button type="submit">保存账户</Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

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
                                <Badge variant="default" className="bg-green-100 text-green-700">
                                  <CheckCircle className="mr-1 h-3 w-3" />
                                  活跃
                                </Badge>
                              ) : (
                                <Badge variant="secondary">
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
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
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

          {/* 通用设置 */}
          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>通用设置</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">通用设置功能开发中...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}

'use client'

import { useState, useEffect, useCallback } from 'react'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AvatarUpload } from '@/components/AvatarUpload'
import { Mail, Plus, Trash2, Check, X } from 'lucide-react'

interface EmailAccount {
  id: string
  email: string
  displayName: string
  smtpHost: string
  smtpPort: number
  smtpUser: string
  smtpPassword: string
  imapHost?: string | null
  imapPort?: number | null
  imapUser?: string | null
  imapPassword?: string | null
  isActive: boolean
  dailySent: number
  dailyLimit: number
  healthScore: number
}

interface UserProfile {
  id: string
  email: string
  name: string | null
  avatar: string | null
  role: string
}

export default function SettingsPage() {
  // Profile
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [profileName, setProfileName] = useState('')
  const [profileAvatar, setProfileAvatar] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)

  // Email accounts
  const [accounts, setAccounts] = useState<EmailAccount[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
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
  const [savingAccount, setSavingAccount] = useState(false)

  // Load profile
  useEffect(() => {
    fetch('/api/users/me')
      .then((r) => r.json())
      .then((j) => {
        if (j.success) {
          setProfile(j.data)
          setProfileName(j.data.name || '')
          setProfileAvatar(j.data.avatar || '')
        }
      })
      .catch(console.error)
  }, [])

  // Load email accounts
  const fetchAccounts = useCallback(async () => {
    try {
      setLoadingAccounts(true)
      const res = await fetch('/api/email-accounts')
      const json = await res.json()
      if (json.success) setAccounts(json.data)
    } catch (e) {
      console.error('Failed to fetch email accounts:', e)
    } finally {
      setLoadingAccounts(false)
    }
  }, [])

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  // Save profile
  const handleSaveProfile = async () => {
    setSavingProfile(true)
    try {
      const res = await fetch('/api/users/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: profileName }),
      })
      const json = await res.json()
      if (json.success) {
        setProfile(json.data)
        alert('个人资料已保存')
      }
    } catch (e) {
      console.error('Failed to save profile:', e)
    } finally {
      setSavingProfile(false)
    }
  }

  // Handle avatar upload — update User.avatar
  const handleAvatarUpload = async (url: string) => {
    setProfileAvatar(url)
    try {
      await fetch('/api/users/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar: url }),
      })
    } catch (e) {
      console.error('Failed to save avatar:', e)
    }
  }

  // Add email account
  const addAccount = async () => {
    if (!form.email || !form.smtpHost || !form.smtpUser || !form.smtpPassword) return
    setSavingAccount(true)
    try {
      const res = await fetch('/api/email-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          displayName: form.displayName || form.email.split('@')[0],
          smtpHost: form.smtpHost,
          smtpPort: parseInt(form.smtpPort) || 587,
          smtpUser: form.smtpUser,
          smtpPassword: form.smtpPassword,
          imapHost: form.imapHost || null,
          imapPort: form.imapPort ? parseInt(form.imapPort) : null,
          imapUser: form.imapUser || null,
          imapPassword: form.imapPassword || null,
        }),
      })
      const json = await res.json()
      if (json.success) {
        setAccounts((prev) => [json.data, ...prev])
        setShowForm(false)
        setForm({ email: '', displayName: '', smtpHost: '', smtpPort: '587', smtpUser: '', smtpPassword: '', imapHost: '', imapPort: '993', imapUser: '', imapPassword: '' })
      }
    } catch (e) {
      console.error('Failed to add email account:', e)
    } finally {
      setSavingAccount(false)
    }
  }

  // Toggle account active
  const toggleAccount = async (id: string, isActive: boolean) => {
    try {
      const res = await fetch(`/api/email-accounts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      })
      const json = await res.json()
      if (json.success) {
        setAccounts((prev) => prev.map((a) => (a.id === id ? json.data : a)))
      }
    } catch (e) {
      console.error('Failed to toggle account:', e)
    }
  }

  // Delete account
  const deleteAccount = async (id: string) => {
    if (!confirm('确定要删除这个邮箱账户吗？')) return
    try {
      await fetch(`/api/email-accounts/${id}`, { method: 'DELETE' })
      setAccounts((prev) => prev.filter((a) => a.id !== id))
    } catch (e) {
      console.error('Failed to delete account:', e)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Profile section */}
        <Card className="border-gray-100">
          <CardHeader>
            <CardTitle className="text-base">个人资料</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-6">
            <AvatarUpload size="lg" onUpload={handleAvatarUpload} />
            <div className="flex-1 space-y-4">
              <div>
                <Label>显示名称</Label>
                <Input
                  placeholder="Your Name"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                />
              </div>
              <div>
                <Label>邮箱</Label>
                <Input value={profile?.email || ''} disabled />
              </div>
              <Button onClick={handleSaveProfile} disabled={savingProfile}>
                {savingProfile ? '保存中...' : '保存修改'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">邮箱设置</h1>
            <p className="text-sm text-gray-500">配置用于发送邮件的邮箱账户</p>
          </div>
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <Plus className="h-4 w-4" /> 添加邮箱
          </Button>
        </div>

        {/* Add email form */}
        {showForm && (
          <Card className="border-gray-100">
            <CardHeader>
              <CardTitle className="text-base">添加邮箱账户</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>邮箱地址</Label>
                  <Input
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="you@company.com"
                  />
                </div>
                <div>
                  <Label>显示名称</Label>
                  <Input
                    value={form.displayName}
                    onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                    placeholder="发件人名称"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>SMTP服务器</Label>
                  <Input
                    value={form.smtpHost}
                    onChange={(e) => setForm({ ...form, smtpHost: e.target.value })}
                    placeholder="smtp.gmail.com"
                  />
                </div>
                <div>
                  <Label>端口</Label>
                  <Input
                    value={form.smtpPort}
                    onChange={(e) => setForm({ ...form, smtpPort: e.target.value })}
                  />
                </div>
                <div>
                  <Label>SMTP用户名</Label>
                  <Input
                    value={form.smtpUser}
                    onChange={(e) => setForm({ ...form, smtpUser: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>SMTP密码 / 应用专用密码</Label>
                <Input
                  type="password"
                  value={form.smtpPassword}
                  onChange={(e) => setForm({ ...form, smtpPassword: e.target.value })}
                  placeholder="输入密码或应用专用密码"
                />
              </div>

              {/* IMAP section (optional) */}
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-gray-600 mb-3">IMAP 收信配置（可选）</p>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <Label>IMAP服务器</Label>
                    <Input
                      value={form.imapHost}
                      onChange={(e) => setForm({ ...form, imapHost: e.target.value })}
                      placeholder="imap.gmail.com"
                    />
                  </div>
                  <div>
                    <Label>IMAP端口</Label>
                    <Input
                      value={form.imapPort}
                      onChange={(e) => setForm({ ...form, imapPort: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>IMAP用户名</Label>
                    <Input
                      value={form.imapUser}
                      onChange={(e) => setForm({ ...form, imapUser: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>IMAP密码</Label>
                    <Input
                      type="password"
                      value={form.imapPassword}
                      onChange={(e) => setForm({ ...form, imapPassword: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowForm(false)}>取消</Button>
                <Button onClick={addAccount} disabled={savingAccount}>
                  {savingAccount ? '保存中...' : '保存'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Email accounts list */}
        {loadingAccounts ? (
          <Card className="border-gray-100">
            <CardContent className="flex items-center justify-center py-8">
              <p className="text-gray-400">加载中...</p>
            </CardContent>
          </Card>
        ) : accounts.length === 0 ? (
          <Card className="border-gray-100">
            <CardContent className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Mail className="mb-4 h-16 w-16 text-gray-300" />
              <p className="text-lg font-medium">暂无邮箱账户</p>
              <p className="text-sm">添加用于发送邮件的邮箱账户</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {accounts.map((account) => (
              <Card key={account.id} className="border-gray-100">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Mail className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{account.email}</p>
                      <p className="text-xs text-gray-500">
                        今日发送 {account.dailySent}/{account.dailyLimit} | 健康度 {account.healthScore}%
                        {account.smtpHost && ` | SMTP: ${account.smtpHost}:${account.smtpPort}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleAccount(account.id, !account.isActive)}
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs cursor-pointer transition-colors ${account.isActive ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                    >
                      {account.isActive ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                      {account.isActive ? '启用' : '禁用'}
                    </button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400" onClick={() => deleteAccount(account.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Tips */}
        <Card className="border-gray-100 bg-amber-50">
          <CardContent className="p-4">
            <h3 className="font-medium text-amber-800">邮箱配置提示</h3>
            <ul className="mt-2 space-y-1 text-sm text-amber-700">
              <li>• Gmail 用户需要使用"应用专用密码"而非登录密码</li>
              <li>• 建议每日发送不超过50封/邮箱，避免被标记为垃圾邮件</li>
              <li>• 可以添加多个邮箱账户，系统会自动轮换使用</li>
              <li>• 定期检查邮箱健康度，低于80分建议暂停发送</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

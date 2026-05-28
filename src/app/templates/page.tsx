'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import {
  FileText, Plus, Edit, Trash2, X, Loader2, Wand2, Copy, Eye
} from 'lucide-react'

interface Template {
  id: string
  name: string
  subject: string
  content: string
  category: string
  language: string
  variables: string[]
  isAiGenerated: boolean
  usageCount: number
  successRate: number | null
  createdAt: string
}

export default function TemplatesPage() {
  const { addToast } = useToast()
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [currentTemplate, setCurrentTemplate] = useState<Template | null>(null)
  const [saving, setSaving] = useState(false)
  const [aiGenerating, setAiGenerating] = useState(false)
  const [language, setLanguage] = useState('en')

  const [form, setForm] = useState({
    name: '',
    subject: '',
    content: '',
    category: 'cold-outreach',
    language: 'en',
    variables: '',
  })

  useEffect(() => {
    fetchTemplates()
  }, [language])

  async function fetchTemplates() {
    setLoading(true)
    try {
      const res = await fetch(`/api/templates?language=${language}`)
      const data = await res.json()
      if (data.success) {
        setTemplates(data.data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setForm({ name: '', subject: '', content: '', category: 'cold-outreach', language: 'en', variables: '' })
  }

  const openAddDialog = () => {
    resetForm()
    setCurrentTemplate(null)
    setShowDialog(true)
  }

  const openEditDialog = (template: Template) => {
    setCurrentTemplate(template)
    setForm({
      name: template.name,
      subject: template.subject,
      content: template.content,
      category: template.category,
      language: template.language,
      variables: template.variables.join(', '),
    })
    setShowDialog(true)
  }

  const openPreview = (template: Template) => {
    setCurrentTemplate(template)
    setShowPreview(true)
  }

  const handleSave = async () => {
    if (!form.name || !form.subject || !form.content) {
      addToast({ type: 'error', title: '请填写必填项' })
      return
    }

    setSaving(true)
    try {
      const url = currentTemplate ? `/api/templates/${currentTemplate.id}` : '/api/templates'
      const method = currentTemplate ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          variables: form.variables.split(',').map(v => v.trim()).filter(Boolean),
        }),
      })

      const data = await res.json()
      if (data.success) {
        addToast({ type: 'success', title: currentTemplate ? '更新成功' : '创建成功' })
        setShowDialog(false)
        fetchTemplates()
      } else {
        addToast({ type: 'error', title: '操作失败', description: data.error })
      }
    } catch (e) {
      addToast({ type: 'error', title: '操作失败' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除此模板吗？')) return

    try {
      const res = await fetch(`/api/templates/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        addToast({ type: 'success', title: '删除成功' })
        fetchTemplates()
      }
    } catch (e) {
      addToast({ type: 'error', title: '删除失败' })
    }
  }

  const handleAIGenerate = async () => {
    if (!form.name) {
      addToast({ type: 'error', title: '请先填写模板名称' })
      return
    }

    setAiGenerating(true)
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'generate-email',
          data: {
            contactName: '{{firstName}}',
            contactTitle: '{{title}}',
            companyName: '{{companyName}}',
            productDescription: form.name,
            language: form.language,
            purpose: form.category as any,
          },
        }),
      })

      const data = await res.json()
      if (data.success) {
        setForm({
          ...form,
          subject: data.data.subject,
          content: data.data.content,
        })
        addToast({ type: 'success', title: 'AI生成成功' })
      } else {
        addToast({ type: 'error', title: 'AI生成失败', description: data.error })
      }
    } catch (e) {
      addToast({ type: 'error', title: 'AI生成失败' })
    } finally {
      setAiGenerating(false)
    }
  }

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content)
    addToast({ type: 'success', title: '已复制到剪贴板' })
  }

  const categoryLabels: Record<string, string> = {
    'cold-outreach': '冷邮件',
    'follow-up': '跟进',
    'introduction': '介绍',
    'promotion': '促销',
    'meeting-request': '会议邀请',
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">邮件模板</h1>
            <p className="text-sm text-gray-500">管理邮件模板，支持AI生成</p>
          </div>
          <div className="flex gap-2">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="en">English</option>
              <option value="zh">中文</option>
              <option value="de">Deutsch</option>
              <option value="fr">Français</option>
              <option value="es">Español</option>
            </select>
            <Button className="gap-2" onClick={openAddDialog}>
              <Plus className="h-4 w-4" /> 新建模板
            </Button>
          </div>
        </div>

        {/* Templates Grid */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="border-gray-100">
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
                    <div className="h-20 bg-gray-200 rounded animate-pulse" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : templates.length === 0 ? (
          <Card className="border-gray-100">
            <CardContent className="flex flex-col items-center justify-center py-16 text-gray-400">
              <FileText className="mb-4 h-16 w-16 text-gray-300" />
              <p className="text-lg font-medium">暂无模板</p>
              <p className="text-sm mt-1">创建您的第一个邮件模板，或使用AI生成</p>
              <Button className="mt-4 gap-2" onClick={openAddDialog}>
                <Plus className="h-4 w-4" /> 新建模板
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <Card key={template.id} className="border-gray-100 hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{template.name}</h3>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                        {categoryLabels[template.category] || template.category}
                      </span>
                    </div>
                    {template.isAiGenerated && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded flex items-center gap-1">
                        <Wand2 className="h-3 w-3" /> AI
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-gray-700 mb-2">主题：{template.subject}</p>
                  <p className="text-sm text-gray-500 line-clamp-3">{template.content}</p>
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <div className="text-xs text-gray-400">
                      使用 {template.usageCount} 次
                      {template.successRate !== null && ` | 打开率 ${(template.successRate * 100).toFixed(1)}%`}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openPreview(template)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(template)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleDelete(template.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">{currentTemplate ? '编辑模板' : '新建模板'}</h2>
              <button onClick={() => setShowDialog(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>模板名称 *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="如：冷邮件 - 产品介绍"
                  />
                </div>
                <div>
                  <Label>分类</Label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="cold-outreach">冷邮件</option>
                    <option value="follow-up">跟进</option>
                    <option value="introduction">介绍</option>
                    <option value="promotion">促销</option>
                    <option value="meeting-request">会议邀请</option>
                  </select>
                </div>
              </div>
              <div>
                <Label>邮件主题 *</Label>
                <Input
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  placeholder="如：Quick question about {{companyName}}"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>邮件内容 *</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAIGenerate}
                    disabled={aiGenerating}
                    className="gap-1"
                  >
                    {aiGenerating ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Wand2 className="h-3 w-3" />
                    )}
                    AI生成
                  </Button>
                </div>
                <Textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  placeholder="输入邮件内容，支持变量如 {{firstName}}, {{companyName}}"
                  rows={12}
                  className="font-mono text-sm"
                />
              </div>
              <div>
                <Label>可用变量（逗号分隔）</Label>
                <Input
                  value={form.variables}
                  onChange={(e) => setForm({ ...form, variables: e.target.value })}
                  placeholder="如：firstName, companyName, title"
                />
                <p className="text-xs text-gray-400 mt-1">
                  在邮件内容中使用 {'{{变量名}}'} 格式插入变量
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t">
              <Button variant="outline" onClick={() => setShowDialog(false)}>取消</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {currentTemplate ? '保存修改' : '创建模板'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Dialog */}
      {showPreview && currentTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">模板预览</h2>
              <button onClick={() => setShowPreview(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="border rounded-lg p-6 bg-gray-50">
                <div className="mb-4 pb-4 border-b">
                  <p className="text-sm text-gray-500">主题</p>
                  <p className="font-medium">{currentTemplate.subject}</p>
                </div>
                <div className="whitespace-pre-wrap text-sm text-gray-700">
                  {currentTemplate.content}
                </div>
              </div>
              {currentTemplate.variables.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">可用变量：</p>
                  <div className="flex flex-wrap gap-2">
                    {currentTemplate.variables.map((v, i) => (
                      <code key={i} className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {'{{' + v + '}}'}
                      </code>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 p-6 border-t">
              <Button variant="outline" onClick={() => handleCopy(currentTemplate.content)}>
                <Copy className="h-4 w-4 mr-2" /> 复制内容
              </Button>
              <Button onClick={() => { setShowPreview(false); openEditDialog(currentTemplate) }}>
                <Edit className="h-4 w-4 mr-2" /> 编辑
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}

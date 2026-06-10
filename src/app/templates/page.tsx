'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import { useI18n } from '@/hooks/use-i18n'
import {
  FileText, Plus, Edit, Trash2, X, Loader2, Wand2, Copy, Eye,
  Languages, Sparkles, Filter, BarChart3
} from 'lucide-react'
import { LANGUAGES, getLanguageLabel } from '@/lib/i18n/languages'

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
  const { t } = useI18n()
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [currentTemplate, setCurrentTemplate] = useState<Template | null>(null)
  const [saving, setSaving] = useState(false)
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiPolishing, setAiPolishing] = useState(false)
  const [aiTranslating, setAiTranslating] = useState(false)
  const [aiSubjects, setAiSubjects] = useState<string[]>([])
  const [generatingSubjects, setGeneratingSubjects] = useState(false)
  const [language, setLanguage] = useState('en')
  const [categoryFilter, setCategoryFilter] = useState('')

  const [form, setForm] = useState({
    name: '',
    subject: '',
    content: '',
    category: 'cold-outreach',
    language: 'en',
    variables: '',
  })

  const categoryLabels: Record<string, string> = {
    '': '全部分类',
    'cold-outreach': '冷邮件',
    'follow-up': '跟进',
    'introduction': '介绍',
    'promotion': '促销',
    'meeting-request': '会议邀请',
  }

  const languageLabels: Record<string, string> = Object.fromEntries(
    LANGUAGES.map((l) => [l.code, l.nativeName])
  )

  useEffect(() => {
    fetchTemplates()
  }, [language, categoryFilter])

  async function fetchTemplates() {
    setLoading(true)
    try {
      const params = new URLSearchParams({ language })
      if (categoryFilter) params.set('category', categoryFilter)
      const res = await fetch(`/api/templates?${params}`)
      const data = await res.json()
      if (data.success) {
        setTemplates(data.data)
      } else {
        addToast({ type: 'error', title: '加载失败', description: data.error?.message || '无法加载模板列表' })
      }
<<<<<<< HEAD
    } catch (e) {
      console.error(e)
      addToast({ type: 'error', title: t('common.loadFailed') })
=======
    } catch {
      addToast({ type: 'error', title: '加载失败', description: '无法加载模板列表，请稍后重试' })
>>>>>>> feat/landing-page
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
      addToast({ type: 'error', title: t('common.fillRequired') })
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
        addToast({ type: 'success', title: currentTemplate ? t('templates.updateSuccess') : t('templates.createSuccess') })
        setShowDialog(false)
        fetchTemplates()
      } else {
        addToast({ type: 'error', title: t('common.operationFailed'), description: data.error })
      }
    } catch (e) {
      addToast({ type: 'error', title: t('common.operationFailed') })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t('templates.confirmDelete'))) return

    try {
      const res = await fetch(`/api/templates/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        addToast({ type: 'success', title: t('common.deleteSuccess') })
        fetchTemplates()
      }
    } catch (e) {
      addToast({ type: 'error', title: t('common.deleteFailed') })
    }
  }

  const handleAIGenerate = async () => {
    if (!form.name) {
      addToast({ type: 'error', title: t('templates.fillNameFirst') })
      return
    }

    setAiGenerating(true)
    setAiSubjects([])
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
        addToast({ type: 'success', title: t('templates.aiSuccess') })
      } else {
        addToast({ type: 'error', title: t('templates.aiFailed'), description: data.error })
      }
    } catch (e) {
      addToast({ type: 'error', title: t('templates.aiFailed') })
    } finally {
      setAiGenerating(false)
    }
  }

  // #50: AI 生成主题行备选
  const handleGenerateSubjects = async () => {
    if (!form.name || !form.content) {
      addToast({ type: 'error', title: '请先填写模板名称和内容' })
      return
    }

    setGeneratingSubjects(true)
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'generate-subject',
          data: {
            productDescription: form.name,
            emailContent: form.content,
            language: form.language,
          },
        }),
      })

      const data = await res.json()
      if (data.success && Array.isArray(data.data)) {
        setAiSubjects(data.data)
        addToast({ type: 'success', title: `生成了 ${data.data.length} 个主题行` })
      } else {
        addToast({ type: 'error', title: '生成失败', description: data.error })
      }
    } catch (e) {
      addToast({ type: 'error', title: '生成主题行失败' })
    } finally {
      setGeneratingSubjects(false)
    }
  }

  // #50: AI 润色/改写
  const handlePolish = async () => {
    if (!form.content) {
      addToast({ type: 'error', title: '请先填写邮件内容' })
      return
    }

    setAiPolishing(true)
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'polish-email',
          data: {
            content: form.content,
            language: form.language,
          },
        }),
      })

      const data = await res.json()
      if (data.success) {
        setForm({ ...form, content: data.data.content })
        addToast({ type: 'success', title: '润色完成' })
      } else {
        addToast({ type: 'error', title: '润色失败', description: data.error })
      }
    } catch (e) {
      addToast({ type: 'error', title: '润色失败' })
    } finally {
      setAiPolishing(false)
    }
  }

  // #50: AI 翻译
  const handleTranslate = async (targetLang: string) => {
    if (!form.content) {
      addToast({ type: 'error', title: '请先填写邮件内容' })
      return
    }

    setAiTranslating(true)
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'translate-email',
          data: {
            content: form.content,
            targetLanguage: targetLang,
          },
        }),
      })

      const data = await res.json()
      if (data.success) {
        setForm({ ...form, content: data.data.content, language: targetLang })
        addToast({ type: 'success', title: `已翻译为 ${languageLabels[targetLang] || targetLang}` })
      } else {
        addToast({ type: 'error', title: '翻译失败', description: data.error })
      }
    } catch (e) {
      addToast({ type: 'error', title: '翻译失败' })
    } finally {
      setAiTranslating(false)
    }
  }

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content)
    addToast({ type: 'success', title: t('templates.copied') })
  }

<<<<<<< HEAD
  const categoryLabels: Record<string, string> = {
    'cold-outreach': t('templates.category.coldOutreach'),
    'follow-up': t('templates.category.followUp'),
    'introduction': t('templates.category.introduction'),
    'promotion': t('templates.category.promotion'),
    'meeting-request': t('templates.category.meetingRequest'),
  }
=======
  // #51: Category stats
  const categoryStats = templates.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + 1
    return acc
  }, {} as Record<string, number>)
>>>>>>> feat/landing-page

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
<<<<<<< HEAD
            <h1 className="text-2xl font-bold text-gray-900">{t('templates.title')}</h1>
            <p className="text-sm text-gray-500">{t('templates.subtitle')}</p>
=======
            <h1 className="text-2xl font-bold text-gray-900">邮件模板</h1>
            <p className="text-sm text-gray-500">管理邮件模板，支持 AI 生成、润色、翻译</p>
>>>>>>> feat/landing-page
          </div>
          <div className="flex gap-2">
            {/* #51: Category filter */}
            <div className="flex items-center gap-1">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                {Object.entries(categoryLabels).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>{l.nativeName}</option>
              ))}
            </select>
            <Button className="gap-2" onClick={openAddDialog}>
              <Plus className="h-4 w-4" /> {t('templates.create')}
            </Button>
          </div>
        </div>

        {/* #51: Category stats bar */}
        {templates.length > 0 && !categoryFilter && (
          <div className="flex gap-2 flex-wrap">
            {Object.entries(categoryStats).map(([cat, count]) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
              >
                <BarChart3 className="h-3 w-3 text-gray-400" />
                <span className="text-gray-600">{categoryLabels[cat] || cat}</span>
                <span className="font-semibold text-gray-900">{count}</span>
              </button>
            ))}
          </div>
        )}

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
              <p className="text-lg font-medium">{t('templates.noData')}</p>
              <p className="text-sm mt-1">{t('templates.noDataHint')}</p>
              <Button className="mt-4 gap-2" onClick={openAddDialog}>
                <Plus className="h-4 w-4" /> {t('templates.create')}
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
                  <p className="text-sm font-medium text-gray-700 mb-2">{t('templates.subjectLabel')}{template.subject}</p>
                  <p className="text-sm text-gray-500 line-clamp-3">{template.content}</p>
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <div className="text-xs text-gray-400">
                      {t('templates.usageCount').replace('{n}', template.usageCount.toString())}
                      {template.successRate !== null && ` | ${t('templates.openRate').replace('{n}', (template.successRate * 100).toFixed(1))}`}
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
              <h2 className="text-lg font-semibold">{currentTemplate ? t('templates.editTemplate') : t('templates.create')}</h2>
              <button onClick={() => setShowDialog(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('templates.form.name')} *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder={t('templates.form.namePlaceholder')}
                  />
                </div>
                <div>
                  <Label>{t('templates.form.category')}</Label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="cold-outreach">{t('templates.category.coldOutreach')}</option>
                    <option value="follow-up">{t('templates.category.followUp')}</option>
                    <option value="introduction">{t('templates.category.introduction')}</option>
                    <option value="promotion">{t('templates.category.promotion')}</option>
                    <option value="meeting-request">{t('templates.category.meetingRequest')}</option>
                  </select>
                </div>
              </div>
              <div>
                <Label>{t('templates.form.subject')} *</Label>
                <Input
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  placeholder={t('templates.form.subjectPlaceholder')}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
<<<<<<< HEAD
                  <Label>{t('templates.form.content')} *</Label>
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
                    {t('templates.aiGenerate')}
                  </Button>
=======
                  <Label>邮件内容 *</Label>
                  <div className="flex gap-1">
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
                      AI 生成
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePolish}
                      disabled={aiPolishing || !form.content}
                      className="gap-1"
                    >
                      {aiPolishing ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Sparkles className="h-3 w-3" />
                      )}
                      润色
                    </Button>
                    <div className="relative group">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={aiTranslating || !form.content}
                        className="gap-1"
                      >
                        {aiTranslating ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Languages className="h-3 w-3" />
                        )}
                        翻译
                      </Button>
                      <div className="absolute right-0 top-full mt-1 hidden group-hover:block z-10 bg-white border rounded-lg shadow-lg py-1 min-w-[120px]">
                        {Object.entries(languageLabels).map(([code, label]) => (
                          <button
                            key={code}
                            onClick={() => handleTranslate(code)}
                            className="block w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50"
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
>>>>>>> feat/landing-page
                </div>
                <Textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  placeholder={t('templates.form.contentPlaceholder')}
                  rows={12}
                  className="font-mono text-sm"
                />
              </div>

              {/* Subject line suggestions */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>邮件主题 *</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleGenerateSubjects}
                    disabled={generatingSubjects || !form.content}
                    className="gap-1 text-xs text-gray-500"
                  >
                    {generatingSubjects ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Sparkles className="h-3 w-3" />
                    )}
                    AI 推荐主题
                  </Button>
                </div>
                <Input
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  placeholder="如：Quick question about {{companyName}}"
                />
                {aiSubjects.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="text-xs text-gray-400">点击选择推荐主题：</p>
                    {aiSubjects.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => { setForm({ ...form, subject: s }); setAiSubjects([]) }}
                        className="block w-full text-left text-sm px-3 py-1.5 rounded border border-gray-100 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <Label>{t('templates.form.variables')}</Label>
                <Input
                  value={form.variables}
                  onChange={(e) => setForm({ ...form, variables: e.target.value })}
                  placeholder={t('templates.form.variablesPlaceholder')}
                />
                <p className="text-xs text-gray-400 mt-1">
                  {t('templates.form.variablesHint')}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t">
              <Button variant="outline" onClick={() => setShowDialog(false)}>{t('common.cancel')}</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {currentTemplate ? t('common.save') : t('templates.create')}
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
              <h2 className="text-lg font-semibold">{t('templates.preview')}</h2>
              <button onClick={() => setShowPreview(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="border rounded-lg p-6 bg-gray-50">
                <div className="mb-4 pb-4 border-b">
                  <p className="text-sm text-gray-500">{t('templates.subject')}</p>
                  <p className="font-medium">{currentTemplate.subject}</p>
                </div>
                <div className="whitespace-pre-wrap text-sm text-gray-700">
                  {currentTemplate.content}
                </div>
              </div>
              {currentTemplate.variables.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">{t('templates.availableVariables')}</p>
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
                <Copy className="h-4 w-4 mr-2" /> {t('templates.copyContent')}
              </Button>
              <Button onClick={() => { setShowPreview(false); openEditDialog(currentTemplate) }}>
                <Edit className="h-4 w-4 mr-2" /> {t('common.edit')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}

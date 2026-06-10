'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle, Calendar, Mail, Phone } from 'lucide-react'
import { toast } from 'sonner'

export default function DemoPage() {
  const [form, setForm] = useState({ name: '', email: '', company: '', phone: '', message: '' })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.email) {
      toast.error('请填写姓名和邮箱')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.success) {
        setSubmitted(true)
      } else {
        toast.error(data.error?.message || '提交失败')
      }
    } catch {
      toast.error('网络错误，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
        <Card className="mx-4 max-w-md">
          <CardContent className="p-8 text-center">
            <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
            <h1 className="mt-4 text-2xl font-bold">预约成功！</h1>
            <p className="mt-2 text-gray-600">我们的销售团队将在 24 小时内与您联系，为您安排产品演示。</p>
            <Link href="/" className="mt-6 inline-block">
              <Button variant="outline">返回首页</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
      <header className="border-b">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-xl font-bold">OutreachHub</Link>
          <Link href="/login" className="text-sm text-gray-500 hover:text-gray-700">登录</Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-16">
        <div className="text-center">
          <Calendar className="mx-auto h-12 w-12 text-primary" />
          <h1 className="mt-4 text-3xl font-bold">预约产品演示</h1>
          <p className="mt-3 text-gray-600">了解 OutreachHub 如何帮助您的团队提升外贸拓客效率</p>
        </div>

        <Card className="mt-10">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium">姓名 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="您的姓名"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">邮箱 <span className="text-red-500">*</span></label>
                <input
                  type="email"
                  required
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="work@company.com"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium">公司名称</label>
                  <input
                    type="text"
                    className="mt-1 w-full rounded-lg border px-3 py-2"
                    value={form.company}
                    onChange={(e) => setForm({ ...form, company: e.target.value })}
                    placeholder="您的公司"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">联系电话</label>
                  <input
                    type="tel"
                    className="mt-1 w-full rounded-lg border px-3 py-2"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="138-0000-0000"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium">备注</label>
                <textarea
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  rows={3}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="您最关注的功能或问题（可选）"
                />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />提交中...</> : '提交预约'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>也可以直接联系我们：</p>
          <div className="mt-2 flex items-center justify-center gap-4">
            <span className="flex items-center gap-1"><Mail className="h-4 w-4" /> sales@outreachhub.com</span>
            <span className="flex items-center gap-1"><Phone className="h-4 w-4" /> 400-888-6688</span>
          </div>
        </div>
      </main>
    </div>
  )
}

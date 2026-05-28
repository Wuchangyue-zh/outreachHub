'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Mail, Loader2, CheckCircle, XCircle } from 'lucide-react'

export default function EmailTestPage() {
  const [to, setTo] = useState('734151319@qq.com')
  const [subject, setSubject] = useState('OutreachHub 邮件发送测试')
  const [content, setContent] = useState('这是一封来自 OutreachHub 平台的测试邮件，验证SMTP配置是否正常工作。如果您收到此邮件，说明邮件发送功能已配置成功。')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const handleSend = async () => {
    if (!to) return
    setSending(true)
    setResult(null)

    try {
      const res = await fetch('/api/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, subject, content }),
      })

      const data = await res.json()
      if (data.success) {
        setResult({ success: true, message: `邮件发送成功！Message ID: ${data.messageId}` })
      } else {
        setResult({ success: false, message: `邮件发送失败: ${data.error}` })
      }
    } catch (e: any) {
      setResult({ success: false, message: `网络错误: ${e.message}` })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <Card className="w-full max-w-xl border-gray-100 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-6 w-6 text-primary" />
            邮件发送测试
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-700">
            SMTP: {process.env.NODE_ENV === 'development' ? 'smtp.jafron.com:465' : '已配置'}
            <br />
            发件人: wuchangyue@jafron.com
          </div>
          <div>
            <Label>收件人邮箱 *</Label>
            <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="收件人邮箱" />
          </div>
          <div>
            <Label>邮件主题</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="邮件主题" />
          </div>
          <div>
            <Label>邮件内容</Label>
            <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={4} />
          </div>
          <Button onClick={handleSend} disabled={sending || !to} className="w-full">
            {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
            {sending ? '发送中...' : '发送测试邮件'}
          </Button>

          {result && (
            <div className={`rounded-lg p-4 ${result.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              <div className="flex items-center gap-2">
                {result.success ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                <span className="font-medium">{result.message}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
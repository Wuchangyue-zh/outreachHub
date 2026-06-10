'use client'

import { useState } from 'react'
import { useI18n } from '@/hooks/use-i18n'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Mail, Loader2, CheckCircle, XCircle } from 'lucide-react'

export default function EmailTestPage() {
  const { t } = useI18n()
  const [to, setTo] = useState('734151319@qq.com')
  const [subject, setSubject] = useState(t('emailTest.defaultSubject'))
  const [content, setContent] = useState(t('emailTest.defaultContent'))
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
        setResult({ success: true, message: `${t('emailTest.sendSuccess')} Message ID: ${data.messageId}` })
      } else {
        setResult({ success: false, message: `${t('emailTest.sendFailed')}: ${data.error}` })
      }
    } catch (e: any) {
      setResult({ success: false, message: `${t('common.networkError')}: ${e.message}` })
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
            {t('emailTest.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-700">
            {t('emailTest.smtp')}: {process.env.NODE_ENV === 'development' ? 'smtp.jafron.com:465' : t('emailTest.configured')}
            <br />
            {t('emailTest.sender')}: wuchangyue@jafron.com
          </div>
          <div>
            <Label>{t('emailTest.to')} *</Label>
            <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder={t('emailTest.toPlaceholder')} />
          </div>
          <div>
            <Label>{t('emailTest.subject')}</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={t('emailTest.subjectPlaceholder')} />
          </div>
          <div>
            <Label>{t('emailTest.content')}</Label>
            <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={4} />
          </div>
          <Button onClick={handleSend} disabled={sending || !to} className="w-full">
            {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
            {sending ? t('emailTest.sending') : t('emailTest.send')}
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
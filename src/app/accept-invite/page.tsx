'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useI18n } from '@/hooks/use-i18n'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, CheckCircle, XCircle, Mail } from 'lucide-react'

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>}>
      <AcceptInviteContent />
    </Suspense>
  )
}

function AcceptInviteContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')
  const { t } = useI18n()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [needsPassword, setNeedsPassword] = useState(false)
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [tenantName, setTenantName] = useState('')

  const handleAccept = async () => {
    if (!token) return
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: password || undefined, name: name || undefined }),
      })
      const data = await res.json()

      if (data.success) {
        setSuccess(true)
        setTenantName(data.data?.tenant?.name || '')
        setTimeout(() => router.push('/dashboard'), 2000)
      } else if (
        data.error?.message?.includes('密码') ||
        data.error?.code === 'MISSING_REQUIRED_FIELD'
      ) {
        setNeedsPassword(true)
      } else {
        setError(data.error?.message || data.error || t('acceptInvite.acceptFailed'))
      }
    } catch {
      setError(t('acceptInvite.networkError'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) handleAccept()
  }, [token])

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <XCircle className="h-12 w-12 mx-auto text-red-400 mb-4" />
            <p className="text-gray-600">{t('acceptInvite.invalidLink')}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">{t('acceptInvite.successTitle')}</h2>
            <p className="text-gray-600">
              {tenantName ? t('acceptInvite.welcomeToTeam').replace('{name}', tenantName) : t('acceptInvite.joinedTeam')}
            </p>
            <p className="text-sm text-gray-400 mt-2">{t('acceptInvite.redirecting')}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (needsPassword) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" /> {t('acceptInvite.setPasswordTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-500">{t('acceptInvite.setPasswordDesc')}</p>
            <div className="space-y-2">
              <Label htmlFor="name">{t('acceptInvite.displayName')}</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('acceptInvite.displayNamePlaceholder')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('acceptInvite.password')}</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t('acceptInvite.passwordPlaceholder')} />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button onClick={handleAccept} disabled={loading || !password} className="w-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {t('acceptInvite.registerAndJoin')}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardContent className="py-12 text-center">
          {loading ? (
            <>
              <Loader2 className="h-12 w-12 mx-auto text-blue-500 animate-spin mb-4" />
              <p className="text-gray-600">{t('acceptInvite.processing')}</p>
            </>
          ) : error ? (
            <>
              <XCircle className="h-12 w-12 mx-auto text-red-400 mb-4" />
              <p className="text-red-600 mb-4">{error}</p>
              <Button variant="outline" onClick={() => router.push('/login')}>{t('acceptInvite.backToLogin')}</Button>
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}

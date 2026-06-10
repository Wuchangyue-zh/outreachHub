'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/toast'
import Link from 'next/link'
import {
  Users, Search, Building, Mail, Globe, Tag, Hand, ArrowUpRight,
  RefreshCw, Loader2, UserCheck, Database, CalendarDays,
} from 'lucide-react'

interface PoolContact {
  id: string
  firstName: string
  lastName: string
  fullName: string
  title: string
  emails: { address: string; isPrimary: boolean; isVerified: boolean }[]
  company: { name: string; domain: string } | null
  countryCode: string
  country: string
  city: string
  tags: string[]
  status: string
  source: string
  pool: string
  ownerId: string | null
  ownerName: string | null
  lastActivityAt: string | null
  createdAt: string
}

interface PoolStats {
  publicTotal: number
  myTotal: number
  claimedToday: number
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  NEW: { label: '新客户', color: 'bg-blue-100 text-blue-700' },
  CONTACTED: { label: '已联系', color: 'bg-yellow-100 text-yellow-700' },
  INTERESTED: { label: '有意向', color: 'bg-green-100 text-green-700' },
  QUALIFIED: { label: '已确认', color: 'bg-purple-100 text-purple-700' },
  CONVERTED: { label: '已转化', color: 'bg-emerald-100 text-emerald-700' },
  NOT_INTERESTED: { label: '无意向', color: 'bg-gray-100 text-gray-600' },
  UNREACHABLE: { label: '无法联系', color: 'bg-red-100 text-red-600' },
}

const SOURCE_MAP: Record<string, string> = {
  IMPORT: '导入',
  MANUAL: '手动添加',
  PROSPECTING: '智能拓客',
  CUSTOMS: '海关数据',
  WEBSITE: '官网抓取',
  API: 'API',
}

export default function PoolPage() {
  const { addToast } = useToast()
  const [activeTab, setActiveTab] = useState('public')
  const [publicContacts, setPublicContacts] = useState<PoolContact[]>([])
  const [myContacts, setMyContacts] = useState<PoolContact[]>([])
  const [stats, setStats] = useState<PoolStats>({ publicTotal: 0, myTotal: 0, claimedToday: 0 })
  const [loading, setLoading] = useState(true)
  const [claimingId, setClaimingId] = useState<string | null>(null)
  const [releasingId, setReleasingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [publicPage, setPublicPage] = useState(1)
  const [myPage, setMyPage] = useState(1)
  const [publicTotal, setPublicTotal] = useState(0)
  const [myTotal, setMyTotal] = useState(0)
  const limit = 12

  useEffect(() => {
    fetchPoolData()
  }, [publicPage, myPage, search])

  async function fetchPoolData() {
    setLoading(true)
    try {
      const [publicRes, myRes] = await Promise.all([
        fetch(`/api/contacts?pool=PUBLIC&page=${publicPage}&limit=${limit}${search ? `&search=${encodeURIComponent(search)}` : ''}`),
        fetch(`/api/contacts?ownerId=me&poolStats=true&page=${myPage}&limit=${limit}${search ? `&search=${encodeURIComponent(search)}` : ''}`),
      ])

      const [publicData, myData] = await Promise.all([publicRes.json(), myRes.json()])

      if (publicData.success) {
        setPublicContacts(publicData.data)
        setPublicTotal(publicData.pagination.total)
      }
      if (myData.success) {
        setMyContacts(myData.data)
        setMyTotal(myData.pagination.total)
      }

      setStats({
        publicTotal: publicData.pagination?.total || 0,
        myTotal: myData.pagination?.total || 0,
        claimedToday: myData.poolStats?.claimedToday ?? 0,
      })
    } catch (e) {
      console.error('Failed to fetch pool data:', e)
      addToast({ type: 'error', title: '加载失败', description: '无法获取客户公海数据' })
    } finally {
      setLoading(false)
    }
  }

  const handleClaim = async (contactId: string) => {
    setClaimingId(contactId)
    try {
      const res = await fetch(`/api/contacts/${contactId}/claim`, { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        addToast({ type: 'success', title: '领取成功', description: '客户已移入您的客户列表' })
        fetchPoolData()
      } else {
        addToast({ type: 'error', title: '领取失败', description: data.error?.message || data.message || '操作失败' })
      }
    } catch {
      addToast({ type: 'error', title: '领取失败', description: '网络错误' })
    } finally {
      setClaimingId(null)
    }
  }

  const handleRelease = async (contactId: string) => {
    setReleasingId(contactId)
    try {
      const res = await fetch(`/api/contacts/${contactId}/release`, { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        addToast({ type: 'success', title: '释放成功', description: '客户已释放回公海' })
        fetchPoolData()
      } else {
        addToast({ type: 'error', title: '释放失败', description: data.error?.message || data.message || '操作失败' })
      }
    } catch {
      addToast({ type: 'error', title: '释放失败', description: '网络错误' })
    } finally {
      setReleasingId(null)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">客户公海</h1>
            <p className="text-sm text-gray-500">管理公海客户资源，领取跟进或释放闲置客户</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchPoolData}>
            <RefreshCw className="h-4 w-4 mr-2" /> 刷新
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="border-gray-100">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50">
                <Database className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.publicTotal}</p>
                <p className="text-sm text-gray-500">公海总数</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-gray-100">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-50">
                <UserCheck className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.myTotal}</p>
                <p className="text-sm text-gray-500">我的客户</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-gray-100">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-50">
                <Hand className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.claimedToday}</p>
                <p className="text-sm text-gray-500">今日领取</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card className="border-gray-100">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="搜索姓名、邮箱..."
                className="pl-10"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPublicPage(1); setMyPage(1) }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="public" className="gap-2">
              <Globe className="h-4 w-4" />
              公海客户
              {publicTotal > 0 && (
                <Badge className="ml-1 bg-gray-200 text-gray-700 border-0 text-xs">{publicTotal}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="mine" className="gap-2">
              <Users className="h-4 w-4" />
              我的客户
              {myTotal > 0 && (
                <Badge className="ml-1 bg-gray-200 text-gray-700 border-0 text-xs">{myTotal}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Public Pool Tab */}
          <TabsContent value="public">
            {loading ? (
              <div className="flex items-center justify-center py-16 text-sm text-gray-500">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> 加载中...
              </div>
            ) : publicContacts.length === 0 ? (
              <Card className="border-gray-100">
                <CardContent className="py-16 text-center">
                  <Database className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                  <p className="text-gray-500 font-medium">公海暂无客户</p>
                  <p className="text-sm text-gray-400 mt-1">
                    {search ? '没有匹配的客户，请尝试其他搜索条件' : '释放的客户会出现在这里'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {publicContacts.map((contact) => (
                    <ContactCard
                      key={contact.id}
                      contact={contact}
                      variant="public"
                      onClaim={() => handleClaim(contact.id)}
                      claiming={claimingId === contact.id}
                    />
                  ))}
                </div>
                {publicTotal > limit && (
                  <div className="flex items-center justify-between pt-4">
                    <p className="text-sm text-gray-500">共 {publicTotal} 条</p>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" disabled={publicPage === 1} onClick={() => setPublicPage(p => p - 1)}>
                        上一页
                      </Button>
                      <span className="flex items-center px-3 text-sm text-gray-500">
                        {publicPage} / {Math.ceil(publicTotal / limit)}
                      </span>
                      <Button variant="outline" size="sm" disabled={publicPage >= Math.ceil(publicTotal / limit)} onClick={() => setPublicPage(p => p + 1)}>
                        下一页
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* My Contacts Tab */}
          <TabsContent value="mine">
            {loading ? (
              <div className="flex items-center justify-center py-16 text-sm text-gray-500">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> 加载中...
              </div>
            ) : myContacts.length === 0 ? (
              <Card className="border-gray-100">
                <CardContent className="py-16 text-center">
                  <Users className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                  <p className="text-gray-500 font-medium">暂无我的客户</p>
                  <p className="text-sm text-gray-400 mt-1">
                    {search ? '没有匹配的客户' : '去公海领取客户开始跟进吧'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {myContacts.map((contact) => (
                    <ContactCard
                      key={contact.id}
                      contact={contact}
                      variant="mine"
                      onRelease={() => handleRelease(contact.id)}
                      releasing={releasingId === contact.id}
                    />
                  ))}
                </div>
                {myTotal > limit && (
                  <div className="flex items-center justify-between pt-4">
                    <p className="text-sm text-gray-500">共 {myTotal} 条</p>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" disabled={myPage === 1} onClick={() => setMyPage(p => p - 1)}>
                        上一页
                      </Button>
                      <span className="flex items-center px-3 text-sm text-gray-500">
                        {myPage} / {Math.ceil(myTotal / limit)}
                      </span>
                      <Button variant="outline" size="sm" disabled={myPage >= Math.ceil(myTotal / limit)} onClick={() => setMyPage(p => p + 1)}>
                        下一页
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}

/* ─── Contact Card Component ─── */

interface ContactCardProps {
  contact: PoolContact
  variant: 'public' | 'mine'
  onClaim?: () => void
  claiming?: boolean
  onRelease?: () => void
  releasing?: boolean
}

function ContactCard({ contact, variant, onClaim, claiming, onRelease, releasing }: ContactCardProps) {
  const status = STATUS_MAP[contact.status] || { label: contact.status, color: 'bg-gray-100 text-gray-600' }
  const source = SOURCE_MAP[contact.source] || contact.source
  const primaryEmail = contact.emails.find(e => e.isPrimary)?.address || contact.emails[0]?.address || '-'
  const lastActivity = contact.lastActivityAt
    ? new Date(contact.lastActivityAt).toLocaleDateString('zh-CN')
    : null

  return (
    <Card className="border-gray-100 hover:border-gray-200 transition-colors">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
              {contact.fullName.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="font-medium text-gray-900 truncate">{contact.fullName}</p>
              <p className="text-xs text-gray-500 truncate">{contact.title || '-'}</p>
            </div>
          </div>
          <Badge className={`${status.color} border-0 text-xs shrink-0`}>{status.label}</Badge>
        </div>

        {/* Info */}
        <div className="space-y-1.5 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <Mail className="h-3.5 w-3.5 text-gray-400 shrink-0" />
            <span className="truncate">{primaryEmail}</span>
          </div>
          {contact.company && (
            <div className="flex items-center gap-2">
              <Building className="h-3.5 w-3.5 text-gray-400 shrink-0" />
              <span className="truncate">{contact.company.name}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Tag className="h-3.5 w-3.5 text-gray-400 shrink-0" />
            <span>来源：{source}</span>
          </div>
          {variant === 'mine' && lastActivity && (
            <div className="flex items-center gap-2">
              <CalendarDays className="h-3.5 w-3.5 text-gray-400 shrink-0" />
              <span>最后活跃：{lastActivity}</span>
            </div>
          )}
        </div>

        {/* Tags */}
        {contact.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {contact.tags.slice(0, 3).map((tag, i) => (
              <span key={i} className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                {tag}
              </span>
            ))}
            {contact.tags.length > 3 && (
              <span className="text-xs text-gray-400">+{contact.tags.length - 3}</span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="pt-2 border-t border-gray-100">
          {variant === 'public' && onClaim && (
            <Button
              size="sm"
              className="w-full gap-2"
              onClick={onClaim}
              disabled={claiming}
            >
              {claiming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Hand className="h-4 w-4" />
              )}
              领取客户
            </Button>
          )}
          {variant === 'mine' && (
            <div className="flex gap-2">
              <Link href={`/contacts?highlight=${contact.id}`} className="flex-1">
                <Button size="sm" className="w-full gap-2">
                  <ArrowUpRight className="h-4 w-4" />
                  跟进
                </Button>
              </Link>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 gap-2"
                onClick={onRelease}
                disabled={releasing}
              >
                {releasing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                释放
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

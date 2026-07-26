'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  Building2, UserCircle,
  Send,
  FileText,
  Search,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Mail,
  Menu,
  BarChart3,
  BarChart,
  Inbox as InboxIcon,
  Package,
  ListTodo,
  Container,
  Shield,
  Kanban,
  Waves,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  Rocket,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ThemeToggle'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { useI18n } from '@/hooks/use-i18n'
import { RealtimeStatus, SSE_REPLY_EVENT } from '@/components/RealtimeStatus'

interface TenantUsageData {
  tenant: {
    id: string
    name: string
    plan: string
    trialEndsAt: string | null
    expiresAt: string | null
  }
}

function TrialBanner() {
  const [bannerData, setBannerData] = useState<{
    plan: string
    trialEndsAt: string | null
    daysLeft: number
  } | null>(null)

  useEffect(() => {
    const fetchUsage = async () => {
      try {
        const res = await fetch('/api/tenant/usage')
        const data = await res.json()
        if (data.success && data.data?.tenant) {
          const tenant = data.data.tenant as TenantUsageData['tenant']
          if (tenant.plan === 'FREE' && tenant.trialEndsAt) {
            const endDate = new Date(tenant.trialEndsAt)
            const now = new Date()
            const diffMs = endDate.getTime() - now.getTime()
            const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
            setBannerData({
              plan: tenant.plan,
              trialEndsAt: tenant.trialEndsAt,
              daysLeft,
            })
          }
        }
      } catch {
        // Silent fail - banner is non-critical
      }
    }
    fetchUsage()
  }, [])

  if (!bannerData) return null

  // Trial expired
  if (bannerData.daysLeft <= 0) {
    return (
      <div className="flex w-full shrink-0 items-center justify-between gap-3 bg-red-50 dark:bg-red-950/30 border-b border-red-200 dark:border-red-800 px-4 py-2.5">
        <div className="flex items-center gap-2 text-sm text-red-700 dark:text-red-300">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span className="font-medium">试用期已结束</span>
          <span className="hidden sm:inline">— 升级以继续使用完整功能</span>
        </div>
        <Link href="/pricing">
          <Button size="sm" className="gap-1 bg-red-600 hover:bg-red-700 text-white">
            升级套餐
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>
    )
  }

  // Trial active
  return (
    <div className="flex w-full shrink-0 items-center justify-between gap-3 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800 px-4 py-2.5">
      <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
        <Clock className="h-4 w-4 flex-shrink-0" />
        <span className="font-medium">试用期剩余 {bannerData.daysLeft} 天</span>
        <span className="hidden sm:inline">— 升级获取更多额度</span>
      </div>
      <Link href="/pricing">
        <Button size="sm" variant="outline" className="gap-1 border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-900/30">
          升级套餐
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Button>
      </Link>
    </div>
  )
}

const navigation: { name: string; href: string; icon: any; platformAdminOnly?: boolean }[] = [
  { name: '仪表盘', href: '/dashboard', icon: LayoutDashboard },
  { name: '快速开始', href: '/dashboard/getting-started', icon: Rocket },
  { name: '智能拓客', href: '/prospecting', icon: Search },
  { name: '海关数据', href: '/customs', icon: Container },
  { name: '客户管理', href: '/contacts', icon: Users },
  { name: '公司库', href: '/companies', icon: Building2 },
  { name: '产品管理', href: '/dashboard/products', icon: Package },
  { name: '任务中心', href: '/dashboard/tasks', icon: ListTodo },
  { name: '销售漏斗', href: '/dashboard/pipeline', icon: Kanban },
  { name: '客户公海', href: '/dashboard/pool', icon: Waves },
  { name: '邮件营销', href: '/campaigns', icon: Send },
  { name: '邮件模板', href: '/templates', icon: FileText },
  { name: '统一收件箱', href: '/dashboard/inbox', icon: InboxIcon },
  { name: '邮箱设置', href: '/dashboard/settings', icon: Mail },
  { name: '送达率监控', href: '/deliverability', icon: Shield },
  { name: '队列监控', href: '/email-queue', icon: BarChart3 },
  { name: '数据报表', href: '/reports', icon: BarChart },
  { name: '审计日志', href: '/dashboard/audit', icon: Shield },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false)
  const [inboxUnread, setInboxUnread] = useState(0)
  const pathname = usePathname()
  useEffect(() => { fetch('/api/users/me').then(r=>r.json()).then(d=>{ if(d.success) setIsPlatformAdmin(d.user?.isPlatformAdmin===true) }).catch(()=>{}) }, [])
  const router = useRouter()
  const { t } = useI18n()

  const fetchUnread = useCallback(async () => {
    // 已在收件箱：角标保持 0，避免轮询把水位未更新的未读又刷回来
    if (pathname.startsWith('/dashboard/inbox')) {
      setInboxUnread(0)
      return
    }
    try {
      const res = await fetch('/api/inbox/unread-count')
      const data = await res.json()
      if (data.success) setInboxUnread(data.data?.count || 0)
    } catch {
      // non-critical
    }
  }, [pathname])

  useEffect(() => {
    fetchUnread()
    const interval = setInterval(fetchUnread, 45000)
    const onReply = () => {
      if (pathname.startsWith('/dashboard/inbox')) {
        setInboxUnread(0)
        // 推进已读水位，离开收件箱后轮询不会误亮角标
        fetch('/api/inbox/mark-seen', { method: 'POST' }).catch(() => {})
        return
      }
      setInboxUnread((c) => c + 1)
    }
    window.addEventListener(SSE_REPLY_EVENT, onReply)
    return () => {
      clearInterval(interval)
      window.removeEventListener(SSE_REPLY_EVENT, onReply)
    }
  }, [fetchUnread, pathname])

  // Clear badge when navigating to inbox (mark-seen runs on inbox page)
  useEffect(() => {
    if (pathname.startsWith('/dashboard/inbox')) {
      setInboxUnread(0)
    }
  }, [pathname])

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
    } catch (e) {
      console.error('Logout failed:', e)
    }
  }

  return (
    <div className="flex h-screen flex-col bg-gray-50 dark:bg-gray-900">
      {/* Trial countdown banner — must be top row, not beside sidebar */}
      <TrialBanner />

      <div className="flex min-h-0 flex-1">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col border-r bg-white dark:bg-gray-800 dark:border-gray-700 transition-all duration-300 lg:static',
          collapsed ? 'w-16' : 'w-64',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b dark:border-gray-700 px-4">
          {!collapsed && (
            <Link href="/dashboard" className="flex items-center gap-2">
              <Mail className="h-7 w-7 text-primary" />
              <span className="text-lg font-bold text-gray-900 dark:text-white">OutreachHub</span>
            </Link>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden rounded-md p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300 lg:block"
          >
            {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 py-4">
          <ul className="space-y-1">
            {navigation.filter(item => !item.platformAdminOnly || isPlatformAdmin).map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              const showBadge = item.href === '/dashboard/inbox' && inboxUnread > 0
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white',
                      collapsed && 'justify-center px-2'
                    )}
                    title={collapsed ? item.name : undefined}
                  >
                    <span className="relative flex-shrink-0">
                      <item.icon className={cn('h-5 w-5', isActive && 'text-primary')} />
                      {collapsed && showBadge && (
                        <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-red-500" />
                      )}
                    </span>
                    {!collapsed && (
                      <>
                        <span className="flex-1">{item.name}</span>
                        {showBadge && (
                          <span className="ml-auto inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-medium text-white">
                            {inboxUnread > 99 ? '99+' : inboxUnread}
                          </span>
                        )}
                      </>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* User section */}
        <div className="border-t dark:border-gray-700 p-4">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white"
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span>{t('auth.logout')}</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 items-center justify-between border-b bg-white dark:bg-gray-800 dark:border-gray-700 px-4 lg:px-6">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-md p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-4 ml-auto">
            <RealtimeStatus compact />
            <LanguageSwitcher />
            <ThemeToggle />
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
              A
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
      </div>
    </div>
  )
}

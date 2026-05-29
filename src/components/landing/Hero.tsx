import Link from 'next/link'
import { Users, Globe, Mail, TrendingUp, ArrowRight } from 'lucide-react'
import { heroData } from '@/lib/landing-data'

const statIcons = { users: Users, globe: Globe, mail: Mail }

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-blue-50 pt-24 pb-20 lg:pt-28 lg:pb-28">
      {/* Background decoration */}
      <div className="absolute left-1/2 top-0 -z-10 -translate-x-1/2">
        <div className="h-[600px] w-[1200px] rounded-full bg-gradient-to-b from-blue-100/60 to-transparent blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Left: Copy */}
          <div>
            {/* Badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-500 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-600" />
              </span>
              <span className="text-xs font-medium text-blue-700">{heroData.badge}</span>
            </div>

            {/* H1 */}
            <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl lg:text-[3.5rem] lg:leading-[1.1]">
              {heroData.h1}
              <br />
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                {heroData.h1Highlight}
              </span>
            </h1>

            {/* Description */}
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-gray-600">
              {heroData.description}
            </p>

            {/* CTA */}
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/register"
                className="group/btn relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-blue-600 px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-blue-600/25 transition-all duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-600/30"
              >
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover/btn:translate-x-full" />
                {heroData.cta.primary}
                <ArrowRight className="h-4 w-4 transition-transform duration-500 group-hover/btn:translate-x-1" />
              </Link>
              <Link
                href="#pricing"
                className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-7 py-3.5 text-base font-semibold text-gray-700 shadow-sm transition-all hover:border-gray-400 hover:bg-gray-50"
              >
                {heroData.cta.secondary}
              </Link>
            </div>

            {/* Trust note */}
            <p className="mt-5 text-xs text-gray-400">{heroData.trustNote}</p>
          </div>

          {/* Right: Mock Dashboard */}
          <div className="relative">
            {/* Dashboard card */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl shadow-gray-200/50">
              {/* Dashboard header */}
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-400">今日营销数据</p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">
                    {heroData.mockDashboard.sentToday.toLocaleString()}{' '}
                    <span className="text-sm font-normal text-gray-400">封已发送</span>
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
              </div>

              {/* Stats grid */}
              <div className="mb-6 grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-blue-50 p-3 text-center">
                  <p className="text-lg font-bold text-blue-700">{heroData.mockDashboard.openRate}</p>
                  <p className="mt-0.5 text-[10px] font-medium text-blue-500">打开率</p>
                </div>
                <div className="rounded-xl bg-emerald-50 p-3 text-center">
                  <p className="text-lg font-bold text-emerald-700">{heroData.mockDashboard.replyRate}</p>
                  <p className="mt-0.5 text-[10px] font-medium text-emerald-500">回复率</p>
                </div>
                <div className="rounded-xl bg-violet-50 p-3 text-center">
                  <p className="text-lg font-bold text-violet-700">{heroData.mockDashboard.newLeads}</p>
                  <p className="mt-0.5 text-[10px] font-medium text-violet-500">新增线索</p>
                </div>
              </div>

              {/* Chart area (CSS bar chart) */}
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="mb-3 text-xs font-medium text-gray-500">本周发送趋势</p>
                <div className="flex items-end gap-1.5" style={{ height: '80px' }}>
                  {heroData.mockDashboard.chartData.map((val, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-t-sm bg-gradient-to-t from-blue-500 to-blue-400 transition-all hover:from-blue-600 hover:to-blue-500"
                      style={{ height: `${(val / 140) * 100}%` }}
                    />
                  ))}
                </div>
                <div className="mt-2 flex justify-between text-[10px] text-gray-400">
                  <span>周一</span>
                  <span>周二</span>
                  <span>周三</span>
                  <span>周四</span>
                  <span>周五</span>
                  <span>周六</span>
                  <span>周日</span>
                </div>
              </div>
            </div>

            {/* Floating card: new lead notification */}
            <div className="absolute -left-4 top-12 hidden animate-[float_3s_ease-in-out_infinite] rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-lg lg:block">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
                  <Users className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-900">+1 新线索</p>
                  <p className="text-[10px] text-gray-400">德国 · 汽车零部件</p>
                </div>
              </div>
            </div>

            {/* Floating card: email opened */}
            <div className="absolute -right-2 bottom-16 hidden animate-[float_3s_ease-in-out_1s_infinite] rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-lg lg:block">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                  <Mail className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-900">邮件已打开</p>
                  <p className="text-[10px] text-gray-400">采购经理 · Bosch GmbH</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom stats */}
        <div className="mt-16 grid grid-cols-3 gap-6 rounded-2xl border border-gray-100 bg-white/80 px-8 py-6 shadow-sm backdrop-blur-sm sm:gap-8">
          {heroData.stats.map((stat) => {
            const Icon = statIcons[stat.icon as keyof typeof statIcons] || Users
            return (
              <div key={stat.label} className="text-center">
                <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                  <Icon className="h-5 w-5 text-blue-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900 sm:text-3xl">{stat.value}</p>
                <p className="mt-1 text-xs text-gray-500">{stat.label}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

'use client'

import { useState } from 'react'
import { useI18n } from '@/hooks/use-i18n'
import Link from 'next/link'
import { Database, Mail, Workflow, Users, CheckCircle2, ArrowRight, BarChart3 } from 'lucide-react'
import { solutionsData, type SolutionTab } from '@/lib/landing-data'

const iconMap: Record<string, React.ElementType> = {
  database: Database,
  mail: Mail,
  workflow: Workflow,
  users: Users,
}

export function Solutions() {
  const { t } = useI18n()
  const [activeTab, setActiveTab] = useState(0)
  const active = solutionsData.tabs[activeTab]

  return (
    <section id="solutions" className="py-28 lg:py-36">
      <div className="mx-auto max-w-7xl px-6">
        {/* Section header */}
        <div className="mx-auto max-w-2xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
            <BarChart3 className="h-3 w-3" />
            {t('landingComponents.solutions.badge')}
          </div>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            {solutionsData.title}
          </h2>
          <p className="mt-4 text-base text-gray-500">{solutionsData.subtitle}</p>
        </div>

        {/* Tab navigation with smooth capsule slider */}
        <div className="mt-12 flex justify-center">
          <div className="relative inline-flex gap-1 rounded-xl bg-gray-100 p-1">
            {/* Sliding capsule indicator */}
            <div
              className="absolute top-1 bottom-1 rounded-lg bg-white shadow-sm transition-all duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)]"
              style={{
                left: `${activeTab * 25}%`,
                width: '25%',
              }}
            />
            {solutionsData.tabs.map((tab, i) => {
              const Icon = iconMap[tab.icon] || Database
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(i)}
                  className={`relative z-10 flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors duration-300 ${
                    i === activeTab ? 'text-blue-700' : 'text-gray-500 hover:text-gray-700'
                  }`}
                  style={{ width: '25%' }}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Tab content with staggered fade-in */}
        <div className="mt-12">
          <div
            key={activeTab}
            className="grid items-start gap-12 lg:grid-cols-2 lg:gap-16 animate-[fadeSlideUp_0.5s_cubic-bezier(0.16,1,0.3,1)_both]"
          >
            {/* Left: Description & Features */}
            <div>
              <h3 className="text-2xl font-bold text-gray-900">{active.title}</h3>
              <p className="mt-4 leading-relaxed text-gray-600">{active.description}</p>

              <div className="mt-8 space-y-4">
                {active.features.map((f, i) => (
                  <div
                    key={f.title}
                    className="flex items-start gap-3 animate-[fadeSlideUp_0.5s_cubic-bezier(0.16,1,0.3,1)_both]"
                    style={{ animationDelay: `${100 + i * 80}ms` }}
                  >
                    <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-100">
                      <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{f.title}</p>
                      <p className="mt-0.5 text-sm text-gray-500">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Link
                href="/register"
                className="group/btn mt-8 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition-all duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] hover:bg-blue-700 hover:shadow-xl relative overflow-hidden"
              >
                {/* Shimmer */}
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover/btn:translate-x-full" />
                {active.cta}
                <ArrowRight className="h-4 w-4 transition-transform duration-500 group-hover/btn:translate-x-0.5" />
              </Link>
            </div>

            {/* Right: Visual card */}
            <div className="relative">
              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-8 shadow-lg">
                {/* Stat highlight */}
                <div className="mb-6 flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600">
                    {(() => {
                      const Icon = iconMap[active.icon] || Database
                      return <Icon className="h-7 w-7 text-white" />
                    })()}
                  </div>
                  <div>
                    <p className="text-3xl font-extrabold text-gray-900">{active.stat.value}</p>
                    <p className="text-sm text-gray-500">{active.stat.label}</p>
                  </div>
                </div>

                {/* Feature cards */}
                <div className="space-y-3">
                  {active.features.map((f, i) => (
                    <div
                      key={f.title}
                      className="flex items-start gap-3 rounded-xl bg-white p-4 shadow-sm transition-all duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] hover:shadow-md"
                    >
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 text-sm font-bold text-blue-600">
                        {String(i + 1).padStart(2, '0')}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{f.title}</p>
                        <p className="mt-0.5 text-xs text-gray-500">{f.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Bottom metric bar */}
                <div className="mt-6 flex items-center justify-between rounded-xl bg-blue-50 px-4 py-3">
                  <span className="text-xs font-medium text-blue-700">{t('landingComponents.solutions.improvement')}</span>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className="h-2 w-8 rounded-full bg-blue-200"
                        style={{ opacity: 0.4 + i * 0.15 }}
                      />
                    ))}
                    <span className="ml-2 text-xs font-bold text-blue-700">MAX</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  )
}

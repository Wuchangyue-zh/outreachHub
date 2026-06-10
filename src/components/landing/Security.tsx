'use client'

import { Lock, Shield, UserCheck, Server } from 'lucide-react'
import { useI18n } from '@/hooks/use-i18n'
import { securityData, type SecurityFeature } from '@/lib/landing-data'
import { ScrollReveal } from '@/components/landing/ScrollReveal'

const iconMap: Record<string, React.ElementType> = {
  lock: Lock,
  shield: Shield,
  'user-check': UserCheck,
  server: Server,
}

const gradients = [
  'from-blue-500 to-indigo-600',
  'from-emerald-500 to-teal-600',
  'from-violet-500 to-purple-600',
  'from-amber-500 to-orange-600',
]

function SecurityCard({ feature, index }: { feature: SecurityFeature; index: number }) {
  const Icon = iconMap[feature.icon] || Lock
  const gradient = gradients[index % gradients.length]

  return (
    <div className="group rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 hover:shadow-lg">
      {/* Icon */}
      <div
        className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} shadow-lg transition-transform duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110`}
      >
        <Icon className="h-6 w-6 text-white" />
      </div>

      <h3 className="text-lg font-bold text-gray-900">{feature.title}</h3>
      <p className="mt-1 text-sm text-gray-500">{feature.description}</p>

      {/* Detail list */}
      <ul className="mt-4 space-y-2">
        {feature.details.map((d) => (
          <li key={d} className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-blue-400" />
            <span className="text-sm text-gray-600">{d}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function Security() {
  const { t } = useI18n()
  return (
    <section className="bg-gray-50/50 py-28 lg:py-36">
      <div className="mx-auto max-w-7xl px-6">
        {/* Header */}
        <ScrollReveal>
          <div className="mx-auto max-w-2xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
              <Shield className="h-3 w-3" />
              {t('landingComponents.security.badge')}
            </div>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              {securityData.title}
            </h2>
            <p className="mt-4 text-base text-gray-500">{securityData.subtitle}</p>
          </div>
        </ScrollReveal>

        {/* Cards */}
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {securityData.features.map((f, i) => (
            <ScrollReveal key={f.title} delay={i * 100}>
              <SecurityCard feature={f} index={i} />
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}

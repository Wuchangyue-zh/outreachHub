import Link from 'next/link'
import { useI18n } from '@/hooks/use-i18n'
import {
  Brain, ShieldCheck, Languages, Split, Eye, HeartPulse, Repeat, BarChart3,
  ArrowRight,
} from 'lucide-react'
import { featuresData, type Feature } from '@/lib/landing-data'
import { ScrollReveal } from '@/components/landing/ScrollReveal'

const iconMap: Record<string, React.ElementType> = {
  brain: Brain,
  'shield-check': ShieldCheck,
  languages: Languages,
  split: Split,
  eye: Eye,
  'heart-pulse': HeartPulse,
  repeat: Repeat,
  'bar-chart-3': BarChart3,
}

const iconBg = [
  'bg-blue-50 text-blue-600',
  'bg-emerald-50 text-emerald-600',
  'bg-violet-50 text-violet-600',
  'bg-amber-50 text-amber-600',
  'bg-cyan-50 text-cyan-600',
  'bg-rose-50 text-rose-600',
  'bg-fuchsia-50 text-fuchsia-600',
  'bg-lime-50 text-lime-600',
]

function FeatureCard({ feature, index }: { feature: Feature; index: number }) {
  const { t } = useI18n()
  const Icon = iconMap[feature.icon] || Brain
  const bg = iconBg[index % iconBg.length]

  return (
    <Link
      href={feature.href}
      className="group relative flex flex-col items-center overflow-hidden rounded-2xl border border-gray-100 bg-white p-7 text-center shadow-sm transition-all duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-50"
    >
      {/* Icon */}
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl transition-transform duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-0.5 group-hover:scale-110">
        <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${bg} transition-colors duration-300`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>

      {/* Title */}
      <h3 className="text-base font-bold text-gray-900 transition-colors duration-300 group-hover:text-blue-700">
        {feature.title}
      </h3>

      {/* Description */}
      <p className="mt-2 text-sm leading-relaxed text-gray-500">
        {feature.description}
      </p>

      {/* Arrow reveal */}
      <div className="mt-auto pt-4 flex items-center gap-1 text-xs font-semibold text-blue-600 opacity-0 translate-y-1 transition-all duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] group-hover:opacity-100 group-hover:translate-y-0">
        {t('landingComponents.features.learnMore')}
        <ArrowRight className="h-3 w-3 transition-transform duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1" />
      </div>
    </Link>
  )
}

export function Features() {
  const { t } = useI18n()
  return (
    <section id="features" className="bg-gray-50/50 py-28 lg:py-36">
      <div className="mx-auto max-w-7xl px-6">
        {/* Section header */}
        <ScrollReveal>
          <div className="mx-auto max-w-2xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
              <Brain className="h-3 w-3" />
              {t('landingComponents.features.badge')}
            </div>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              {featuresData.title}
            </h2>
            <p className="mt-4 text-base text-gray-500">{featuresData.subtitle}</p>
          </div>
        </ScrollReveal>

        {/* 4-col uniform grid */}
        <div className="mt-14 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          {featuresData.features.map((feature, i) => (
            <ScrollReveal key={feature.title} delay={i * 80}>
              <FeatureCard feature={feature} index={i} />
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}

import { Flame, Search, MailX, Database, ArrowRight, CheckCircle2 } from 'lucide-react'
import { useI18n } from '@/hooks/use-i18n'
import { painPointsData, type PainPoint } from '@/lib/landing-data'
import { ScrollReveal } from '@/components/landing/ScrollReveal'

const iconMap: Record<string, React.ElementType> = {
  flame: Flame,
  search: Search,
  'mail-x': MailX,
  database: Database,
}

function PainCard({ point, index }: { point: PainPoint; index: number }) {
  const Icon = iconMap[point.icon] || Flame

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 hover:border-red-200 hover:shadow-lg">
      {/* Number badge */}
      <div className="absolute right-4 top-4 text-6xl font-black text-gray-100/80 transition-colors group-hover:text-red-100/80">
        {String(index + 1).padStart(2, '0')}
      </div>

      {/* Icon */}
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 transition-colors group-hover:bg-red-100">
        <Icon className="h-6 w-6 text-red-500" />
      </div>

      {/* Title */}
      <h3 className="text-lg font-bold text-gray-900">{point.title}</h3>

      {/* Description */}
      <p className="mt-2 text-sm leading-relaxed text-gray-500">{point.description}</p>

      {/* Consequence */}
      <div className="mt-4 rounded-lg bg-red-50 px-3 py-2">
        <p className="text-xs font-medium text-red-700">
          ❌ {point.consequence}
        </p>
      </div>

      {/* Solution */}
      <div className="mt-3 rounded-lg bg-emerald-50 px-3 py-2">
        <p className="flex items-start gap-1.5 text-xs font-medium text-emerald-700">
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
          {point.solution}
        </p>
      </div>
    </div>
  )
}

export function PainPoints() {
  const { t } = useI18n()
  return (
    <section className="bg-gray-50/50 py-28 lg:py-36">
      <div className="mx-auto max-w-7xl px-6">
        {/* Section header */}
        <ScrollReveal>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              {painPointsData.title}
            </h2>
            <p className="mt-4 text-base text-gray-500">{painPointsData.subtitle}</p>
          </div>
        </ScrollReveal>

        {/* Pain cards grid */}
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {painPointsData.points.map((point, i) => (
            <ScrollReveal key={point.title} delay={i * 100}>
              <PainCard point={point} index={i} />
            </ScrollReveal>
          ))}
        </div>

        {/* Bottom CTA */}
        <ScrollReveal delay={400}>
          <div className="mt-12 text-center">
            <a
              href="#solutions"
              className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 transition-colors hover:text-blue-700"
            >
              {t('landingComponents.painPoints.cta')}
              <ArrowRight className="h-4 w-4 transition-transform hover:translate-x-1" />
            </a>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}

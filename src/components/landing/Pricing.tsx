import Link from 'next/link'
import { useI18n } from '@/hooks/use-i18n'
import { Check, Star, ArrowRight } from 'lucide-react'
import { pricingData, type PricingPlan } from '@/lib/landing-data'
import { ScrollReveal } from '@/components/landing/ScrollReveal'

function PlanCard({ plan, index }: { plan: PricingPlan; index: number }) {
  const { t } = useI18n()
  return (
    <ScrollReveal delay={index * 120}>
      <div
        className={`relative h-full overflow-hidden rounded-2xl border transition-all duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 ${
          plan.highlighted
            ? 'border-blue-200 bg-white shadow-xl shadow-blue-600/10'
            : 'border-gray-200 bg-white shadow-sm hover:shadow-lg'
        }`}
      >
        {/* Badge */}
        {plan.badge && (
          <div className="absolute right-4 top-4">
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-2.5 py-0.5 text-xs font-semibold text-white">
              <Star className="h-3 w-3" />
              {plan.badge}
            </span>
          </div>
        )}

        <div className="p-6 lg:p-8">
          {/* Plan name */}
          <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
          <p className="mt-1 text-sm text-gray-500">{plan.description}</p>

          {/* Price */}
          <div className="mt-5">
            <span className="text-4xl font-extrabold text-gray-900">{plan.price}</span>
            {plan.period && <span className="text-sm text-gray-500">{plan.period}</span>}
          </div>
          {plan.yearlyPrice && (
            <p className="mt-1 text-xs font-medium text-emerald-600">{t('landingComponents.pricing.yearlyDiscount')}{plan.yearlyPrice}</p>
          )}

          {/* CTA */}
          <Link
            href="/register"
            className={`mt-6 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] ${
              plan.highlighted
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700 hover:shadow-xl'
                : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400'
            }`}
          >
            {plan.cta}
            <ArrowRight className="h-4 w-4 transition-transform duration-500 hover:translate-x-0.5" />
          </Link>

          {/* Features */}
          <ul className="mt-6 space-y-3">
            {plan.features.map((f) => (
              <li key={f} className="flex items-start gap-2.5">
                <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
                <span className="text-sm text-gray-600">{f}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </ScrollReveal>
  )
}

export function Pricing() {
  const { t } = useI18n()
  return (
    <section id="pricing" className="bg-gray-50/50 py-28 lg:py-36">
      <div className="mx-auto max-w-7xl px-6">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
            <Star className="h-3 w-3" />
            {t('landingComponents.pricing.badge')}
          </div>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            {pricingData.title}
          </h2>
          <p className="mt-4 text-base text-gray-500">{pricingData.subtitle}</p>
        </div>

        {/* Plans */}
        <div className="mt-14 grid items-start gap-6 lg:grid-cols-3 lg:gap-8">
          {pricingData.plans.map((plan, i) => (
            <PlanCard key={plan.id} plan={plan} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}

import Link from 'next/link'
import { Check, Star, ArrowRight } from 'lucide-react'
import { pricingData, type PricingPlan } from '@/lib/landing-data'

function PlanCard({ plan }: { plan: PricingPlan }) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border transition-all ${
        plan.highlighted
          ? 'border-blue-200 bg-white shadow-xl shadow-blue-600/10 scale-[1.02]'
          : 'border-gray-200 bg-white shadow-sm hover:shadow-md'
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
          <p className="mt-1 text-xs font-medium text-emerald-600">年付优惠：{plan.yearlyPrice}</p>
        )}

        {/* CTA */}
        <Link
          href="/register"
          className={`mt-6 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
            plan.highlighted
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700'
              : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          {plan.cta}
          <ArrowRight className="h-4 w-4" />
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
  )
}

export function Pricing() {
  return (
    <section id="pricing" className="bg-gray-50 py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-6">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
            <Star className="h-3 w-3" />
            定价方案
          </div>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            {pricingData.title}
          </h2>
          <p className="mt-4 text-base text-gray-500">{pricingData.subtitle}</p>
        </div>

        {/* Plans */}
        <div className="mt-14 grid items-start gap-6 lg:grid-cols-3 lg:gap-8">
          {pricingData.plans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>
      </div>
    </section>
  )
}

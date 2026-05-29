import Link from 'next/link'
import {
  Brain, ShieldCheck, Languages, Split, Eye, HeartPulse, Repeat, BarChart3,
  ArrowRight,
} from 'lucide-react'
import { featuresData, type Feature } from '@/lib/landing-data'

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

const gradients = [
  'from-blue-500 to-indigo-600',
  'from-emerald-500 to-teal-600',
  'from-violet-500 to-purple-600',
  'from-amber-500 to-orange-600',
  'from-cyan-500 to-blue-600',
  'from-rose-500 to-pink-600',
  'from-fuchsia-500 to-purple-600',
  'from-lime-500 to-green-600',
]

function FeatureCard({ feature, index }: { feature: Feature; index: number }) {
  const Icon = iconMap[feature.icon] || Brain
  const gradient = gradients[index % gradients.length]

  return (
    <Link
      href={feature.href}
      className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:border-blue-200 hover:shadow-lg"
    >
      {/* Background glow on hover */}
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-blue-50 opacity-0 blur-2xl transition-opacity group-hover:opacity-100" />

      {/* Icon */}
      <div
        className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} shadow-lg`}
      >
        <Icon className="h-6 w-6 text-white" />
      </div>

      {/* Content */}
      <h3 className="text-base font-bold text-gray-900">{feature.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-gray-500">{feature.description}</p>

      {/* Arrow */}
      <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-blue-600 opacity-0 transition-all group-hover:opacity-100">
        了解更多
        <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  )
}

export function Features() {
  return (
    <section id="features" className="bg-gray-50 py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-6">
        {/* Section header */}
        <div className="mx-auto max-w-2xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
            <Brain className="h-3 w-3" />
            核心功能
          </div>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            {featuresData.title}
          </h2>
          <p className="mt-4 text-base text-gray-500">{featuresData.subtitle}</p>
        </div>

        {/* Feature cards grid */}
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {featuresData.features.map((feature, i) => (
            <FeatureCard key={feature.title} feature={feature} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}

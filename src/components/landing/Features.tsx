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

/** Bento grid layout config: [colSpan, rowSpan] per card index */
const bentoLayout: [number, number][] = [
  [2, 2], // AI 智能拓客 — hero card
  [1, 1],
  [1, 1],
  [1, 2], // A/B 测试 — tall card
  [2, 1],
  [1, 1],
  [1, 1],
  [1, 1],
]

function FeatureCard({ feature, index }: { feature: Feature; index: number }) {
  const Icon = iconMap[feature.icon] || Brain
  const gradient = gradients[index % gradients.length]
  const [colSpan, rowSpan] = bentoLayout[index] || [1, 1]
  const isHero = colSpan === 2 && rowSpan === 2

  return (
    <Link
      href={feature.href}
      className={`group relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] hover:border-blue-200 hover:shadow-xl ${
        colSpan === 2 ? 'md:col-span-2' : ''
      } ${rowSpan === 2 ? 'md:row-span-2' : ''}`}
    >
      {/* Radial gradient spotlight on hover */}
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] group-hover:opacity-100"
        style={{
          background: 'radial-gradient(circle 300px at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(59,130,246,0.08), transparent)',
        }}
      />

      <div className={`relative h-full ${isHero ? 'p-8 lg:p-10' : 'p-6'}`}>
        {/* Icon with damped scale */}
        <div
          className={`mb-4 flex items-center justify-center rounded-xl bg-gradient-to-br ${gradient} shadow-lg transition-transform duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110 group-hover:-translate-y-0.5 ${
            isHero ? 'h-16 w-16' : 'h-12 w-12'
          }`}
        >
          <Icon className={`text-white ${isHero ? 'h-8 w-8' : 'h-6 w-6'}`} />
        </div>

        {/* Content */}
        <h3 className={`font-bold text-gray-900 ${isHero ? 'text-xl' : 'text-base'}`}>
          {feature.title}
        </h3>
        <p className={`mt-2 leading-relaxed text-gray-500 ${isHero ? 'text-sm' : 'text-sm'}`}>
          {feature.description}
        </p>

        {/* Arrow */}
        <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-blue-600 opacity-0 translate-y-1 transition-all duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] group-hover:opacity-100 group-hover:translate-y-0">
          了解更多
          <ArrowRight className="h-3 w-3 transition-transform duration-500 group-hover:translate-x-1" />
        </div>
      </div>
    </Link>
  )
}

export function Features() {
  return (
    <section id="features" className="bg-gray-50/50 py-28 lg:py-36">
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

        {/* Bento Grid */}
        <div className="mt-14 grid auto-rows-[200px] gap-5 md:grid-cols-3 lg:grid-cols-4">
          {featuresData.features.map((feature, i) => (
            <FeatureCard key={feature.title} feature={feature} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}

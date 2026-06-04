'use client'

import { Users, Globe, ShieldCheck, Building2 } from 'lucide-react'
import { statsData } from '@/lib/landing-data'
import { CountUp } from '@/components/landing/CountUp'
import { ScrollReveal } from '@/components/landing/ScrollReveal'

const statIcons = [Users, Globe, ShieldCheck, Building2]

/** Parse a value string like "9亿+" into a numeric end value for CountUp. */
function parseValue(value: string): { num: number; suffix: string; decimals: number } {
  const match = value.match(/^([\d.]+)(.*)$/)
  if (!match) return { num: 0, suffix: value, decimals: 0 }
  const num = parseFloat(match[1])
  const suffix = match[2]
  const decimals = match[1].includes('.') ? match[1].split('.')[1].length : 0
  return { num, suffix, decimals }
}

export function Stats() {
  return (
    <section className="bg-gray-900 py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <ScrollReveal>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {statsData.title}
            </h2>
          </div>
        </ScrollReveal>

        <div className="mt-12 grid grid-cols-2 gap-6 lg:grid-cols-4 lg:gap-8">
          {statsData.stats.map((stat, i) => {
            const Icon = statIcons[i] || Users
            const { num, suffix, decimals } = parseValue(stat.value)
            return (
              <ScrollReveal key={stat.label} delay={i * 100}>
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
                    <Icon className="h-6 w-6 text-blue-400" />
                  </div>
                  <p className="text-3xl font-extrabold text-white sm:text-4xl">
                    <CountUp end={num} suffix={suffix} decimals={decimals} duration={2200} />
                  </p>
                  <p className="mt-1 text-sm font-medium text-gray-300">{stat.label}</p>
                  <p className="mt-1 text-xs text-gray-500">{stat.description}</p>
                </div>
              </ScrollReveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}

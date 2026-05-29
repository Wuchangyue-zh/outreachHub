import { Users, Globe, ShieldCheck, Building2 } from 'lucide-react'
import { statsData } from '@/lib/landing-data'

const statIcons = [Users, Globe, ShieldCheck, Building2]

export function Stats() {
  return (
    <section className="bg-gray-900 py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {statsData.title}
          </h2>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-6 lg:grid-cols-4 lg:gap-8">
          {statsData.stats.map((stat, i) => {
            const Icon = statIcons[i] || Users
            return (
              <div key={stat.label} className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
                  <Icon className="h-6 w-6 text-blue-400" />
                </div>
                <p className="text-3xl font-extrabold text-white sm:text-4xl">{stat.value}</p>
                <p className="mt-1 text-sm font-medium text-gray-300">{stat.label}</p>
                <p className="mt-1 text-xs text-gray-500">{stat.description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

'use client'

import { useState } from 'react'
import { Zap, Gift, CreditCard, ShieldCheck, Lock } from 'lucide-react'
import { ctaData } from '@/lib/landing-data'

const featureIcons: Record<string, React.ElementType> = {
  zap: Zap,
  gift: Gift,
  'credit-card': CreditCard,
}

export function CTA() {
  const [email, setEmail] = useState('')

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 py-20 lg:py-28">
      {/* Background decoration */}
      <div className="absolute -left-32 -top-32 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
      <div className="absolute -bottom-32 -right-32 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {ctaData.title}
          </h2>
          <p className="mt-4 text-lg text-blue-100">{ctaData.subtitle}</p>

          {/* Feature badges */}
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            {ctaData.features.map((f) => {
              const Icon = featureIcons[f.icon] || Zap
              return (
                <div key={f.text} className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2">
                  <Icon className="h-4 w-4 text-blue-200" />
                  <span className="text-sm font-medium text-white">{f.text}</span>
                </div>
              )
            })}
          </div>

          {/* Email form */}
          <div className="mx-auto mt-10 max-w-md">
            <form
              onSubmit={(e) => e.preventDefault()}
              className="flex gap-2 rounded-xl bg-white/10 p-1.5 backdrop-blur-sm"
            >
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={ctaData.form.placeholder}
                className="flex-1 rounded-lg bg-white/10 px-4 py-3 text-sm text-white placeholder-blue-200 outline-none focus:bg-white/20"
              />
              <button
                type="submit"
                className="rounded-lg bg-white px-6 py-3 text-sm font-semibold text-blue-700 shadow-lg transition-all hover:bg-blue-50 hover:shadow-xl"
              >
                {ctaData.form.button}
              </button>
            </form>
            <p className="mt-3 text-xs text-blue-200">{ctaData.form.note}</p>
          </div>

          {/* Trust badges */}
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            {ctaData.trustBadges.map((badge) => (
              <div key={badge} className="flex items-center gap-1.5 text-blue-200">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">{badge}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

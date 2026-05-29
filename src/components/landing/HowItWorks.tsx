import { Target, ScanSearch, Rocket, ArrowRight } from 'lucide-react'
import { howItWorksData } from '@/lib/landing-data'

const stepIcons = [Target, ScanSearch, Rocket]

export function HowItWorks() {
  return (
    <section className="py-28 lg:py-36">
      <div className="mx-auto max-w-7xl px-6">
        {/* Section header */}
        <div className="mx-auto max-w-2xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
            <Rocket className="h-3 w-3" />
            使用流程
          </div>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            {howItWorksData.title}
          </h2>
          <p className="mt-4 text-base text-gray-500">{howItWorksData.subtitle}</p>
        </div>

        {/* Steps */}
        <div className="mt-16 grid gap-8 lg:grid-cols-3">
          {howItWorksData.steps.map((step, i) => {
            const Icon = stepIcons[i] || Target
            return (
              <div key={step.number} className="relative">
                {/* Connector line (desktop) */}
                {i < 2 && (
                  <div className="absolute left-[calc(50%+2rem)] top-10 hidden h-0.5 w-[calc(100%-4rem)] bg-gradient-to-r from-blue-200 to-blue-100 lg:block" />
                )}

                <div className="relative flex flex-col items-center text-center">
                  {/* Number + Icon */}
                  <div className="relative mb-6">
                    <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-xl shadow-blue-600/20">
                      <Icon className="h-9 w-9 text-white" />
                    </div>
                    <div className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm font-bold text-blue-600 shadow-md ring-2 ring-blue-100">
                      {step.number}
                    </div>
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-bold text-gray-900">{step.title}</h3>
                  <p className="mt-3 max-w-sm text-sm leading-relaxed text-gray-500">
                    {step.description}
                  </p>

                  {/* Detail tag */}
                  <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5">
                    <span className="text-[11px] font-medium text-blue-700">{step.detail}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Bottom CTA */}
        <div className="mt-14 text-center">
          <a
            href="/register"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-700 hover:shadow-xl"
          >
            立即体验 3 步获客
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  )
}

'use client'

import { trustBarData, type TrustLogo } from '@/lib/landing-data'

function LogoCard({ logo }: { logo: TrustLogo }) {
  return (
    <div className="flex h-16 w-40 flex-shrink-0 items-center justify-center rounded-xl border border-gray-100 bg-white px-4 shadow-sm transition-all hover:border-blue-200 hover:shadow-md">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-bold text-white">
          {logo.abbr.charAt(0)}
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-800 leading-tight">{logo.name}</p>
          <p className="text-[10px] text-gray-400">{logo.industry}</p>
        </div>
      </div>
    </div>
  )
}

export function TrustBar() {
  // Duplicate logos for seamless infinite scroll
  const allLogos = [...trustBarData.logos, ...trustBarData.logos]

  return (
    <section className="border-y border-gray-100 bg-gray-50/50 py-12">
      <div className="mx-auto max-w-7xl px-6">
        <p className="mb-8 text-center text-sm font-medium text-gray-400">
          {trustBarData.title}
        </p>

        {/* Scrolling container */}
        <div className="relative overflow-hidden">
          {/* Fade edges */}
          <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-24 bg-gradient-to-r from-gray-50/80 to-transparent" />
          <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-24 bg-gradient-to-l from-gray-50/80 to-transparent" />

          {/* Scrolling track */}
          <div className="flex gap-4 animate-[scroll_30s_linear_infinite]">
            {allLogos.map((logo, i) => (
              <LogoCard key={`${logo.name}-${i}`} logo={logo} />
            ))}
          </div>
        </div>
      </div>

      {/* Keyframes injected via Tailwind arbitrary values */}
      <style>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </section>
  )
}

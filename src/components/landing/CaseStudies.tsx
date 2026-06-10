'use client'

import { useState } from 'react'
import { useI18n } from '@/hooks/use-i18n'
import { Quote, TrendingUp, ArrowRight } from 'lucide-react'
import { caseStudiesData, type CaseStudy } from '@/lib/landing-data'
import { ScrollReveal } from '@/components/landing/ScrollReveal'

const industryColors: Record<string, { bg: string; text: string; border: string; accent: string }> = {
  '电子行业': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', accent: 'bg-blue-600' },
  '机械行业': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', accent: 'bg-emerald-600' },
  '纺织行业': { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', accent: 'bg-violet-600' },
}

function CaseCard({ caseData, index }: { caseData: CaseStudy; index: number }) {
  const { t } = useI18n()
  const colors = industryColors[caseData.industryTag] || industryColors['电子行业']
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] hover:shadow-xl hover:-translate-y-1">
      {/* Header */}
      <div className={`${colors.bg} px-6 py-4`}>
        <div className="flex items-center justify-between">
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors.bg} ${colors.text} ring-1 ring-inset ${colors.border}`}>
            {caseData.industryTag}
          </span>
          <span className="text-xs text-gray-400">{t('landingComponents.cases.caseNumber', { num: String(index + 1).padStart(2, '0') })}</span>
        </div>
        <h3 className="mt-3 text-lg font-bold text-gray-900">{caseData.company}</h3>
        <p className="mt-1 text-xs text-gray-500">{caseData.companyDesc}</p>
      </div>

      {/* Body */}
      <div className="px-6 py-5">
        {/* Challenge with smooth collapse */}
        <div className="mb-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">{t('landingComponents.cases.challenge')}</h4>
          <div
            className="grid transition-all duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)]"
            style={{ gridTemplateRows: expanded ? '1fr' : '0fr' }}
          >
            <div className="overflow-hidden">
              <p className="mt-2 text-sm leading-relaxed text-gray-600">{caseData.challenge}</p>
            </div>
          </div>
          {!expanded && (
            <p className="mt-2 text-sm leading-relaxed text-gray-600 line-clamp-2">{caseData.challenge}</p>
          )}
        </div>

        {/* Solution with smooth collapse */}
        <div className="mb-5">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">{t('landingComponents.cases.solution')}</h4>
          <div
            className="grid transition-all duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)]"
            style={{ gridTemplateRows: expanded ? '1fr' : '0fr' }}
          >
            <div className="overflow-hidden">
              <p className="mt-2 text-sm leading-relaxed text-gray-600">{caseData.solution}</p>
            </div>
          </div>
          {!expanded && (
            <p className="mt-2 text-sm leading-relaxed text-gray-600 line-clamp-2">{caseData.solution}</p>
          )}
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="mb-5 flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors duration-300"
        >
          {expanded ? t('landingComponents.cases.collapse') : t('landingComponents.cases.expand')}
          <ChevronIcon isOpen={expanded} />
        </button>

        {/* Results grid */}
        <div className="grid grid-cols-2 gap-3">
          {caseData.results.map((r) => (
            <div key={r.label} className="rounded-xl bg-gray-50 p-3 text-center">
              <p className="text-xl font-extrabold text-gray-900">{r.value}</p>
              <p className="mt-0.5 text-[10px] text-gray-500">{r.label}</p>
            </div>
          ))}
        </div>

        {/* Quote */}
        <div className="mt-5 rounded-xl border border-gray-100 bg-gray-50 p-4">
          <Quote className="h-4 w-4 text-gray-300" />
          <p className="mt-2 text-sm leading-relaxed text-gray-600 italic">&ldquo;{caseData.quote}&rdquo;</p>
          <div className="mt-3 flex items-center gap-2">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full ${colors.accent} text-xs font-bold text-white`}>
              {caseData.author.charAt(0)}
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-900">{caseData.author}</p>
              <p className="text-[10px] text-gray-400">{caseData.authorTitle}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ChevronIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      className="h-3 w-3 transition-transform duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)]"
      style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  )
}

export function CaseStudies() {
  const { t } = useI18n()
  return (
    <section id="cases" className="bg-gray-50/50 py-28 lg:py-36">
      <div className="mx-auto max-w-7xl px-6">
        {/* Section header */}
        <ScrollReveal>
          <div className="mx-auto max-w-2xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
              <TrendingUp className="h-3 w-3" />
              {t('landingComponents.cases.badge')}
            </div>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              {caseStudiesData.title}
            </h2>
            <p className="mt-4 text-base text-gray-500">{caseStudiesData.subtitle}</p>
          </div>
        </ScrollReveal>

        {/* Case cards */}
        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {caseStudiesData.cases.map((c, i) => (
            <ScrollReveal key={c.id} delay={i * 120}>
              <CaseCard key={c.id} caseData={c} index={i} />
            </ScrollReveal>
          ))}
        </div>

        {/* Bottom CTA */}
        <ScrollReveal delay={360}>
          <div className="mt-12 text-center">
            <a
              href="/register"
              className="group/cases-cta inline-flex items-center gap-2 text-sm font-semibold text-blue-600 transition-colors duration-300 hover:text-blue-700"
            >
              {t('landingComponents.cases.viewMore')}
              <ArrowRight className="h-4 w-4 transition-transform duration-500 group-hover/cases-cta:translate-x-1" />
            </a>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}

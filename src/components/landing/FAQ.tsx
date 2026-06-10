'use client'

import { useState } from 'react'
import { useI18n } from '@/hooks/use-i18n'
import { ChevronDown, HelpCircle } from 'lucide-react'
import { faqData, type FAQItem } from '@/lib/landing-data'

function FAQItem({ item, isOpen, onToggle }: { item: FAQItem; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 py-5 text-left"
      >
        <span className="text-base font-semibold text-gray-900">{item.question}</span>
        <ChevronDown
          className="h-5 w-5 flex-shrink-0 text-gray-400 transition-transform duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)]"
          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>
      {/* Smooth collapse using grid-template-rows */}
      <div
        className="grid transition-all duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)]"
        style={{
          gridTemplateRows: isOpen ? '1fr' : '0fr',
        }}
      >
        <div className="overflow-hidden">
          <div className="pb-5 pr-12">
            <p className="text-sm leading-relaxed text-gray-600">{item.answer}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export function FAQ() {
  const { t } = useI18n()
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <section id="faq" className="py-28 lg:py-36">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-12 lg:grid-cols-5">
          {/* Left: Header */}
          <div className="lg:col-span-2">
            <div className="sticky top-24">
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                <HelpCircle className="h-3 w-3" />
                {t('landingComponents.faq.badge')}
              </div>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                {faqData.title}
              </h2>
              <p className="mt-4 text-base text-gray-500">{faqData.subtitle}</p>
              <div className="mt-8 rounded-xl bg-blue-50 p-5">
                <p className="text-sm font-medium text-blue-900">{t('landingComponents.faq.otherQuestions')}</p>
                <p className="mt-1 text-sm text-blue-700">{t('landingComponents.faq.contactDesc')}</p>
                <a
                  href="mailto:support@outreachhub.com"
                  className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors duration-300"
                >
                  support@outreachhub.com →
                </a>
              </div>
            </div>
          </div>

          {/* Right: FAQ items */}
          <div className="lg:col-span-3">
            <div className="rounded-2xl border border-gray-100 bg-white px-6 shadow-sm">
              {faqData.items.map((item, i) => (
                <FAQItem
                  key={item.question}
                  item={item}
                  isOpen={openIndex === i}
                  onToggle={() => setOpenIndex(openIndex === i ? null : i)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Schema.org FAQPage structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faqData.items.map((item) => ({
              '@type': 'Question',
              name: item.question,
              acceptedAnswer: {
                '@type': 'Answer',
                text: item.answer,
              },
            })),
          }),
        }}
      />
    </section>
  )
}

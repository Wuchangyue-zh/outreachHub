import Link from 'next/link'
import { useI18n } from '@/hooks/use-i18n'
import { knowledgeData } from '@/lib/landing-data'
import { BookOpen, ArrowRight } from 'lucide-react'
import { ScrollReveal } from '@/components/landing/ScrollReveal'

export function Knowledge() {
  const { t } = useI18n()
  return (
    <section id="knowledge" className="py-28 lg:py-36">
      <div className="mx-auto max-w-7xl px-6">
        {/* Header */}
        <ScrollReveal>
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
              <BookOpen className="h-3 w-3" />
              {t('landingComponents.knowledge.badge')}
            </div>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              {knowledgeData.title}
            </h2>
            <p className="mt-4 text-base text-gray-500">
              {knowledgeData.subtitle}
            </p>
          </div>
        </ScrollReveal>

        {/* Article cards */}
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {knowledgeData.articles.map((article, i) => (
            <ScrollReveal key={article.slug} delay={i * 100}>
              <Link
                href={`/knowledge/${article.slug}`}
                className="group flex flex-col rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 hover:border-blue-100 hover:shadow-md"
              >
                {/* Category & read time */}
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>{article.category}</span>
                  <span className="text-gray-300">&middot;</span>
                  <span>{article.readTime}</span>
                </div>

                {/* Title */}
                <h3 className="mt-3 text-lg font-semibold leading-snug text-gray-900 transition-colors group-hover:text-blue-600">
                  {article.title}
                </h3>

                {/* Summary */}
                <p className="mt-2 flex-1 text-sm leading-relaxed text-gray-500 line-clamp-3">
                  {article.summary}
                </p>

                {/* Tags */}
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {article.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-gray-50 px-2.5 py-0.5 text-xs text-gray-500"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Read more */}
                <div className="mt-5 flex items-center gap-1 text-sm font-semibold text-blue-600 transition-colors group-hover:text-blue-700">
                  {t('landingComponents.knowledge.readMore')}
                  <ArrowRight className="h-4 w-4 transition-transform duration-500 group-hover:translate-x-1" />
                </div>
              </Link>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}

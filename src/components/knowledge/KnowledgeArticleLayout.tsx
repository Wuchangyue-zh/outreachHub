'use client'

import { useRef, useState, useEffect } from 'react'
import Link from 'next/link'
import {
  BookOpen, ArrowLeft, Calendar, Clock, Share2, Twitter, Linkedin, Copy,
  Check, ChevronDown, Zap, Shield, Users, BarChart3, Heart,
} from 'lucide-react'
import { TableOfContents } from './TableOfContents'
import { ArticleContent } from './ArticleContent'
import { useReadingProgress } from '@/hooks/useReadingProgress'
import { useI18n } from '@/hooks/use-i18n'

interface KnowledgeArticleLayoutProps {
  article: {
    slug: string
    title: string
    summary: string
    category: string
    readTime: string
    tags: string[]
    content: string
    publishedAt: string
    author: string
  }
  relatedArticles: {
    slug: string
    title: string
    summary: string
    category: string
    readTime: string
    tags: string[]
    content: string
    publishedAt: string
    author: string
  }[]
}

const categoryIcons: Record<string, React.ElementType> = {
  '开发信技巧': Zap,
  '海关数据': BarChart3,
  '邮件送达': Shield,
}

const categoryColors: Record<string, string> = {
  '开发信技巧': 'from-amber-500 to-orange-600',
  '海关数据': 'from-blue-500 to-indigo-600',
  '邮件送达': 'from-emerald-500 to-teal-600',
}

export function KnowledgeArticleLayout({ article, relatedArticles }: KnowledgeArticleLayoutProps) {
  const articleRef = useRef<HTMLElement>(null)
  const progress = useReadingProgress(articleRef)
  const [tocOpen, setTocOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [shareMenuOpen, setShareMenuOpen] = useState(false)
  const { t } = useI18n()

  // Close share menu on outside click
  useEffect(() => {
    if (!shareMenuOpen) return
    const handler = () => setShareMenuOpen(false)
    const timer = setTimeout(() => document.addEventListener('click', handler), 0)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('click', handler)
    }
  }, [shareMenuOpen])

  const shareUrl = typeof window !== 'undefined' ? window.location.href : ''
  const shareTitle = article.title

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* ignore */ }
  }

  const CategoryIcon = categoryIcons[article.category] || BookOpen
  const gradient = categoryColors[article.category] || 'from-blue-500 to-indigo-600'

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50/50 to-white">
      {/* Reading progress bar */}
      <div className="fixed left-0 right-0 top-0 z-[70] h-1 bg-gray-100">
        <div
          className={`h-full bg-gradient-to-r ${gradient} transition-[width] duration-150 ease-out`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* ── NAVBAR ── */}
      <header className="sticky top-1 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-lg font-bold text-gray-900"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600">
                <BookOpen className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="hidden sm:inline">OutreachHub</span>
            </Link>
            <span className="hidden text-xs text-gray-300 sm:inline">|</span>
            <Link
              href="/#knowledge"
              className="hidden items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-gray-900 sm:flex"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {t('knowledge.knowledgeBase')}
            </Link>
          </div>

          <div className="flex items-center gap-2">
            {/* Share */}
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setShareMenuOpen(!shareMenuOpen) }}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900"
              >
                <Share2 className="h-4 w-4" />
                <span className="hidden sm:inline">{t('knowledge.share')}</span>
              </button>
              {shareMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-gray-100 bg-white p-2 shadow-xl">
                  <a
                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTitle)}&url=${encodeURIComponent(shareUrl)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    <Twitter className="h-4 w-4 text-sky-500" />
                    Twitter / X
                  </a>
                  <a
                    href={`https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(shareTitle)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    <Linkedin className="h-4 w-4 text-blue-700" />
                    LinkedIn
                  </a>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleCopyLink() }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                    {copied ? t('knowledge.copied') : t('knowledge.copyLink')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── ARTICLE HERO ── */}
      <div className={`relative overflow-hidden border-b border-gray-100 bg-gradient-to-br ${gradient}`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.1),transparent_50%)]" />
        <div className="relative mx-auto max-w-4xl px-6 py-12 lg:py-16">
          {/* Breadcrumb */}
          <nav className="mb-6 flex items-center gap-2 text-sm text-white/60">
            <Link href="/" className="hover:text-white transition-colors">{t('knowledge.home')}</Link>
            <span>/</span>
            <Link href="/#knowledge" className="hover:text-white transition-colors">{t('knowledge.knowledgeBase')}</Link>
            <span>/</span>
            <span className="text-white">{article.category}</span>
          </nav>

          {/* Category badge */}
          <div className="mb-4 flex items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">
              <CategoryIcon className="h-3.5 w-3.5" />
              {article.category}
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl lg:leading-tight">
            {article.title}
          </h1>

          {/* Summary */}
          <p className="mt-4 text-base leading-relaxed text-white/80 lg:text-lg">
            {article.summary}
          </p>

          {/* Author + Meta */}
          <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-white/60">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-xs font-bold text-white">
                {article.author.charAt(0)}
              </div>
              <span className="text-white">{article.author}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {article.publishedAt}
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {article.readTime}
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid gap-12 lg:grid-cols-[1fr_260px]">
          {/* Article body */}
          <article ref={articleRef} className="mx-auto max-w-3xl">
            <ArticleContent html={article.content} />

            {/* Tags */}
            <div className="mt-12 flex flex-wrap gap-2 border-t border-gray-100 pt-8">
              {article.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-gray-100 px-3.5 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-200"
                >
                  #{tag}
                </span>
              ))}
            </div>

            {/* Divider */}
            <div className="mt-12 flex items-center gap-4">
              <div className="h-px flex-1 bg-gray-100" />
              <Heart className="h-5 w-5 text-gray-300" />
              <div className="h-px flex-1 bg-gray-100" />
            </div>

            {/* Author bio card */}
            <div className="mt-8 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-bold text-white shadow-lg">
                  OH
                </div>
                <div>
                  <p className="text-base font-bold text-gray-900">{article.author}</p>
                  <p className="mt-1 text-sm text-gray-500">
                    {t('knowledge.authorBio')}
                  </p>
                  <Link
                    href="/#knowledge"
                    className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 transition-colors hover:text-blue-700"
                  >
                    {t('knowledge.readMore')}
                  </Link>
                </div>
              </div>
            </div>

            {/* Related articles */}
            {relatedArticles.length > 0 && (
              <div className="mt-12">
                <h3 className="text-xl font-bold text-gray-900">{t('knowledge.relatedArticles')}</h3>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {relatedArticles.map((rel) => (
                    <Link
                      key={rel.slug}
                      href={`/knowledge/${rel.slug}`}
                      className="group rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition-all duration-300 hover:border-blue-100 hover:shadow-md"
                    >
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <BookOpen className="h-3 w-3" />
                        <span>{rel.category}</span>
                        <span className="text-gray-300">·</span>
                        <span>{rel.readTime}</span>
                      </div>
                      <p className="mt-2 text-sm font-semibold text-gray-900 leading-snug transition-colors group-hover:text-blue-600">
                        {rel.title}
                      </p>
                      <p className="mt-1.5 text-xs text-gray-500 line-clamp-2">
                        {rel.summary}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Back to knowledge nav */}
            <div className="mt-12 flex items-center justify-between border-t border-gray-100 pt-8">
              <Link
                href="/#knowledge"
                className="flex items-center gap-2 text-sm font-medium text-gray-500 transition-colors hover:text-gray-900"
              >
                <ArrowLeft className="h-4 w-4" />
                {t('knowledge.backToKnowledgeBase')}
              </Link>
              <Link
                href="/register"
                className="group/btn inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 hover:shadow-md"
              >
                {t('knowledge.freeTrial')}
                <ArrowLeft className="h-3.5 w-3.5 rotate-180 transition-transform group-hover/btn:translate-x-0.5" />
              </Link>
            </div>
          </article>

          {/* ── SIDEBAR ── */}
          <aside className="hidden lg:block">
            <TableOfContents content={article.content} />
          </aside>

          {/* Mobile TOC toggle */}
          <div className="lg:hidden">
            <button
              onClick={() => setTocOpen(!tocOpen)}
              className="flex w-full items-center justify-between rounded-xl border border-gray-100 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm"
            >
              {t('knowledge.articleToc')}
              <ChevronDown className={`h-4 w-4 transition-transform ${tocOpen ? 'rotate-180' : ''}`} />
            </button>
            {tocOpen && (
              <div className="mt-3">
                <TableOfContents content={article.content} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── BOTTOM CTA ── */}
      <section className="border-t border-gray-100 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 py-20 lg:py-28">
        <div className="relative mx-auto max-w-7xl px-6">
          <div className="absolute -left-32 -top-32 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute -bottom-32 -right-32 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />

          <div className="relative mx-auto max-w-2xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-blue-200">
              <Zap className="h-3 w-3" />
              {t('knowledge.cta.badge')}
            </div>
            <h2 className="mt-5 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {t('knowledge.cta.title')}
            </h2>
            <p className="mt-4 text-lg text-blue-100">
              {t('knowledge.cta.subtitle')}
            </p>

            {/* Feature pills */}
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {[
                { icon: Zap, text: t('knowledge.cta.feature1') },
                { icon: Shield, text: t('knowledge.cta.feature2') },
                { icon: Users, text: t('knowledge.cta.feature3') },
              ].map((f) => (
                <div key={f.text} className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2">
                  <f.icon className="h-4 w-4 text-blue-200" />
                  <span className="text-sm font-medium text-white">{f.text}</span>
                </div>
              ))}
            </div>

            {/* CTA button */}
            <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-base font-semibold text-blue-700 shadow-lg transition-all duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] hover:bg-blue-50 hover:shadow-xl"
              >
                {t('knowledge.cta.freeTrial14Days')}
                <ArrowLeft className="h-4 w-4 rotate-180" />
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:bg-white/10"
              >
                {t('knowledge.cta.bookDemo')}
              </Link>
            </div>

            {/* Trust */}
            <p className="mt-5 text-xs text-blue-200/60">
              {t('knowledge.cta.trust')}
            </p>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-gray-100 bg-white py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 text-sm text-gray-400 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-600">
              <BookOpen className="h-3 w-3 text-white" />
            </div>
            <span>© 2026 OutreachHub</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/terms" className="transition-colors hover:text-gray-900">{t('knowledge.terms')}</Link>
            <Link href="/privacy" className="transition-colors hover:text-gray-900">{t('knowledge.privacy')}</Link>
            <Link href="/#knowledge" className="transition-colors hover:text-gray-900">{t('knowledge.knowledgeBase')}</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

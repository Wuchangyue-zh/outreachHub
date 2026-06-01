import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getArticleBySlug, getAllArticleSlugs } from '../../../../content/knowledge'

type Props = { params: Promise<{ slug: string }> }

export async function generateStaticParams() {
  return getAllArticleSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const article = getArticleBySlug(slug)
  if (!article) return {}
  return {
    title: `${article.title} | OutreachHub 知识库`,
    description: article.summary,
    openGraph: {
      title: article.title,
      description: article.summary,
      type: 'article',
      publishedTime: article.publishedAt,
      authors: [article.author],
      tags: article.tags,
    },
  }
}

export default async function KnowledgeArticlePage({ params }: Props) {
  const { slug } = await params
  const article = getArticleBySlug(slug)
  if (!article) notFound()

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="text-xl font-bold tracking-tight text-gray-900"
          >
            OutreachHub
          </Link>
          <Link
            href="/#knowledge"
            className="text-sm font-medium text-gray-500 transition-colors hover:text-gray-900"
          >
            &larr; 返回知识库
          </Link>
        </div>
      </header>

      {/* Article */}
      <article className="mx-auto max-w-3xl px-6 py-12 lg:py-16">
        {/* Meta bar */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
            {article.category}
          </span>
          <span className="text-sm text-gray-400">{article.readTime}</span>
          <span className="text-sm text-gray-400">{article.publishedAt}</span>
        </div>

        {/* Title */}
        <h1 className="mt-5 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          {article.title}
        </h1>

        {/* Summary */}
        <p className="mt-4 text-lg leading-relaxed text-gray-500">
          {article.summary}
        </p>

        {/* Author */}
        <div className="mt-6 flex items-center gap-3 border-b border-gray-100 pb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
            OH
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{article.author}</p>
            <p className="text-xs text-gray-400">发布于 {article.publishedAt}</p>
          </div>
        </div>

        {/* Content body */}
        <div
          className="prose prose-gray mt-10 max-w-none prose-headings:scroll-mt-24 prose-headings:font-bold prose-h2:mt-12 prose-h2:text-2xl prose-h3:text-xl prose-p:leading-relaxed prose-a:text-blue-600 prose-code:rounded prose-code:bg-gray-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:text-sm prose-ul:list-disc prose-ol:list-decimal dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: article.content }}
        />

        {/* Tags */}
        <div className="mt-12 flex flex-wrap gap-2 border-t border-gray-100 pt-8">
          {article.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-12 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 p-8 text-center">
          <h3 className="text-xl font-semibold text-gray-900">
            准备好提升你的外贸效率了吗？
          </h3>
          <p className="mt-2 text-sm text-gray-600">
            立即注册 OutreachHub，体验智能拓客与邮件营销
          </p>
          <Link
            href="/register"
            className="mt-5 inline-flex items-center rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            免费试用 14 天
          </Link>
        </div>
      </article>
    </div>
  )
}

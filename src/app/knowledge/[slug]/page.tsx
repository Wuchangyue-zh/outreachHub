import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getArticleBySlug, getAllArticleSlugs, getAllArticles } from '../../../../content/knowledge'
import { KnowledgeArticleLayout } from '@/components/knowledge/KnowledgeArticleLayout'

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

  // Related articles: same category, exclude current
  const related = getAllArticles()
    .filter((a) => a.slug !== slug && a.category === article.category)
    .slice(0, 2)
  // If no same-category articles, show other articles
  if (related.length === 0) {
    related.push(
      ...getAllArticles()
        .filter((a) => a.slug !== slug)
        .slice(0, 2)
    )
  }

  return (
    <KnowledgeArticleLayout article={article} relatedArticles={related} />
  )
}

import type { Metadata } from 'next'
import LandingContent from './landing-content'

export const metadata: Metadata = {
  title: 'OutreachHub - 智能海外拓客与邮件营销平台',
  description: 'OutreachHub是面向中国出海企业的智能海外拓客与邮件营销SaaS平台。AI驱动精准客户挖掘、个性化邮件生成、自动化营销序列，帮助外贸企业高效拓展海外市场。',
  keywords: ['海外拓客', '邮件营销', '外贸获客', 'B2B营销', '邮件自动化', 'AI邮件', '客户管理'],
  openGraph: {
    title: 'OutreachHub - 智能海外拓客与邮件营销平台',
    description: '面向中国出海企业的智能海外拓客与邮件营销SaaS平台，AI驱动精准获客',
    url: '/',
    siteName: 'OutreachHub',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    locale: 'zh_CN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OutreachHub - 智能海外拓客与邮件营销平台',
    description: '面向中国出海企业的智能海外拓客与邮件营销SaaS平台',
    images: ['/og-image.png'],
  },
}

export default function LandingPage() {
  return <LandingContent />
}

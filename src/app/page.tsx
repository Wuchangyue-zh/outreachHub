import type { Metadata } from 'next'
import { Navbar } from '@/components/landing/Navbar'
import { Hero } from '@/components/landing/Hero'
import { TrustBar } from '@/components/landing/TrustBar'
import { PainPoints } from '@/components/landing/PainPoints'
import { Solutions } from '@/components/landing/Solutions'
import { Features } from '@/components/landing/Features'
import { HowItWorks } from '@/components/landing/HowItWorks'
import { CaseStudies } from '@/components/landing/CaseStudies'
import { Stats } from '@/components/landing/Stats'
import { Pricing } from '@/components/landing/Pricing'
import { FAQ } from '@/components/landing/FAQ'
import { Security } from '@/components/landing/Security'
import { CTA } from '@/components/landing/CTA'
import { Footer } from '@/components/landing/Footer'

export const metadata: Metadata = {
  title: 'OutreachHub - AI 驱动的海外获客与邮件营销平台',
  description:
    'OutreachHub 整合 9 亿+全球企业联系人、60 亿+海关交易记录，通过 AI 智能匹配与自动化邮件营销，帮助中国外贸企业将获客成本降低 60%，询盘量提升 300%。',
  keywords: [
    '外贸获客', '海外拓客', '邮件营销', '海关数据', 'EDM营销',
    '自动化邮件', 'B2B营销', 'AI邮件生成', '外贸开发信', '客户管理',
    'cold email', 'lead generation', 'B2B outreach', 'email marketing',
  ],
  openGraph: {
    title: 'OutreachHub - AI 驱动的海外获客与邮件营销平台',
    description: '整合 9 亿+联系人、60 亿+海关数据，AI 智能匹配与自动化邮件营销，获客成本降低 60%',
    url: '/',
    siteName: 'OutreachHub',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    locale: 'zh_CN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OutreachHub - AI 驱动的海外获客与邮件营销平台',
    description: '整合 9 亿+联系人、60 亿+海关数据，AI 智能匹配与自动化邮件营销',
    images: ['/og-image.png'],
  },
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <Hero />
      <TrustBar />
      <PainPoints />
      <Solutions />
      <Features />
      <HowItWorks />
      <CaseStudies />
      <Stats />
      <Pricing />
      <FAQ />
      <Security />
      <CTA />
      <Footer />
    </div>
  )
}

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
import { Knowledge } from '@/components/landing/Knowledge'
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
      {/* Subtle dot grid background pattern */}
      <div
        className="fixed inset-0 -z-10 opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />
      {/* Mesh gradient accent */}
      <div className="fixed left-0 top-0 -z-10 h-[600px] w-[800px] opacity-30 blur-3xl" style={{ background: 'radial-gradient(ellipse at 20% 50%, rgba(59,130,246,0.15), transparent 70%)' }} />
      <div className="fixed right-0 top-1/3 -z-10 h-[500px] w-[600px] opacity-20 blur-3xl" style={{ background: 'radial-gradient(ellipse at 80% 50%, rgba(99,102,241,0.12), transparent 70%)' }} />

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
      <Knowledge />
      <CTA />
      <Footer />
    </div>
  )
}

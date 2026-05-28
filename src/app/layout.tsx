import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ToastProvider } from '@/components/ui/toast'
import { ThemeProvider } from '@/components/ThemeProvider'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: 'OutreachHub - 智能海外拓客与邮件营销平台',
    template: '%s | OutreachHub',
  },
  description: 'OutreachHub是面向中国出海企业的智能海外拓客与邮件营销SaaS平台。提供AI驱动的精准客户挖掘、个性化邮件生成、自动化营销序列、邮箱验证、邮件追踪等功能，帮助外贸企业高效拓展海外客户，提升转化率。',
  keywords: [
    '海外拓客', '邮件营销', '外贸获客', 'B2B营销', '邮件自动化',
    'AI邮件生成', '邮箱验证', '客户管理', 'CRM', 'SaaS',
    'outreach', 'cold email', 'email marketing', 'lead generation',
    '外贸软件', '跨境电商', '国际市场', '客户挖掘',
  ],
  authors: [{ name: 'OutreachHub Team' }],
  creator: 'OutreachHub',
  publisher: 'OutreachHub',
  metadataBase: new URL(process.env.APP_URL || 'http://localhost:3030'),
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    url: '/',
    siteName: 'OutreachHub',
    title: 'OutreachHub - 智能海外拓客与邮件营销平台',
    description: '面向中国出海企业的智能海外拓客与邮件营销SaaS平台，AI驱动精准获客',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'OutreachHub 智能海外拓客平台',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OutreachHub - 智能海外拓客与邮件营销平台',
    description: '面向中国出海企业的智能海外拓客与邮件营销SaaS平台',
    images: ['/og-image.png'],
    creator: '@outreachhub',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: '/',
    languages: {
      'zh-CN': '/zh-CN',
      'en-US': '/en-US',
    },
  },
  category: 'technology',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <head>
        {/* Preconnect for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

        {/* Favicon */}
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />

        {/* Manifest */}
        <link rel="manifest" href="/manifest.json" />

        {/* Theme color */}
        <meta name="theme-color" content="#3b82f6" />
        <meta name="msapplication-TileColor" content="#3b82f6" />

        {/* Additional SEO meta tags */}
        <meta name="application-name" content="OutreachHub" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="OutreachHub" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />

        {/* Structured Data - Organization */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'OutreachHub',
              url: process.env.APP_URL || 'http://localhost:3030',
              logo: `${process.env.APP_URL || 'http://localhost:3030'}/logo.png`,
              description: '智能海外拓客与邮件营销SaaS平台',
              sameAs: [
                'https://twitter.com/outreachhub',
                'https://linkedin.com/company/outreachhub',
              ],
            }),
          }}
        />

        {/* Structured Data - Software Application */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              name: 'OutreachHub',
              applicationCategory: 'BusinessApplication',
              operatingSystem: 'Web',
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'USD',
                description: 'Free plan available',
              },
              description: '智能海外拓客与邮件营销SaaS平台，帮助中国出海企业高效拓展海外客户',
              featureList: [
                'AI智能拓客',
                '邮件营销自动化',
                '邮箱验证',
                '客户管理CRM',
                '邮件追踪',
                '多语言支持',
              ],
            }),
          }}
        />
      </head>
      <body className={inter.className}>
        <ThemeProvider defaultTheme="system" storageKey="outreach-hub-theme">
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

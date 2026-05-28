import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ToastProvider } from '@/components/ui/toast'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'OutreachHub - 智能海外拓客与邮件营销平台',
  description: '面向中国出海企业的智能海外客户拓客、邮件营销、客户关系管理平台',
  keywords: ['海外拓客', '邮件营销', '外贸', 'SaaS', 'CRM', 'AI邮件'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  )
}

import Link from 'next/link'
import { ArrowLeft, Handshake, Mail, Users } from 'lucide-react'

const sections = [
  {
    id: 'company',
    icon: Users,
    title: '公司介绍',
    description: 'OutreachHub 专注于为出海外贸团队提供智能拓客、邮件自动化和客户关系管理能力。',
  },
  {
    id: 'careers',
    icon: Users,
    title: '加入我们',
    description: '我们正在建设面向全球市场的销售科技产品。欢迎通过邮件联系我们并附上个人介绍。',
  },
  {
    id: 'partners',
    icon: Handshake,
    title: '合作伙伴',
    description: '我们欢迎数据服务商、邮件基础设施厂商和外贸服务机构开展产品及渠道合作。',
  },
]

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-16">
      <div className="mx-auto max-w-4xl">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600">
          <ArrowLeft className="h-4 w-4" /> 返回首页
        </Link>
        <h1 className="mt-8 text-4xl font-bold text-slate-950">关于 OutreachHub</h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
          用可靠的数据与自动化工具，帮助中国企业更高效地连接全球客户。
        </p>

        <div className="mt-12 grid gap-6">
          {sections.map(({ id, icon: Icon, title, description }) => (
            <section key={id} id={id} className="scroll-mt-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
              <Icon className="h-6 w-6 text-blue-600" />
              <h2 className="mt-4 text-2xl font-semibold text-slate-950">{title}</h2>
              <p className="mt-3 leading-7 text-slate-600">{description}</p>
            </section>
          ))}
        </div>

        <div className="mt-10 rounded-2xl bg-blue-600 p-8 text-white">
          <Mail className="h-6 w-6" />
          <h2 className="mt-4 text-2xl font-semibold">联系我们</h2>
          <p className="mt-2 text-blue-100">商务合作、产品咨询和招聘沟通：</p>
          <a href="mailto:support@outreachhub.com" className="mt-4 inline-block font-medium underline underline-offset-4">
            support@outreachhub.com
          </a>
        </div>
      </div>
    </main>
  )
}

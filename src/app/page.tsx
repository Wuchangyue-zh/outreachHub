import Link from 'next/link'
import { Mail, Users, Send, Search, BarChart3, Shield, Zap, Globe } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="fixed top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <Mail className="h-7 w-7 text-primary" />
            <span className="text-lg font-bold text-gray-900">OutreachHub</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900">
              登录
            </Link>
            <Link
              href="/register"
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
            >
              免费注册
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden pt-32 pb-20">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-blue-50 via-white to-indigo-50" />
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              让<span className="text-primary">海外拓客</span>
              <br />
              变得简单高效
            </h1>
            <p className="mt-6 text-lg text-gray-600">
              OutreachHub 是面向中国出海企业的智能海外拓客与邮件营销平台。
              <br />
              通过AI技术，帮助您精准定位目标客户、自动化邮件营销、提升转化率。
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <Link
                href="/register"
                className="rounded-lg bg-primary px-8 py-3 text-base font-semibold text-white shadow-sm hover:bg-primary/90"
              >
                免费开始使用
              </Link>
              <Link
                href="#features"
                className="rounded-lg border border-gray-300 px-8 py-3 text-base font-semibold text-gray-700 hover:bg-gray-50"
              >
                了解更多
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-gray-900">一站式出海拓客解决方案</h2>
            <p className="mt-4 text-gray-600">
              从客户发现到邮件营销，再到数据追踪，全流程自动化
            </p>
          </div>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard icon={Search} title="AI智能拓客" description="基于AI分析，精准定位目标行业的决策人，自动挖掘有效邮箱和联系方式" />
            <FeatureCard icon={Users} title="客户管理" description="全面的CRM系统，AI生成客户画像，智能标签和分层管理" />
            <FeatureCard icon={Send} title="邮件营销" description="多步邮件序列、A/B测试、定时发送、个性化模板，提升打开率和回复率" />
            <FeatureCard icon={BarChart3} title="数据追踪" description="全链路数据追踪，邮件打开、点击、回复实时监控，数据驱动决策" />
            <FeatureCard icon={Shield} title="邮箱健康" description="邮箱健康检查、发送频率控制、退信管理，保护域名和IP信誉" />
            <FeatureCard icon={Globe} title="多语言支持" description="AI自动生成多语言邮件内容，适配全球不同市场和客户群体" />
          </div>
        </div>
      </section>

      {/* Email acquisition */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">海量客户数据获取方案</h2>
              <p className="mt-4 text-gray-600">多种渠道获取目标客户邮箱，确保数据的准确性和合规性</p>
              <ul className="mt-8 space-y-4">
                {[
                  { title: 'API数据源集成', desc: 'RocketReach、Apollo、Hunter等主流平台，覆盖9亿+联系人' },
                  { title: '智能邮箱推测', desc: '基于公司域名和姓名，AI推测邮箱格式并验证准确性' },
                  { title: '爬虫数据采集', desc: '自动化采集企业官网、LinkedIn等公开信息中的联系方式' },
                  { title: '邮箱验证清洗', desc: 'MillionVerifier实时验证，确保邮箱有效性和送达率' },
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Zap className="h-5 w-5 flex-shrink-0 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">{item.title}</p>
                      <p className="text-sm text-gray-500">{item.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 p-8">
              <div className="rounded-xl bg-white p-6 shadow-lg">
                <h3 className="text-lg font-semibold text-gray-900">获取邮箱流程图</h3>
                <div className="mt-6 space-y-4">
                  {[
                    '输入目标行业、职位、地区',
                    'AI搜索匹配的公司和联系人',
                    '自动推测和挖掘邮箱地址',
                    '验证邮箱有效性并去重',
                    '导入客户库，开始邮件营销',
                  ].map((text, i) => (
                    <div key={i} className={i > 0 ? 'ml-4 border-l-2 border-primary/30 pl-6' : ''}>
                      <div className="flex items-center gap-3">
                        <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">{i + 1}</span>
                        <span className="text-sm text-gray-700">{text}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-gray-900 py-16">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
            {[
              { value: '9亿+', label: '联系人数据库' },
              { value: '200+', label: '覆盖国家和地区' },
              { value: '98.5%', label: '邮箱验证准确率' },
              { value: '42%', label: '平均邮件打开率' },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-3xl font-bold text-white">{stat.value}</div>
                <div className="mt-1 text-sm text-gray-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="rounded-2xl bg-primary px-8 py-16 text-center sm:px-16">
            <h2 className="text-3xl font-bold text-white">准备好开始拓客了吗？</h2>
            <p className="mt-4 text-lg text-blue-100">免费注册，立即体验智能海外拓客与邮件营销</p>
            <div className="mt-8">
              <Link href="/register" className="inline-block rounded-lg bg-white px-8 py-3 text-base font-semibold text-primary hover:bg-blue-50">
                免费开始使用
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-gray-400" />
              <span className="text-sm font-medium text-gray-500">OutreachHub</span>
            </div>
            <p className="text-sm text-gray-400">&copy; 2024 OutreachHub. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ icon: Icon, title, description }: { icon: any; title: string; description: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-gray-900">{title}</h3>
      <p className="mt-2 text-sm text-gray-500">{description}</p>
    </div>
  )
}

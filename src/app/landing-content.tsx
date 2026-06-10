'use client'

import Link from 'next/link'
import { Mail, Users, Send, Search, BarChart3, Shield, Zap, Globe } from 'lucide-react'
import { useI18n } from '@/hooks/use-i18n'

export default function LandingContent() {
  const { t } = useI18n()
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
              {t('auth.login')}
            </Link>
            <Link
              href="/register"
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
            >
              {t('landing.freeRegister')}
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
              {t('landing.hero.title')}
            </h1>
            <p className="mt-6 text-lg text-gray-600">
              {t('landing.hero.subtitle')}
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <Link
                href="/register"
                className="rounded-lg bg-primary px-8 py-3 text-base font-semibold text-white shadow-sm hover:bg-primary/90"
              >
                {t('landing.cta.getStarted')}
              </Link>
              <Link
                href="#features"
                className="rounded-lg border border-gray-300 px-8 py-3 text-base font-semibold text-gray-700 hover:bg-gray-50"
              >
                {t('landing.cta.learnMore')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-gray-900">{t('landing.features.title')}</h2>
            <p className="mt-4 text-gray-600">
              {t('landing.features.subtitle')}
            </p>
          </div>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard icon={Search} title={t('landing.features.aiProspecting')} description={t('landing.features.aiProspectingDesc')} />
            <FeatureCard icon={Users} title={t('landing.features.crm')} description={t('landing.features.crmDesc')} />
            <FeatureCard icon={Send} title={t('landing.features.emailMarketing')} description={t('landing.features.emailMarketingDesc')} />
            <FeatureCard icon={BarChart3} title={t('landing.features.dataTracking')} description={t('landing.features.dataTrackingDesc')} />
            <FeatureCard icon={Shield} title={t('landing.features.emailHealth')} description={t('landing.features.emailHealthDesc')} />
            <FeatureCard icon={Globe} title={t('landing.features.multiLang')} description={t('landing.features.multiLangDesc')} />
          </div>
        </div>
      </section>

      {/* Email acquisition */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">{t('landing.acquisition.title')}</h2>
              <p className="mt-4 text-gray-600">{t('landing.acquisition.subtitle')}</p>
              <ul className="mt-8 space-y-4">
                {[
                  { title: t('landing.acquisition.api'), desc: t('landing.acquisition.apiDesc') },
                  { title: t('landing.acquisition.smartGuess'), desc: t('landing.acquisition.smartGuessDesc') },
                  { title: t('landing.acquisition.scraper'), desc: t('landing.acquisition.scraperDesc') },
                  { title: t('landing.acquisition.verify'), desc: t('landing.acquisition.verifyDesc') },
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
                <h3 className="text-lg font-semibold text-gray-900">{t('landing.acquisition.flowchart')}</h3>
                <div className="mt-6 space-y-4">
                  {[
                    t('landing.acquisition.step1'),
                    t('landing.acquisition.step2'),
                    t('landing.acquisition.step3'),
                    t('landing.acquisition.step4'),
                    t('landing.acquisition.step5'),
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
              { value: '9亿+', label: t('landing.stats.contacts') },
              { value: '200+', label: t('landing.stats.countries') },
              { value: '98.5%', label: t('landing.stats.verifyRate') },
              { value: '42%', label: t('landing.stats.openRate') },
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
            <h2 className="text-3xl font-bold text-white">{t('landing.cta.ready')}</h2>
            <p className="mt-4 text-lg text-blue-100">{t('landing.cta.subtitle')}</p>
            <div className="mt-8">
              <Link href="/register" className="inline-block rounded-lg bg-white px-8 py-3 text-base font-semibold text-primary hover:bg-blue-50">
                {t('landing.cta.getStarted')}
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
            <p className="text-sm text-gray-400">{t('landing.footer.copyright')}</p>
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

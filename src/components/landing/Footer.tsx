import Link from 'next/link'
import { Mail, Phone, MapPin } from 'lucide-react'
import { footerData } from '@/lib/landing-data'

export function Footer() {
  return (
    <footer className="border-t border-gray-100 bg-gray-50">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-10 lg:grid-cols-6">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
                <Mail className="h-4.5 w-4.5 text-white" />
              </div>
              <span className="text-lg font-bold text-gray-900">{footerData.brand.name}</span>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-gray-500">
              {footerData.brand.description}
            </p>

            {/* Contact */}
            <div className="mt-6 space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Phone className="h-3.5 w-3.5" />
                {footerData.contact.phone}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Mail className="h-3.5 w-3.5" />
                {footerData.contact.email}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <MapPin className="h-3.5 w-3.5" />
                {footerData.contact.address}
              </div>
            </div>
          </div>

          {/* Link columns */}
          {footerData.columns.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold text-gray-900">{col.title}</h4>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-gray-500 transition-colors hover:text-blue-600"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-gray-200 pt-8 sm:flex-row">
          <p className="text-xs text-gray-400">{footerData.copyright}</p>
          <div className="flex items-center gap-4">
            {footerData.social.map((s) => (
              <Link
                key={s.name}
                href={s.href}
                className="text-xs text-gray-400 transition-colors hover:text-blue-600"
              >
                {s.name}
              </Link>
            ))}
          </div>
          <p className="text-xs text-gray-400">{footerData.icp}</p>
        </div>
      </div>
    </footer>
  )
}

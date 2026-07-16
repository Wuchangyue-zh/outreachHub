'use client'

import { useI18n } from '@/hooks/use-i18n'
import { getCountryName } from '@/lib/geo'
import { cn } from '@/lib/utils'

interface GeoMapProps {
  data: Array<{ country: string; code?: string; count: number }>
  /** 点击国家（可选） */
  onSelect?: (code: string) => void
}

// 颜色档位：按相对最大打开数分 5 档
const INTENSITY = [
  'bg-blue-100 text-blue-700 border-blue-200',
  'bg-blue-200 text-blue-800 border-blue-300',
  'bg-blue-300 text-blue-900 border-blue-400',
  'bg-blue-500 text-white border-blue-600',
  'bg-blue-700 text-white border-blue-800',
]

function intensityFor(count: number, max: number): string {
  if (max <= 0 || count <= 0) return INTENSITY[0]
  const ratio = count / max
  if (ratio >= 0.75) return INTENSITY[4]
  if (ratio >= 0.5) return INTENSITY[3]
  if (ratio >= 0.25) return INTENSITY[2]
  if (ratio > 0) return INTENSITY[1]
  return INTENSITY[0]
}

/**
 * Q2b: 轻量国家级 choropleth（瓦片网格地图）
 * 零依赖、纯 Tailwind；按打开数分档着色。移动端友好（自然换行）。
 */
export function GeoMap({ data, onSelect }: GeoMapProps) {
  const { locale } = useI18n()
  const lang = locale === 'en' ? 'en' : 'zh'

  if (data.length === 0) return null

  const max = Math.max(...data.map((d) => d.count))

  return (
    <div className="flex flex-wrap gap-2">
      {data.map((d) => (
        <button
          key={d.code}
          type="button"
          onClick={() => d.code && onSelect?.(d.code)}
          title={`${d.country} (${d.code}): ${d.count}`}
          className={cn(
            'flex min-w-[88px] flex-col items-center justify-center rounded-lg border px-2 py-2 text-center transition-all hover:scale-105 hover:shadow-md',
            intensityFor(d.count, max),
            onSelect && 'cursor-pointer'
          )}
        >
          <span className="text-xs font-bold">{d.code}</span>
          <span className="mt-0.5 text-[10px] leading-tight">{getCountryName(d.code ?? null, lang)}</span>
          <span className="mt-1 text-sm font-semibold">{d.count}</span>
        </button>
      ))}
    </div>
  )
}

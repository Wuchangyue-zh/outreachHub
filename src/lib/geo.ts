/**
 * L3: 地理分析辅助 — 国家代码本地化 + IP 粗粒度解析
 */

/** ISO 3166-1 alpha-2 → 中文名 */
const COUNTRY_ZH: Record<string, string> = {
  CN: '中国', US: '美国', JP: '日本', KR: '韩国', GB: '英国', DE: '德国', FR: '法国',
  CA: '加拿大', AU: '澳大利亚', IN: '印度', BR: '巴西', RU: '俄罗斯', IT: '意大利',
  ES: '西班牙', NL: '荷兰', SE: '瑞典', NO: '挪威', DK: '丹麦', FI: '芬兰',
  PL: '波兰', CZ: '捷克', AT: '奥地利', CH: '瑞士', BE: '比利时', IE: '爱尔兰',
  PT: '葡萄牙', GR: '希腊', TR: '土耳其', IL: '以色列', AE: '阿联酋', SA: '沙特',
  SG: '新加坡', MY: '马来西亚', TH: '泰国', VN: '越南', PH: '菲律宾', ID: '印尼',
  NZ: '新西兰', MX: '墨西哥', AR: '阿根廷', CL: '智利', CO: '哥伦比亚', PE: '秘鲁',
  ZA: '南非', EG: '埃及', NG: '尼日利亚', KE: '肯尼亚', HK: '香港', TW: '台湾',
  MO: '澳门',
}

/** ISO 3166-1 alpha-2 → English name */
const COUNTRY_EN: Record<string, string> = {
  CN: 'China', US: 'United States', JP: 'Japan', KR: 'South Korea', GB: 'United Kingdom',
  DE: 'Germany', FR: 'France', CA: 'Canada', AU: 'Australia', IN: 'India', BR: 'Brazil',
  RU: 'Russia', IT: 'Italy', ES: 'Spain', NL: 'Netherlands', SE: 'Sweden', NO: 'Norway',
  DK: 'Denmark', FI: 'Finland', PL: 'Poland', CZ: 'Czech Republic', AT: 'Austria',
  CH: 'Switzerland', BE: 'Belgium', IE: 'Ireland', PT: 'Portugal', GR: 'Greece',
  TR: 'Turkey', IL: 'Israel', AE: 'UAE', SA: 'Saudi Arabia', SG: 'Singapore',
  MY: 'Malaysia', TH: 'Thailand', VN: 'Vietnam', PH: 'Philippines', ID: 'Indonesia',
  NZ: 'New Zealand', MX: 'Mexico', AR: 'Argentina', CL: 'Chile', CO: 'Colombia',
  PE: 'Peru', ZA: 'South Africa', EG: 'Egypt', NG: 'Nigeria', KE: 'Kenya',
  HK: 'Hong Kong', TW: 'Taiwan', MO: 'Macau',
}

/**
 * 国家代码转本地化名称
 * @param code ISO 3166-1 alpha-2 国家代码
 * @param lang 语言
 */
export function getCountryName(code: string | null, lang: 'zh' | 'en' = 'zh'): string {
  if (!code) return lang === 'zh' ? '未知' : 'Unknown'
  const upper = code.toUpperCase()
  if (lang === 'en') return COUNTRY_EN[upper] || upper
  return COUNTRY_ZH[upper] || upper
}

/**
 * 批量国家代码转名称
 */
export function localizeGeoStats(
  stats: Array<{ country: string | null; count: number }>,
  lang: 'zh' | 'en' = 'zh'
): Array<{ country: string; code: string; count: number }> {
  return stats.map((s) => ({
    country: getCountryName(s.country, lang),
    code: s.country || 'XX',
    count: s.count,
  }))
}

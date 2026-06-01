export interface Language {
  code: string
  name: string       // English name
  nativeName: string // Native name
  emailName: string  // Name used in AI prompts (e.g., "German", "French")
}

export const LANGUAGES: Language[] = [
  { code: 'zh', name: 'Chinese', nativeName: '中文', emailName: 'Chinese' },
  { code: 'en', name: 'English', nativeName: 'English', emailName: 'English' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', emailName: 'German' },
  { code: 'fr', name: 'French', nativeName: 'Français', emailName: 'French' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', emailName: 'Spanish' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', emailName: 'Japanese' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', emailName: 'Korean' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', emailName: 'Portuguese' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', emailName: 'Russian' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', emailName: 'Arabic' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', emailName: 'Italian' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', emailName: 'Dutch' },
]

export const LANGUAGE_MAP = Object.fromEntries(LANGUAGES.map(l => [l.code, l]))

export function getLanguageName(code: string): string {
  return LANGUAGE_MAP[code]?.emailName || 'English'
}

export function getLanguageLabel(code: string): string {
  const lang = LANGUAGE_MAP[code]
  return lang ? `${lang.nativeName} (${lang.name})` : code
}

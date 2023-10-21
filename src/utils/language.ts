export const Languages = [
  'english',
  'german',
  'spanish',
  'french',
  'italian',
  'japanese',
  'koreana',
  'polish',
  'brazilian',
  'russian',
  'turkish',
  'schinese',
  'tchinese',
] as const;

export type Language = (typeof Languages)[number];

const LanguageTags: { [tag: string]: Language } = {
  en: 'english',
  de: 'german',
  es: 'spanish',
  fr: 'french',
  it: 'italian',
  ja: 'japanese',
  ko: 'koreana',
  pl: 'polish',
  pt: 'brazilian',
  ru: 'russian',
  tr: 'turkish',
  'zh-CN': 'schinese',
  'zh-TW': 'tchinese',
};

export const FALLBACK_LANGUAGE: Language = 'english';

export function resolveLang(candidates: readonly string[]): Language {
  for (const clientTag of candidates) {
    for (const [tag, lang] of Object.entries(LanguageTags)) {
      if (clientTag.startsWith(tag)) return lang;
    }
  }
  return FALLBACK_LANGUAGE;
}

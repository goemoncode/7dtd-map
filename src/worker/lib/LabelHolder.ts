import { Language, resolveLang } from '../../utils/language';
import { LabelMap } from '../../store/db';

export type LabelMapFetcher = (lang: Language) => Promise<LabelMap | undefined>;
export type LabelMapper = (key: string) => string | undefined;

export class LabelHolder {
  private lang: Language;
  private labelsPromise: Promise<LabelMap | undefined>;
  private fallbackLang: Language;
  private fallbackLabelsPromise: Promise<LabelMap | undefined>;

  constructor(private labelsFetcher: LabelMapFetcher) {
    this.lang = resolveLang(navigator.languages);
    this.labelsPromise = this.labelsFetcher(this.lang);
    this.fallbackLang = resolveLang([]);
    this.fallbackLabelsPromise = this.labelsFetcher(this.fallbackLang);
  }

  get language() {
    return this.lang;
  }

  set language(lang: Language) {
    if (lang === this.lang) return;
    this.lang = lang;
    this.labelsPromise = this.labelsFetcher(this.lang);
  }

  async getMapper(): Promise<LabelMapper> {
    const [labels, fallbackLabels] = await Promise.all([this.labelsPromise, this.fallbackLabelsPromise]);
    return (key: string) => labels?.[key] || fallbackLabels?.[key] || '';
  }
}

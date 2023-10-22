import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAppSelector } from '../store';
import { selectLanguage } from '../store/local';
import { LabelMap, PrefabInfo, db } from '../store/db';
import { fetchJson } from '../utils';
import { FALLBACK_LANGUAGE, Language } from '../utils/language';

export function usePrefabs() {
  return useQuery({
    queryKey: ['prefabs'],
    queryFn: async () => {
      if (location.hash.slice(1) === 'reset') {
        throw Promise.all([db.Prefabs.clear(), db.Localizations.clear()]).then(() =>
          location.replace(location.href.slice(0, -location.hash.length))
        );
      }
      const count = await db.Prefabs.count();
      if (count > 0) return !!count;
      const rows = await Promise.all([getDefaultPrefabsUrl(), getAdditionalPrefabsUrl()].map(fetchPrefabs));
      const prefabs = Object.values(rows.flatMap((x) => x).reduce((a, c) => Object.assign(a, c), {}));
      await db.Prefabs.bulkAdd(prefabs);
      return !!prefabs.length;
    },
  });
}

async function fetchPrefabs(url: string | null): Promise<{ [x: string]: PrefabInfo }[]> {
  if (!url) return [];
  try {
    const prefabs = await fetchJson<PrefabInfo[]>(`${url}index.json`);
    prefabs.forEach((prefab) => (prefab.url = buildUrl(prefab, url)));
    return prefabs.map((prefab) => ({ [prefab.name]: prefab }));
  } catch (err) {
    console.error(err);
    return [];
  }
}

function buildUrl(prefab: PrefabInfo, baseUrl: string) {
  let url = prefab.name;
  if (prefab.group) url = `${prefab.group}/${url}`;
  if (prefab.modName) url = `${prefab.modName}/prefabs/${url}`;
  return new URL(url, baseUrl).toString();
}

const DefaultPrefabsUrlKey = 'prefabsUrl';
const AdditionalPrefabsUrlKey = 'additionalPrefabsUrl';

function getDefaultPrefabsUrl() {
  const { VITE_PREFABS_URL, BASE_URL } = import.meta.env;
  const url = localStorage.getItem(DefaultPrefabsUrlKey) || VITE_PREFABS_URL;
  return url ? (url.endsWith('/') ? url : url + '/') : BASE_URL;
}

export function getAdditionalPrefabsUrl() {
  const url = localStorage.getItem(AdditionalPrefabsUrlKey);
  return url ? (url.endsWith('/') ? url : url + '/') : null;
}

export function setAdditionalPrefabsUrl(url: string | null) {
  if (url) {
    localStorage.setItem(AdditionalPrefabsUrlKey, url);
  } else {
    localStorage.removeItem(AdditionalPrefabsUrlKey);
  }
}

export async function fetchTest(url: string) {
  const testUrl = url.endsWith('/') ? `${url}index.json` : `${url}/index.json`;
  const res = await fetch(testUrl, { method: 'HEAD' });
  if (!res.ok) {
    throw new Error(`Failed to get index.json, this url returned an error: ${res.status} ${res.statusText}`);
  }
}

export function usePrefabInfo(prefabName?: string) {
  const { data } = useQuery({
    queryKey: ['prefab', prefabName ?? ''],
    queryFn: async () => {
      if (!prefabName) return null;
      return await db.Prefabs.get(prefabName);
    },
  });
  return data;
}

export function usePrefabXml(prefab: PrefabInfo) {
  const { data } = useQuery({
    queryKey: ['prefab/xml', prefab.name],
    queryFn: async () => {
      try {
        const url = prefab.url + '.xml';
        const xmlText = await fetch(url).then((res) => res.text());
        // console.log({ url, xmlText });
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
        const properties = Array.from(xmlDoc.documentElement.children)
          .map((node) => node as HTMLElement)
          .filter((elem) => elem.hasAttribute('name') && elem.hasAttribute('value'))
          .map((elem) => [elem.getAttribute('name')!, elem.getAttribute('value')!]) as [string, string][];
        properties.sort((a, b) => a[0].localeCompare(b[0]));
        return new Map<string, string>(properties);
      } catch (err) {
        console.error(err);
        return new Map<string, string>();
      }
    },
    staleTime: Infinity,
  });
  return data;
}

async function fetchLabelMap(prefabsUrl: string | null, lang: Language) {
  if (!prefabsUrl) return {};
  try {
    const url = `${prefabsUrl}l10n/${lang}.json`;
    return await fetchJson<LabelMap>(url);
  } catch (err) {
    console.error(err);
    return {};
  }
}

export function useLocalization(lang: Language) {
  const { data } = useQuery({
    queryKey: ['l10n', lang],
    queryFn: async () => {
      const l10n = await db.Localizations.get(lang);
      if (l10n) return l10n;
      const maps = await Promise.all([getDefaultPrefabsUrl(), getAdditionalPrefabsUrl()].map((url) => fetchLabelMap(url, lang)));
      const labels = maps
        .flatMap<LabelMap>((map) => Object.entries(map).map(([key, label]) => ({ [key]: label })))
        .reduce((a, c) => Object.assign(a, c), {});
      await db.Localizations.put({ lang, labels }, lang);
      return { lang, labels };
    },
  });
  return data;
}

export type LabelMapper = (key: string) => string | undefined;

export function useLabelMapper(): LabelMapper {
  const language = useAppSelector(selectLanguage);
  const current = useLocalization(language);
  const fallback = useLocalization(FALLBACK_LANGUAGE);
  return useCallback((name: string) => current?.labels?.[name] || fallback?.labels?.[name], [current, fallback]);
}

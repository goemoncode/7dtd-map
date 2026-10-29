import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAppSelector } from '../store/index.ts';
import { selectLanguage } from '../store/local.ts';
import { db, ExternalDataVersion, LabelMap, Localization, PrefabInfo } from '../store/db/index.ts';
import { FALLBACK_LANGUAGE, Language } from '../utils/language.ts';

export function usePrefabs() {
  return useQuery({
    queryKey: ['prefabs'],
    queryFn: async () => {
      if (location.hash.slice(1) === 'reset') {
        throw db.transaction('rw', db.Prefabs, db.Localizations, db.DataVersions, async () => {
          await Promise.all([db.Prefabs.clear(), db.Localizations.clear(), db.DataVersions.clear()]);
        }).then(() => location.replace(location.href.slice(0, -location.hash.length)));
      }
      return await refreshPrefabs();
    },
    throwOnError: true,
  });
}

interface DataManifest {
  schemaVersion: number;
  dataVersion: string;
  files: Record<string, string>;
}

async function refreshPrefabs() {
  const cachedPrefabs = await db.Prefabs.toArray();
  const urls = Array.from(new Set([getDefaultPrefabsUrl(), getAdditionalPrefabsUrl()].filter((url): url is string => !!url)));
  try {
    const sources = await Promise.all(urls.map(async (url) => ({ url, manifest: await fetchManifest(url) })));
    const storedVersions = (await db.DataVersions.toArray()).filter((entry) => entry.kind === 'prefabs');
    const unchanged = sources.every((source) => source.manifest !== null) &&
      versionsMatch(
        storedVersions,
        sources.map(({ url, manifest }) => ({ kind: 'prefabs', url, version: manifest!.dataVersion, lang: '' })),
      );
    if (unchanged && cachedPrefabs.length > 0) return true;

    const sourceData = await Promise.all(sources.map(async ({ url, manifest }) => {
      const expectedHash = manifest?.files['index.json'];
      if (manifest && !expectedHash) throw new Error(`The manifest for ${url} does not list index.json`);
      const result = await fetchJsonData<PrefabInfo[]>(
        dataUrl(url, 'index.json', manifest?.dataVersion),
        expectedHash,
      );
      if (!result) throw new Error(`The prefab index from ${url} was not found`);
      if (!Array.isArray(result.value) || result.value.some((prefab) => !prefab || typeof prefab.name !== 'string')) {
        throw new Error(`The prefab index from ${url} has an invalid format`);
      }
      result.value.forEach((prefab) => (prefab.url = buildUrl(prefab, url)));
      return {
        entry: { kind: 'prefabs' as const, url, lang: '', version: manifest?.dataVersion ?? result.hash },
        prefabs: result.value,
      };
    }));
    const prefabs = Object.values(
      sourceData.flatMap(({ prefabs }) => prefabs).reduce((merged, prefab) => {
        merged[prefab.name] = prefab;
        return merged;
      }, {} as Record<string, PrefabInfo>),
    );
    const versions = sourceData.map(({ entry }) => entry);
    await db.transaction('rw', db.Prefabs, db.DataVersions, async () => {
      const oldKeys = (await db.DataVersions.where('kind').equals('prefabs').primaryKeys()) as [string, string, string][];
      await db.DataVersions.bulkDelete(oldKeys);
      await db.DataVersions.bulkPut(versions);
      await db.Prefabs.clear();
      await db.Prefabs.bulkPut(prefabs);
    });
    return !!prefabs.length;
  } catch (err) {
    console.error('Failed to refresh prefab data; using the last cached data when available.', err);
    if (cachedPrefabs.length > 0) return true;
    throw err;
  }
}

async function fetchManifest(baseUrl: string): Promise<DataManifest | null> {
  const response = await fetch(dataUrl(baseUrl, 'manifest.json'), { cache: 'no-cache' });
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Failed to get manifest.json from ${baseUrl}: ${response.status} ${response.statusText}`);
  }
  const manifest: unknown = await response.json();
  if (
    !manifest ||
    typeof manifest !== 'object' ||
    !('schemaVersion' in manifest) ||
    manifest.schemaVersion !== 1 ||
    !('dataVersion' in manifest) ||
    typeof manifest.dataVersion !== 'string' ||
    !('files' in manifest) ||
    !manifest.files ||
    typeof manifest.files !== 'object' ||
    Array.isArray(manifest.files) ||
    !Object.values(manifest.files).every((hash) => typeof hash === 'string' && /^[a-f0-9]{64}$/i.test(hash))
  ) {
    throw new Error(`The manifest from ${baseUrl} has an invalid format or unsupported schema version`);
  }
  return manifest as DataManifest;
}

async function fetchJsonData<T>(url: URL, expectedHash?: string, allowNotFound = false) {
  const response = await fetch(url, { cache: 'no-cache' });
  if (allowNotFound && response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Failed to get ${url}: ${response.status} ${response.statusText}`);
  }
  const data = await response.arrayBuffer();
  const hash = await sha256(data);
  if (expectedHash && hash.toLowerCase() !== expectedHash.toLowerCase()) {
    throw new Error(`The SHA-256 checksum for ${url} does not match manifest.json`);
  }
  try {
    return { value: JSON.parse(new TextDecoder().decode(data)) as T, hash };
  } catch (err) {
    throw new Error(`The response from ${url} is not valid JSON`, { cause: err });
  }
}

function dataUrl(baseUrl: string, path: string, version?: string) {
  const url = new URL(path, new URL(baseUrl, document.baseURI));
  if (version) url.searchParams.set('v', version);
  return url;
}

async function sha256(data: BufferSource) {
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function versionsMatch(stored: ExternalDataVersion[], expected: ExternalDataVersion[]) {
  return stored.length === expected.length &&
    expected.every((entry) =>
      stored.some((storedEntry) =>
        storedEntry.kind === entry.kind &&
        storedEntry.url === entry.url &&
        storedEntry.lang === entry.lang &&
        storedEntry.version === entry.version
      )
    );
}

function buildUrl(prefab: PrefabInfo, baseUrl: string) {
  let url = prefab.name;
  if (prefab.group) url = `${prefab.group}/${url}`;
  if (prefab.modName) url = `${prefab.modName}/prefabs/${url}`;
  return new URL(url, new URL(baseUrl, document.baseURI)).toString();
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

export function useLocalization(lang: Language) {
  const { data } = useQuery({
    queryKey: ['l10n', lang],
    queryFn: async () => await refreshLocalization(lang),
    throwOnError: true,
  });
  return data;
}

async function refreshLocalization(lang: Language): Promise<Localization> {
  if (location.hash.slice(1) === 'reset') return { lang, labels: {} };
  const cached = await db.Localizations.get(lang);
  const urls = Array.from(new Set([getDefaultPrefabsUrl(), getAdditionalPrefabsUrl()].filter((url): url is string => !!url)));
  try {
    const sources = await Promise.all(urls.map(async (url) => ({ url, manifest: await fetchManifest(url) })));
    const storedVersions = (await db.DataVersions.toArray()).filter(
      (entry) => entry.kind === 'localization' && entry.lang === lang,
    );
    const unchanged = sources.every((source) => source.manifest !== null) &&
      versionsMatch(
        storedVersions,
        sources.map(({ url, manifest }) => ({ kind: 'localization', url, lang, version: manifest!.dataVersion })),
      );
    if (unchanged && cached) return cached;

    const sourceData = await Promise.all(sources.map(async ({ url, manifest }) => {
      const path = `l10n/${lang}.json`;
      const expectedHash = manifest?.files[path];
      if (manifest && !expectedHash) {
        return { labels: {}, entry: { kind: 'localization' as const, url, lang, version: manifest.dataVersion } };
      }
      const result = await fetchJsonData<LabelMap>(
        dataUrl(url, path, manifest?.dataVersion),
        expectedHash,
        !manifest,
      );
      if (!result) {
        return { labels: {}, entry: { kind: 'localization' as const, url, lang, version: 'missing' } };
      }
      if (
        !result.value ||
        typeof result.value !== 'object' ||
        Array.isArray(result.value) ||
        !Object.values(result.value).every((label) => typeof label === 'string')
      ) {
        throw new Error(`The localization file from ${url} has an invalid format`);
      }
      return {
        labels: result.value,
        entry: { kind: 'localization' as const, url, lang, version: manifest?.dataVersion ?? result.hash },
      };
    }));
    const labels = Object.assign({}, ...sourceData.map(({ labels }) => labels));
    const localization = { lang, labels };
    const versions = sourceData.map(({ entry }) => entry);
    await db.transaction('rw', db.Localizations, db.DataVersions, async () => {
      const oldKeys = (await db.DataVersions.toArray())
        .filter((entry) => entry.kind === 'localization' && entry.lang === lang)
        .map(({ kind, url, lang }) => [kind, url, lang] as [string, string, string]);
      await db.DataVersions.bulkDelete(oldKeys);
      await db.DataVersions.bulkPut(versions);
      await db.Localizations.put(localization);
    });
    return localization;
  } catch (err) {
    console.error(`Failed to refresh ${lang} localization; using the last cached data when available.`, err);
    if (cached) return cached;
    throw err;
  }
}

export type LabelMapper = (key: string) => string | undefined;

export function useLabelMapper(): LabelMapper {
  const language = useAppSelector(selectLanguage);
  const current = useLocalization(language);
  const fallback = useLocalization(FALLBACK_LANGUAGE);
  return useCallback((name: string) => current?.labels?.[name] || fallback?.labels?.[name], [current, fallback]);
}

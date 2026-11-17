import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAppSelector } from '../store/index.ts';
import { selectLanguage } from '../store/local.ts';
import { db, Localization, PrefabInfo } from '../store/db/index.ts';
import { FALLBACK_LANGUAGE, Language } from '../utils/language.ts';
import { requestGameData, useGameData } from './useGameData.ts';
import { prefabsFilter } from '../worker/proxies/index.ts';

export function usePrefabs() {
  const { data: gameData } = useGameData();
  return useQuery({
    queryKey: ['prefabs', gameData?.path],
    enabled: gameData?.ready ?? false,
    queryFn: async () => {
      const cachedPrefabs = await db.Prefabs.toArray();
      try {
        const prefabs = await requestGameData<PrefabInfo[]>('/api/prefabs');
        if (!Array.isArray(prefabs) || prefabs.some((prefab) => !prefab || typeof prefab.name !== 'string')) {
          throw new Error('The local prefab index has an invalid format.');
        }
        await db.transaction('rw', db.Prefabs, async () => {
          await db.Prefabs.clear();
          await db.Prefabs.bulkPut(prefabs);
        });
        prefabsFilter.refresh();
        return true;
      } catch (error) {
        console.error('Failed to load local prefab data; using the last cached data when available.', error);
        if (cachedPrefabs.length > 0) {
          prefabsFilter.refresh();
          return true;
        }
        throw error;
      }
    },
    throwOnError: true,
  });
}

export function useRefreshGameData() {
  const queryClient = useQueryClient();
  const language = useAppSelector(selectLanguage);
  const { data: gameData } = useGameData();
  const languages = Array.from(new Set([language, FALLBACK_LANGUAGE]));

  return useMutation({
    mutationFn: async () => {
      const prefabs = await requestGameData<PrefabInfo[]>('/api/prefabs', { method: 'POST' });
      if (!Array.isArray(prefabs) || prefabs.length === 0 || prefabs.some((prefab) => !prefab || typeof prefab.name !== 'string')) {
        throw new Error('The local prefab data has an invalid format or contains no prefabs.');
      }

      const localizations = await Promise.all(
        languages.map(async (lang) => {
          const localization = await requestGameData<Localization>(`/api/localization/${lang}`);
          if (
            localization.lang !== lang ||
            typeof localization.labels !== 'object' ||
            localization.labels === null ||
            Object.values(localization.labels).some((label) => typeof label !== 'string')
          ) {
            throw new Error(`The local ${lang} localization data has an invalid format.`);
          }
          return localization;
        }),
      );

      await db.transaction('rw', db.Prefabs, db.Localizations, async () => {
        await db.Prefabs.clear();
        await db.Prefabs.bulkPut(prefabs);
        await db.Localizations.bulkPut(localizations);
      });
      return { prefabs, localizations };
    },
    onSuccess: ({ prefabs, localizations }) => {
      queryClient.setQueryData(['prefabs', gameData?.path], prefabs.length > 0);
      for (const localization of localizations) {
        queryClient.setQueryData(['l10n', localization.lang, gameData?.path], localization);
      }
      prefabsFilter.refresh();
    },
  });
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
    queryKey: ['prefab/xml', prefab.name, prefab.url],
    queryFn: async () => {
      const response = await fetch(prefab.url + '.xml');
      if (!response.ok) throw new Error(`Failed to load prefab properties: ${response.status} ${response.statusText}`);
      const xmlText = await response.text();
      const xmlDoc = new DOMParser().parseFromString(xmlText, 'text/xml');
      if (xmlDoc.querySelector('parsererror')) throw new Error(`The prefab properties for ${prefab.name} are invalid XML.`);
      const properties = Array.from(xmlDoc.documentElement.children)
        .map((node) => node as HTMLElement)
        .filter((elem) => elem.hasAttribute('name') && elem.hasAttribute('value'))
        .map((elem) => [elem.getAttribute('name')!, elem.getAttribute('value')!] as [string, string]);
      properties.sort((a, b) => a[0].localeCompare(b[0]));
      return new Map<string, string>(properties);
    },
    staleTime: Infinity,
    throwOnError: true,
  });
  return data;
}

export function useLocalization(lang: Language) {
  const { data: gameData } = useGameData();
  const { data } = useQuery({
    queryKey: ['l10n', lang, gameData?.path],
    enabled: gameData?.ready ?? false,
    queryFn: async () => await refreshLocalization(lang),
    throwOnError: true,
  });
  return data;
}

async function refreshLocalization(lang: Language): Promise<Localization> {
  const cached = await db.Localizations.get(lang);
  try {
    const localization = await requestGameData<Localization>(`/api/localization/${lang}`);
    if (
      localization.lang !== lang ||
      typeof localization.labels !== 'object' ||
      localization.labels === null ||
      Object.values(localization.labels).some((label) => typeof label !== 'string')
    ) {
      throw new Error(`The local ${lang} localization data has an invalid format.`);
    }
    await db.Localizations.put(localization);
    prefabsFilter.refresh();
    return localization;
  } catch (err) {
    console.error(`Failed to load ${lang} localization; using the last cached data when available.`, err);
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

import { db } from '../store/db/index.ts';
import { Language } from '../utils/language.ts';
import { LabelHolder } from './lib/LabelHolder.ts';
import { PrefabsFilter, PrefabsFilterRequest } from './lib/PrefabsFilter.ts';

async function fetchPrefabProperties() {
  const prefabs = await db.Prefabs.toArray();
  return prefabs.map((p) => ({ [p.name]: p })).reduce((a, c) => Object.assign(a, c), {});
}

async function fetchLabelMap(lang: Language) {
  const l10n = await db.Localizations.get(lang);
  return l10n?.labels;
}

const prefabs = new PrefabsFilter(fetchPrefabProperties(), new LabelHolder(fetchLabelMap));

prefabs.addUpdateListener((result) => {
  console.log('[prefabsFilter] postMessage:', result);
  postMessage(result);
});

onmessage = ({ data }: MessageEvent<PrefabsFilterRequest>) => {
  if (prefabs.isUpdateNeeded(data)) {
    console.log('[prefabsFilter] onmessage:', data);
    Object.assign(prefabs, data).update();
  }
};

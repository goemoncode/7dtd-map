import { PrefabInfo } from '../../../store/db';
import { MapDecoration } from '../../../utils/parsePrefabsXml';
import { MatchedPrefab } from '../PrefabsFilter';

export * from './PropertyMatchFilter';
export * from './PrefabNameMatchFilter';
export * from './BlockNameMatchFilter';
export * from './DistanceFilter';

export type FilterFunction = (prefab: MapDecoration) => MatchedPrefab | null;

export interface PrefabFilter {
  createFilter: () => Promise<FilterFunction>;
}

export function createRegExp(pattern: string, flags = 'i') {
  try {
    return new RegExp(pattern, flags);
  } catch {
    return null;
  }
}

export type RegExpMatch = { index: number; length: number };

export function isMatch(str: string, regex: RegExp): RegExpMatch | null {
  const m = str.match(regex);
  return m && m.index !== undefined ? { index: m.index, length: m[0].length } : null;
}

interface PrefabProperties {
  [prefabName: string]: PrefabInfo;
}

export interface BlockPrefabIndex {
  [blockName: string]: { [prefabName: string]: number };
}

export type PrefabPropertiesAwaiter = Promise<PrefabProperties>;
export type BlockPrefabIndexAwaiter = Promise<BlockPrefabIndex>;

import type { Language } from '../../utils/language';
import type { PngBlob } from '../../utils/PngBlob';
import type { MapInfo } from '../../utils/parseMapInfoXml';
import type { MapDecoration } from '../../utils/parsePrefabsXml';
import type { SpawnPoint } from '../../utils/parseSpawnPointsXml';

export interface MapMetadata {
  id: number;
  name: string;
  width: number;
  height: number;
  info?: MapInfo;
  biomes?: [number, number][];
}

export interface MapLargeObjects {
  // ImageBitmap for backward compatibility
  biomes?: ImageBitmap | PngBlob;
  splat3?: ImageBitmap | PngBlob;
  splat4?: ImageBitmap | PngBlob;
  radiation?: ImageBitmap | PngBlob;
  elevations?: Uint8Array;
  prefabs?: MapDecoration[];
  spawnpoints?: SpawnPoint[];
}

export type MapLargeObjectType = keyof MapLargeObjects;

export interface MapLargeObject<T extends MapLargeObjectType> {
  mapId: number;
  type: T;
  data: MapLargeObjects[T];
}

export type LabelMap = { [key: string]: string };

export interface Localization {
  lang: Language;
  labels: LabelMap;
}

export interface PrefabInfo {
  name: string;
  modName?: string;
  group?: string;
  url?: string;

  difficulty: number;
  /**
   * length from left to right when player is face to north on prefab editor
   */
  width: number;
  height: number;
  depth: number;
  /**
   * 0: no need rotate (face to north)
   * 1: rotate 90° left (face to east)
   * 2: rotate 180° left (face to south)
   * 3: rotate 270° left (face to west)
   */
  rotationToFaceNorth: number;
  tags: string;

  blocks?: { [blockName: string]: number };
}

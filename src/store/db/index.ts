import Dexie, { Table } from 'dexie';
import { shallowEqualLeft } from '../../utils';
import { Localization, MapLargeObject, MapLargeObjectType, MapLargeObjects, MapMetadata, PrefabInfo } from './types';
export * from './types';

export const DATABASE_NAME = '7dtd-map';
export const DEFAULT_WORLD_NAME = 'New World';

export class MyDexie extends Dexie {
  Maps!: Table<MapMetadata, number>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  MapLargeObjects!: Table<MapLargeObject<any>, [number, string]>;
  Localizations!: Table<Localization, string>;
  Prefabs!: Table<PrefabInfo, string>;

  constructor() {
    super(DATABASE_NAME);
    this.version(1).stores({
      Maps: '++id',
      MapLargeObjects: '[mapId+type],mapId',
      Localizations: 'lang',
      Prefabs: 'name',
    });
    this.on('ready', async () => {
      const count = await this.Maps.count();
      if (count === 0) {
        await this.createNewMap();
      }
    });
  }

  async createNewMap(name: string = DEFAULT_WORLD_NAME) {
    const newMap = { name, width: 0, height: 0 } as MapMetadata;
    newMap.id = await this.Maps.add(newMap);
    return newMap;
  }

  async setMapName(mapId: number, name: string) {
    await this.setMetadata(mapId, { name });
  }

  async setMapSize(mapId: number, width: number, height: number) {
    await this.setMetadata(mapId, { width, height });
  }

  async getMapSize(mapId: number) {
    const map = await this.Maps.get(mapId);
    return map ? [map.width, map.height] : [0, 0];
  }

  async setMetadata(mapId: number, entry: Partial<Omit<MapMetadata, 'id'>>) {
    const current = await this.Maps.get(mapId);
    if (current && !shallowEqualLeft(entry, current)) {
      await this.Maps.update(mapId, entry);
    }
  }

  async deleteMap(mapId: number) {
    await Promise.all([this.Maps.delete(mapId), this.MapLargeObjects.where({ mapId }).delete()]);
  }

  async getLargeObject<T extends MapLargeObjectType>(mapId: number, type: T) {
    const largeObject = (await this.MapLargeObjects.get([mapId, type])) as MapLargeObject<T> | undefined;
    return largeObject?.data;
  }

  async putLargeObject<T extends MapLargeObjectType>(mapId: number, type: T, data: MapLargeObjects[T]) {
    await this.MapLargeObjects.put({ mapId, type, data });
  }

  async getLargeObjects(mapId: number, types: MapLargeObjectType[]): Promise<MapLargeObjects> {
    const objects = await Promise.all(
      types.map(async (type) => {
        const obj = await this.getLargeObject(mapId, type);
        return obj ? { [type]: obj } : {};
      })
    );
    return objects.reduce((merged, o) => ({ ...merged, ...o }), {});
  }
}

export const db = new MyDexie();

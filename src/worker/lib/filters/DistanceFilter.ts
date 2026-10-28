import { FilterFunction, PrefabFilter } from './index.ts';
import { calcDist, GameCoords } from '../../../utils/index.ts';
import { MapDecoration } from '../../../utils/parsePrefabsXml.ts';

export class DistanceFilter implements PrefabFilter {
  constructor(private marker: GameCoords | null) {}

  async createFilter(): Promise<FilterFunction> {
    return (prefab: MapDecoration) => {
      return { ...prefab, dist: this.marker ? calcDist(prefab, this.marker) : null };
    };
  }
}

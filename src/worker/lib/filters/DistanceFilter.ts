import { FilterFunction, PrefabFilter } from '.';
import { GameCoords, calcDist } from '../../../utils';
import { MapDecoration } from '../../../utils/parsePrefabsXml';

export class DistanceFilter implements PrefabFilter {
  constructor(private marker: GameCoords | null) {}

  async createFilter(): Promise<FilterFunction> {
    return (prefab: MapDecoration) => {
      return { ...prefab, dist: this.marker ? calcDist(prefab, this.marker) : null };
    };
  }
}

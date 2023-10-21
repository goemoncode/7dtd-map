import { FilterFunction, PrefabFilter, createRegExp } from '.';
import { MapDecoration } from '../../../utils/parsePrefabsXml';
import { FilterConditions } from '../PrefabsFilter';
import { PrefabPropertiesAwaiter } from '.';

const allMatch = () => true;

export class PropertyMatchFilter implements PrefabFilter {
  constructor(private cond: FilterConditions, private propertiesAwaiter: PrefabPropertiesAwaiter) {}

  async createFilter(): Promise<FilterFunction> {
    const properties = await this.propertiesAwaiter;
    const targetDifficulties = new Set(this.cond.difficultyFilter);
    const difficultyMatch = targetDifficulties.size ? targetDifficulties.has.bind(targetDifficulties) : allMatch;
    const tagsRegex = this.cond.prefabTagsFilter.length ? createRegExp(this.cond.prefabTagsFilter) : null;
    const tagsMatch = tagsRegex?.test.bind(tagsRegex) ?? allMatch;
    return (prefab: MapDecoration) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { difficulty = 0, width = 0, depth = 0, tags = '', blocks, ...props } = properties[prefab.name] ?? {};
      if (!difficultyMatch(difficulty)) return null;
      if (!tagsMatch(tags)) return null;
      const { x, z, rotation } = prefab;
      const [w, d] = rotation % 2 === 0 ? [width, depth] : [depth, width];
      const centerCoords = { x: x + w / 2, z: z + d / 2 };
      return { ...prefab, ...centerCoords, difficulty, width, depth, ...props, tags, centerCoords };
    };
  }
}

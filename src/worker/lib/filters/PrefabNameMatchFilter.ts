import { createRegExp, FilterFunction, isMatch, PrefabFilter } from './index.ts';
import { MapDecoration } from '../../../utils/parsePrefabsXml.ts';
import { LabelHolder } from '../LabelHolder.ts';
import { MatchedPrefab } from '../PrefabsFilter.ts';

export class PrefabNameMatchFilter implements PrefabFilter {
  constructor(
    private prefabName: string,
    private labels: LabelHolder
  ) {}

  async createFilter(): Promise<FilterFunction> {
    const mapper = await this.labels.getMapper();
    const regex = this.prefabName.length ? createRegExp(this.prefabName) : null;
    return (prefab: MapDecoration) => {
      const label = mapper(prefab.name);
      if (!regex) return { ...prefab, label };
      const nameMatch = isMatch(prefab.name, regex);
      const labelMatch = label ? isMatch(label, regex) : null;
      return nameMatch || labelMatch ? ({ ...prefab, label, nameMatch, labelMatch } as MatchedPrefab) : null;
    };
  }
}

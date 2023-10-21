import { FilterFunction, PrefabFilter, createRegExp, isMatch } from '.';
import { LabelHolder } from '../LabelHolder';
import { MathcedBlock } from '../PrefabsFilter';
import { BlockPrefabIndexAwaiter } from '.';

type MatchedPrefabBlocks = {
  [name: string]: MathcedBlock[];
};

export class BlockNameMatchFilter implements PrefabFilter {
  constructor(private blockName: string, private labels: LabelHolder, private indexAwaiter: BlockPrefabIndexAwaiter) {}

  async createFilter(): Promise<FilterFunction> {
    const regex = this.blockName.length ? createRegExp(this.blockName) : null;
    if (!regex) {
      return (prefab) => prefab;
    }
    const matchedBlocks = await this.matchBlocks(regex);
    if (matchedBlocks.length === 0) {
      return () => null;
    }
    const matchedPrefabBlocks = this.createMatchedPrefabBlocks(matchedBlocks);
    if (Object.keys(matchedPrefabBlocks).length === 0) {
      return () => null;
    }
    return (prefab) => {
      const blocks = matchedPrefabBlocks[prefab.name];
      return blocks ? { ...prefab, matchedBlocks: blocks } : null;
    };
  }

  private async matchBlocks(regexp: RegExp) {
    const mapper = await this.labels.getMapper();
    const index = await this.indexAwaiter;
    return Object.entries(index).flatMap(([name, prefabs]) => {
      if (!regexp) return [];
      const label = mapper(name);
      const nameMatch = isMatch(name, regexp);
      const labelMatch = label ? isMatch(label, regexp) : null;
      if (!nameMatch && !labelMatch) return [];
      return { name, label, nameMatch, labelMatch, prefabs } as MathcedBlock;
    });
  }

  private createMatchedPrefabBlocks(matchedBlocks: MathcedBlock[]): MatchedPrefabBlocks {
    return matchedBlocks.reduce<MatchedPrefabBlocks>((index, block) => {
      const { prefabs = {}, ...matchedBlock } = block;
      Object.entries(prefabs).forEach(([prefabName, count]) => {
        index[prefabName] = (index[prefabName] || []).concat({ ...matchedBlock, count });
      });
      return index;
    }, {});
  }
}

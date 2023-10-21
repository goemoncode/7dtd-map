import { GameCoords, shallowEqualLeft, shallowEqualLeftStrict } from '../../utils';
import { Language } from '../../utils/language';
import { MapDecoration } from '../../utils/parsePrefabsXml';
import { throttledInvoker } from '../../utils/throttledInvoker';
import { PrefabInfo } from '../../store/db';
import { LabelHolder } from './LabelHolder';
import {
  BlockNameMatchFilter as BlocksUsedMatchFilter,
  PropertyMatchFilter,
  DistanceFilter,
  PrefabNameMatchFilter,
  PrefabPropertiesAwaiter,
  BlockPrefabIndex,
  BlockPrefabIndexAwaiter,
  RegExpMatch,
} from './filters';

export interface MatchedPrefab extends MapDecoration, Omit<Partial<PrefabInfo>, 'name'> {
  centerCoords?: { x: number; z: number };
  label?: string;
  nameMatch?: RegExpMatch | null;
  labelMatch?: RegExpMatch | null;
  matchedBlocks?: MathcedBlock[];
  dist?: number | null;
}

export interface MathcedBlock {
  name: string;
  label?: string;
  nameMatch?: RegExpMatch | null;
  labelMatch?: RegExpMatch | null;
  count?: number;
  prefabs?: { [prefabName: string]: number };
}

export interface FilterConditions {
  difficultyFilter: number[];
  prefabNameFilter: string;
  prefabTagsFilter: string;
  blocksUsedFilter: string;
}

export type PrefabsFilterRequest = Partial<Pick<PrefabsFilter, 'prefabs' | 'language' | 'markerCoords' | keyof FilterConditions>>;

export interface PrefabsFilterResult {
  status: string;
  markerCoords: GameCoords | null;
  prefabs: MatchedPrefab[];
}

export interface PrefabsFilterUpdateListener {
  (result: PrefabsFilterResult): void;
}

export class PrefabsFilter implements FilterConditions {
  prefabs: MapDecoration[] = [];
  markerCoords: GameCoords | null = null;
  difficultyFilter: number[] = [];
  prefabNameFilter: string = '';
  prefabTagsFilter: string = '';
  blocksUsedFilter: string = '';

  update = throttledInvoker(async () => {
    console.time('PrefabsUpdate');
    await this.updateImmediately();
    console.timeEnd('PrefabsUpdate');
  });

  private listeners: PrefabsFilterUpdateListener[] = [];
  private blockPrefabIndex: BlockPrefabIndexAwaiter;

  constructor(private prefabProperties: PrefabPropertiesAwaiter, private labels: LabelHolder) {
    this.blockPrefabIndex = buildBlockPrefabIndex(prefabProperties);
  }

  get language() {
    return this.labels.language;
  }

  set language(lang: Language) {
    this.labels.language = lang;
  }

  addUpdateListener(listener: PrefabsFilterUpdateListener): void {
    this.listeners.push(listener);
  }

  isUpdateNeeded({ markerCoords, difficultyFilter, ...others }: PrefabsFilterRequest) {
    return (
      (markerCoords !== undefined && !shallowEqualLeft(markerCoords, this.markerCoords)) ||
      (difficultyFilter !== undefined && !shallowEqualLeftStrict(difficultyFilter, this.difficultyFilter)) ||
      !shallowEqualLeft(others, this)
    );
  }

  private async updateImmediately() {
    const filtered = await this.applyFilter(this.prefabs);
    const result: PrefabsFilterResult = {
      status: `${filtered.length} matched prefabs`,
      markerCoords: this.markerCoords,
      prefabs: filtered,
    };
    this.sortResult(result);
    this.listeners.forEach((listener) => listener(result));
  }

  private async applyFilter(prefabs: MapDecoration[]) {
    const filters = await Promise.all(
      [
        new PropertyMatchFilter(this, this.prefabProperties),
        new PrefabNameMatchFilter(this.prefabNameFilter, this.labels),
        new BlocksUsedMatchFilter(this.blocksUsedFilter, this.labels, this.blockPrefabIndex),
        new DistanceFilter(this.markerCoords),
      ].map((f) => f.createFilter())
    );
    return prefabs.flatMap<MatchedPrefab>((prefab: MapDecoration | null) => {
      return filters.reduce((prefab, filter) => (prefab ? filter(prefab) : null), prefab) ?? [];
    });
  }

  private sortResult(result: PrefabsFilterResult) {
    if (this.markerCoords) {
      result.status = `${result.status}, order by distances from the flag`;
      result.prefabs.sort((a, b) => (a.dist ?? 0) - (b.dist ?? 0));
    } else {
      result.prefabs.sort((a, b) => a.name.localeCompare(b.name));
    }
  }
}

async function buildBlockPrefabIndex(prefabProperties: PrefabPropertiesAwaiter): Promise<BlockPrefabIndex> {
  const prefabs = await prefabProperties;
  return Object.entries(prefabs)
    .flatMap(([prefabName, { blocks = {} }]) => {
      return Object.entries(blocks).map(([blockName, count]) => ({ [blockName]: { [prefabName]: count } }));
    })
    .reduce((a, c) => {
      const [blockName, prefab] = Object.entries(c)[0];
      a[blockName] = Object.assign(a[blockName] ?? {}, prefab);
      return a;
    }, {});
}

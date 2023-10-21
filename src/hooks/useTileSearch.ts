import { useCallback, useMemo } from 'react';
import { GameCoords, calcDist } from '../utils';
import { MatchedPrefab } from '../worker/lib/PrefabsFilter';

export function useTileSearch(matched: MatchedPrefab[], mapSize: number, tileSize: number = 256) {
  const tiles = useMemo(() => {
    const tiles = new Map<number, MatchedPrefab[]>();
    if (mapSize === 0) return tiles;
    const n = mapSize / tileSize;
    matched.forEach((prefab) => {
      const x = Math.floor((prefab.x + mapSize / 2) / tileSize);
      const y = Math.floor((-prefab.z + mapSize / 2) / tileSize);
      const i = x + y * n;
      tiles.set(i, [...(tiles.get(i) ?? []), prefab]);
    });
    return tiles;
  }, [matched, mapSize, tileSize]);

  return useCallback(
    (coords: GameCoords, radius: number) => {
      const n = mapSize / tileSize;
      const clamp = (n: number) => Math.max(Math.min(n, mapSize - 1), 0);
      const center = { x: coords.x + mapSize / 2, y: -coords.z + mapSize / 2 };
      const xmin = Math.floor(clamp(center.x - radius) / tileSize);
      const xmax = Math.floor(clamp(center.x + radius) / tileSize);
      const ymin = Math.floor(clamp(center.y - radius) / tileSize);
      const ymax = Math.floor(clamp(center.y + radius) / tileSize);
      return range(ymin, ymax)
        .flatMap((y) => range(xmin, xmax).map((x) => x + y * n))
        .flatMap((i) => tiles.get(i) ?? [])
        .filter((p) => calcDist(p, coords) < radius)
        .sort((a, b) => {
          const ta = { x: a.position.x + mapSize / 2, y: a.position.z + mapSize / 2 };
          const tb = { x: b.position.x + mapSize / 2, y: b.position.z + mapSize / 2 };
          return ta.x * ta.y - tb.x * tb.y || (b.width ?? 0) * (b.depth ?? 0) - (a.width ?? 0) * (a.depth ?? 0);
        });
    },
    [mapSize, tileSize, tiles]
  );
}

function range(min: number, max: number) {
  return new Array<number>(max - min + 1).fill(min).map((min, i) => min + i);
}

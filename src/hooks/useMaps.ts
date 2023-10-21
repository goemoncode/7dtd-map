import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAppSelector } from '../store';
import { selectMapId } from '../store/map';
import { db } from '../store/db';
import { GameMapSize, gameMapSize } from '../utils';
import { Dtm } from '../utils/Dtm';

export function useMapSize(): [number, GameMapSize | null] {
  const mapId = useAppSelector(selectMapId);
  const metadata = useLiveQuery(() => db.Maps.get(mapId), [mapId]);
  const width = useMemo(() => metadata?.width ?? 0, [metadata]);
  const height = useMemo(() => metadata?.height ?? 0, [metadata]);
  const mapSize = useMemo(() => (width > 0 && height > 0 ? gameMapSize({ width, height }) : null), [width, height]);
  return [mapId, mapSize];
}

export function useMapMetadata() {
  const mapId = useAppSelector(selectMapId);
  return useLiveQuery(() => db.Maps.get(mapId), [mapId]);
}

export function useMapElevation() {
  const mapId = useAppSelector(selectMapId);
  return useLiveQuery(async () => {
    const data = await db.getLargeObject(mapId, 'elevations');
    return data ? new Dtm(data) : undefined;
  }, [mapId]);
}

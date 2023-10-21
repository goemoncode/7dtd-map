import MapStatsUpdater from '../mapStatsUpdater?worker';
import { MapMetadata } from '../../store/db';
import { lazy } from '.';

class MapStatsUpdaterProxy {
  private worker = lazy(MapStatsUpdater);

  update(mapId: number) {
    this.worker.value.postMessage(mapId);
  }

  addUpdateListener(listener: (response: MapMetadata) => void) {
    const _listener = ({ data }: MessageEvent<MapMetadata>) => listener(data);
    this.worker.value.addEventListener('message', _listener);
    return () => {
      this.worker.value.removeEventListener('message', _listener);
    };
  }
}

export const mapStatsUpdater = new MapStatsUpdaterProxy();

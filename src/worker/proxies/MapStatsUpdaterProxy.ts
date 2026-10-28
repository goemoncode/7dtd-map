import { MapMetadata } from '../../store/db/index.ts';
import { lazy } from './index.ts';

class MapStatsUpdaterProxy {
  private worker = lazy(() => new Worker(new URL('../mapStatsUpdater.ts', import.meta.url), { type: 'module' }));

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

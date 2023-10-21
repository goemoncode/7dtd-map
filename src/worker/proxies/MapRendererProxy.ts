import MapRenderer from '../mapRenderer?worker';
import type { MapUpdateEventArgs, WorkerEventArgs } from '../mapRenderer';
import type { MapProperties } from '../lib/MapRenderer';
import { lazy } from '.';

function isTransferable(v: unknown): v is ImageBitmap {
  return v instanceof ImageBitmap;
}

function getTransferables(args: WorkerEventArgs) {
  if (args.eventName === 'init') {
    return [args.textureCanvas, args.terrainCanvas];
  } else if (args.eventName === 'updateTexture') {
    return Object.values(args).filter(isTransferable);
  } else if (args.eventName === 'updateTerrain') {
    return args.mapElevations ? [args.mapElevations.buffer] : [];
  } else {
    return [];
  }
}

class MapRendererProxy {
  private worker = lazy(MapRenderer);

  initialized = false;

  sendEvent(args: WorkerEventArgs) {
    this.worker.value.postMessage(args, getTransferables(args));
  }

  updateTexture(args: Partial<MapProperties> | null) {
    if (args) {
      this.sendEvent({ eventName: 'updateTexture', ...args });
    } else {
      this.sendEvent({
        eventName: 'updateTexture',
        mapSize: null,
        biomes: null,
        splat3: null,
        splat4: null,
        radiation: null,
        markerCoords: null,
        spawnpoints: [],
        prefabs: [],
      });
    }
  }

  addUpdateListener(listener: (args: MapUpdateEventArgs) => void) {
    const _listener = ({ data }: MessageEvent<MapUpdateEventArgs>) => listener(data);
    this.worker.value.addEventListener('message', _listener);
    return () => {
      this.worker.value.removeEventListener('message', _listener);
    };
  }
}

export const mapRenderer = new MapRendererProxy();

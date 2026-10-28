import type { PrefabsFilterRequest, PrefabsFilterResult } from '../lib/PrefabsFilter.ts';
import { lazy } from './index.ts';

class PrefabsFilterProxy {
  private worker = lazy(() => new Worker(new URL('../prefabsFilter.ts', import.meta.url), { type: 'module' }));

  update(request: PrefabsFilterRequest) {
    this.worker.value.postMessage(request);
  }

  addUpdateListener(listener: (response: PrefabsFilterResult) => void) {
    const _listener = ({ data }: MessageEvent<PrefabsFilterResult>) => listener(data);
    this.worker.value.addEventListener('message', _listener);
    return () => {
      this.worker.value.removeEventListener('message', _listener);
    };
  }
}

export const prefabsFilter = new PrefabsFilterProxy();

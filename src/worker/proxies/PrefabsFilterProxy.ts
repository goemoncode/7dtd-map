import PrefabsFilter from '../prefabsFilter?worker';
import type { PrefabsFilterResult, PrefabsFilterRequest } from '../lib/PrefabsFilter';
import { lazy } from '.';

class PrefabsFilterProxy {
  private worker = lazy(PrefabsFilter);

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

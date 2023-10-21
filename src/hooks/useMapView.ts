import { createContext, useContext } from 'react';
import { MapDecoration } from '../utils/parsePrefabsXml';

export interface MapViewHandle {
  canvas: HTMLCanvasElement | null;
  focusOn: (prefab: MapDecoration) => void;
}

export const Context = createContext<MapViewHandle | null>(null);

export const MapViewHandleProvider = Context.Provider;
export const useMapView = () => useContext(Context);

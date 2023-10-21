import { MapEmojiMarker } from './lib/MapSpotMarker';
import { MapProperties, MapRenderer, MapUpdateStatus } from './lib/MapRenderer';
import { TerrainRenderer, TerrainUpdateStatus } from './lib/TerrainRenderer';

const notoFont = new FontFace('Noto Sans', 'url(/fonts/NotoEmoji-Regular.ttf)');
const textureRenderer = new MapRenderer({
  markers: {
    flag: new MapEmojiMarker('🏴', 100, notoFont.family, 'blue', 'left', 'bottom', -31, 5),
    spawnpoint: new MapEmojiMarker('🚩', 100, 'Noto Color Emoji', false, 'left', 'alphabetic', -26, -1),
    prefab: new MapEmojiMarker('🏚️', 100, 'Noto Color Emoji', false, 'center', 'middle', 0, -15),
    trader: new MapEmojiMarker('🏴‍☠️', 100, 'Noto Color Emoji', false, 'left', 'bottom', -23, 0),
    pin: new MapEmojiMarker('📍', 60, 'Noto Color Emoji', false, 'center', 'bottom', 0, 0),
  },
});
const terrainRenderer = new TerrainRenderer();

Promise.all([notoFont.load()]).then((loaded) => {
  loaded.forEach((font) => fonts.add(font));
  textureRenderer.update();
});

export type WorkerEventArgs =
  | ({ eventName: 'init' } & InitEvent)
  | ({ eventName: 'updateTexture' } & UpdateTextureEvent)
  | ({ eventName: 'updateTerrain' } & UpdateTerrainEvent)
  | ({ eventName: 'renderTerrain' } & RenderTerrainEvent)
  | ({ eventName: 'resize' } & ResizeEvent)
  | ({ eventName: 'keydown' | 'keyup' } & Pick<React.KeyboardEvent<HTMLCanvasElement>, 'code'>)
  | ({ eventName: 'wheel' } & Pick<React.WheelEvent<HTMLCanvasElement>, 'deltaY'>)
  | ({ eventName: 'mousedown' | 'mousemove' } & Pick<
      React.MouseEvent<HTMLCanvasElement>,
      'button' | 'buttons' | 'movementX' | 'movementY'
    >);

type InitEvent = { textureCanvas: OffscreenCanvas; terrainCanvas: OffscreenCanvas; devicePixelRatio: number };
type UpdateTextureEvent = Partial<MapProperties>;
type UpdateTerrainEvent = { mapElevations: Uint8Array | null };
type RenderTerrainEvent = { start: boolean };
type ResizeEvent = { width: number; height: number };

export type MapUpdateEventArgs = ({ eventName: 'texture' } & MapUpdateStatus) | ({ eventName: 'terrain' } & TerrainUpdateStatus);

textureRenderer.addUpdateListener((status) => {
  console.log('[mapRenderer] postMessage:', status);
  postMessage({ eventName: 'texture', ...status });
});

terrainRenderer.addUpdateListener((status) => {
  console.log('[mapRenderer] postMessage:', status);
  postMessage({ eventName: 'terrain', ...status });
});

onmessage = ({ data }: MessageEvent<WorkerEventArgs>) => {
  textureRenderer.handleEvent(data);
  terrainRenderer.handleEvent(data);
  terrainRenderer.cameraController.handleEvent(data);
};

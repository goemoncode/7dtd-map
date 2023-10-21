import { GameCoords, GameMapSize, shallowEqualLeft } from '../../utils';
import { PngBlob } from '../../utils/PngBlob';
import { MapPreference, defaultPreference } from '../../utils/MapPreference';
import { throttledInvoker } from '../../utils/throttledInvoker';
import { SpawnPoint } from '../../utils/parseSpawnPointsXml';
import { MatchedPrefab } from './PrefabsFilter';
import { ImageBitmapHolder } from './ImageBitmapHolder';
import { MapPrefabMarker, MapSpotMarkers } from './MapSpotMarker';
import type { WorkerEventArgs } from '../mapRenderer';

export interface MapProperties {
  mapSize: GameMapSize | null;
  preference: MapPreference;
  biomes: ImageBitmap | PngBlob | null;
  splat3: ImageBitmap | PngBlob | null;
  splat4: ImageBitmap | PngBlob | null;
  radiation: ImageBitmap | PngBlob | null;
  markerCoords: GameCoords | null;
  spawnpoints: SpawnPoint[];
  prefabs: MatchedPrefab[];
}

export interface MapRendererOptions {
  markers: MapSpotMarkers;
}

export type MapRendererStatus = 'busy' | 'ready' | 'contextlost' | 'contextrestored' | null;

export interface MapUpdateStatus {
  status: MapRendererStatus;
}

export interface MapUpdateListener {
  (status: MapUpdateStatus): void;
}

export class MapRenderer implements MapProperties {
  canvas: OffscreenCanvas | null = null;
  mapSize: GameMapSize | null = null;
  preference: MapPreference = { ...defaultPreference };
  markerCoords: GameCoords | null = null;
  spawnpoints: SpawnPoint[] = [];
  prefabs: MatchedPrefab[] = [];

  update = throttledInvoker(async () => {
    console.time('MapUpdate');
    await this.updateImmediately();
    console.timeEnd('MapUpdate');
  });

  private _biomesImg: ImageBitmapHolder | null = null;
  private _splat3Img: ImageBitmapHolder | null = null;
  private _splat4Img: ImageBitmapHolder | null = null;
  private _radiationImg: ImageBitmapHolder | null = null;

  private markers: MapSpotMarkers;
  private prefabMarker: MapPrefabMarker;
  private listeners: MapUpdateListener[] = [];

  constructor(options: MapRendererOptions) {
    this.markers = options.markers;
    this.prefabMarker = new MapPrefabMarker(this.markers);
  }

  get biomes() {
    return this._biomesImg?.blobOrNull ?? null;
  }
  set biomes(img: ImageBitmap | PngBlob | null) {
    this._biomesImg = img ? new ImageBitmapHolder('biomes', img) : null;
  }
  get splat3() {
    return this._splat3Img?.blobOrNull ?? null;
  }
  set splat3(img: ImageBitmap | PngBlob | null) {
    this._splat3Img = img ? new ImageBitmapHolder('splat3', img) : null;
  }
  get splat4() {
    return this._splat4Img?.blobOrNull ?? null;
  }
  set splat4(img: ImageBitmap | PngBlob | null) {
    this._splat4Img = img ? new ImageBitmapHolder('splat4', img) : null;
  }
  get radiation() {
    return this._radiationImg?.blobOrNull ?? null;
  }
  set radiation(img: ImageBitmap | PngBlob | null) {
    this._radiationImg = img ? new ImageBitmapHolder('radiation', img) : null;
  }

  handleEvent(event: WorkerEventArgs) {
    switch (event.eventName) {
      case 'init': {
        this.canvas = event.textureCanvas;
        this.canvas.addEventListener('contextlost', () => {
          this.listeners.forEach((listener) => listener({ status: 'contextlost' }));
        });
        this.canvas.addEventListener('contextrestored', () => {
          this.listeners.forEach((listener) => listener({ status: 'contextrestored' }));
        });
        break;
      }
      case 'updateTexture': {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { eventName, ...props } = event;
        if (this.isUpdateNeeded(props)) {
          console.log('[mapRenderer] onmessage:', props);
          Object.assign(this, props).update();
        }
        break;
      }
    }
  }

  addUpdateListener(listener: MapUpdateListener): void {
    this.listeners.push(listener);
  }

  isUpdateNeeded({ preference, ...others }: Partial<MapProperties>) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { scale, ...p } = preference || {};
    return (preference !== undefined && !shallowEqualLeft(p, this.preference)) || !shallowEqualLeft(others, this);
  }

  private async updateImmediately() {
    if (!this.canvas || !this.mapSize) return;
    if (!this._biomesImg && !this._splat3Img && !this._splat4Img) {
      this.canvas.width = 1;
      this.canvas.height = 1;
      return;
    }

    const { width, height } = this.mapSize;
    const { biomesAlpha, splat3Alpha, splat4Alpha, radAlpha, markerAlpha, brightness } = this.preference;

    this.canvas.width = width;
    this.canvas.height = height;

    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;

    ctx.filter = `brightness(${brightness}%)`;

    if (this._biomesImg && biomesAlpha !== 0) {
      ctx.globalAlpha = biomesAlpha;
      ctx.drawImage(await this._biomesImg.get(), 0, 0, width, height);
    }
    if (this._splat3Img && splat3Alpha !== 0) {
      ctx.globalAlpha = splat3Alpha;
      ctx.drawImage(await this._splat3Img.get(), 0, 0, width, height);
    }
    if (this._splat4Img && splat4Alpha !== 0) {
      ctx.globalAlpha = splat4Alpha;
      ctx.drawImage(await this._splat4Img.get(), 0, 0, width, height);
    }

    ctx.filter = 'none';

    if (this._radiationImg && radAlpha !== 0) {
      ctx.globalAlpha = radAlpha;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(await this._radiationImg.get(), 0, 0, width, height);
      ctx.imageSmoothingEnabled = true;
    }

    ctx.globalAlpha = markerAlpha;
    ctx.translate(width / 2, height / 2);
    this.drawPrefabs(ctx);
    this.drawSpawnpoints(ctx);
    this.drawFlag(ctx);
  }

  private drawFlag(ctx: OffscreenCanvasRenderingContext2D) {
    if (!this.markerCoords) return;
    this.markers.flag.scale = this.preference.markerScale;
    const { x, z } = this.markerCoords;
    this.markers.flag.drawMarker(ctx, x, -z);
  }

  private drawSpawnpoints(ctx: OffscreenCanvasRenderingContext2D) {
    if (!this.preference.showSpawnpoints) return;
    this.markers.spawnpoint.scale = this.preference.markerScale;
    for (let i = this.spawnpoints.length - 1; i >= 0; i -= 1) {
      const { x, z } = this.spawnpoints[i];
      this.markers.spawnpoint.drawMarker(ctx, x, -z);
    }
  }

  private drawPrefabs(ctx: OffscreenCanvasRenderingContext2D) {
    if (!this.preference.showPrefabMarker && !this.preference.showPrefabArea) return;
    this.prefabMarker.showMarker = this.preference.showPrefabMarker;
    this.prefabMarker.showAreaRect = this.preference.showPrefabArea;
    this.prefabMarker.markerScale = this.preference.markerScale;
    // Inverted iteration to overwrite signs by higher order prefabs
    for (let i = this.prefabs.length - 1; i >= 0; i -= 1) {
      this.prefabMarker.drawMarker(ctx, this.prefabs[i]);
    }
  }
}

import { MatchedPrefab } from './PrefabsFilter';

export interface MapSpotMarkers {
  flag: MapSpotMarker;
  spawnpoint: MapSpotMarker;
  prefab: MapSpotMarker;
  trader: MapSpotMarker;
  pin: MapSpotMarker;
}

export interface MapSpotMarker {
  scale: number;
  drawMarker: (ctx: OffscreenCanvasRenderingContext2D, x: number, y: number) => void;
}

export class MapEmojiMarker implements MapSpotMarker {
  scale: number = 1;

  constructor(
    private mark: string,
    private fontSize: number,
    private fontFamily: string,
    private fillStyle: string | CanvasGradient | CanvasPattern | false,
    private textAlign: CanvasTextAlign,
    private textBaseline: CanvasTextBaseline,
    private offsetX: number = 0,
    private offsetY: number = 0
  ) {}

  applyStyle(ctx: OffscreenCanvasRenderingContext2D) {
    ctx.font = `${this.fontSize * this.scale}px ${this.fontFamily}`;
    ctx.textAlign = this.textAlign;
    ctx.textBaseline = this.textBaseline;
  }

  drawMarker(ctx: OffscreenCanvasRenderingContext2D, x: number, y: number) {
    this.applyStyle(ctx);

    const tx = x + this.offsetX * this.scale;
    const ty = y + this.offsetY * this.scale;

    if (this.fillStyle) {
      ctx.lineWidth = Math.round(this.fontSize * this.scale * 0.1);
      ctx.strokeStyle = 'black';
      ctx.strokeText(this.mark, tx, ty);
      ctx.fillStyle = this.fillStyle;
    } else {
      ctx.fillStyle = 'black';
    }

    ctx.fillText(this.mark, tx, ty);

    // this.drawDot(ctx, x, y);
  }

  drawDot(ctx: OffscreenCanvasRenderingContext2D, x: number, y: number) {
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'red';
    ctx.beginPath();
    ctx.rect(x - 3, y - 3, 6, 6);
    ctx.stroke();
  }
}

export class MapPrefabMarker {
  showAreaRect: boolean = true;
  showMarker: boolean = true;

  constructor(private signs: MapSpotMarkers) {}

  set markerScale(value: number) {
    this.signs.prefab.scale = value;
    this.signs.trader.scale = value;
    this.signs.pin.scale = value;
  }

  drawAreaRect(ctx: OffscreenCanvasRenderingContext2D, prefab: MatchedPrefab) {
    const {
      rotation,
      position: { x, z },
    } = prefab;
    let { width: w = 0, depth: d = 0 } = prefab;
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    if (rotation % 2 !== 0) {
      [w, d] = [d, w];
    }
    ctx.fillRect(x, -z - d, w, d);
    this.drawDirection(ctx, prefab);
    ctx.restore();
  }

  drawDirection(ctx: OffscreenCanvasRenderingContext2D, prefab: MatchedPrefab) {
    const {
      rotationToFaceNorth = 0,
      position: { x, z },
    } = prefab;
    let { width: w = 0, depth: d = 0, rotation } = prefab;
    rotation = (rotation + rotationToFaceNorth) % 4;
    if (rotation % 2 !== 0) {
      [w, d] = [d, w];
    }
    ctx.save();
    ctx.fillStyle = 'rgb(255, 255, 0)';
    ctx.translate(x, -z - d);
    ctx.beginPath();
    switch (rotation) {
      case 0:
        ctx.moveTo(w / 2, 0);
        ctx.lineTo(w / 2 - 5, 5);
        ctx.lineTo(w / 2 + 5, 5);
        break;
      case 1:
        ctx.moveTo(0, d / 2);
        ctx.lineTo(5, d / 2 + 5);
        ctx.lineTo(5, d / 2 - 5);
        break;
      case 2:
        ctx.moveTo(w / 2, d);
        ctx.lineTo(w / 2 - 5, d - 5);
        ctx.lineTo(w / 2 + 5, d - 5);
        break;
      case 3:
        ctx.moveTo(w, d / 2);
        ctx.lineTo(w - 5, d / 2 - 5);
        ctx.lineTo(w - 5, d / 2 + 5);
        break;
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  drawMarker(ctx: OffscreenCanvasRenderingContext2D, prefab: MatchedPrefab) {
    const { x, z } = prefab.centerCoords ?? prefab;
    if (this.showAreaRect) {
      this.drawAreaRect(ctx, prefab);
    }
    if (this.showMarker) {
      if (prefab.name.startsWith('trader_')) {
        this.signs.trader.drawMarker(ctx, x, -z);
      } else {
        this.signs.pin.drawMarker(ctx, x, -z);
      }
    }
  }
}

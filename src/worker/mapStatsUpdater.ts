import { requireNonnull } from '../utils';
import { Png } from './proxies/Png';
import { isPngBlob } from '../utils/PngBlob';
import { MapMetadata, db } from '../store/db';

onmessage = async ({ data: mapId }: MessageEvent<number>) => {
  const [w, h] = await db.getMapSize(mapId);
  const blob = await db.getLargeObject(mapId, 'biomes');
  if (!isPngBlob(blob)) return;
  console.time('StatsUpdate');
  const biomes = await getBiomeAreaCount(blob, w, h);
  const metadata: Partial<MapMetadata> = { biomes };
  db.setMetadata(mapId, metadata);
  console.timeEnd('StatsUpdate');
  postMessage(metadata);
};

export async function getBiomeAreaCount(file: Blob, width: number, height: number) {
  const data = await getBiomeImageData(file, width, height);
  const count = new Map<number, number>();
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b] = data.slice(i, i + 4);
    const color = (r << 16) + (g << 8) + b;
    count.set(color, (count.get(color) ?? 0) + 1);
  }
  return Array.from(count);
}

async function getBiomeImageData(blob: Blob, width: number, height: number) {
  const image = await createImageBitmap(blob);
  if (image.width !== width || image.height !== height) {
    const canvas = new OffscreenCanvas(width, height);
    const context = requireNonnull(canvas.getContext('2d'));
    context.drawImage(image, 0, 0, width, height);
    const { data } = context.getImageData(0, 0, width, height);
    return data;
  } else {
    const png = await Png.loadFrom(blob);
    return new Uint8ClampedArray(png.data);
  }
}

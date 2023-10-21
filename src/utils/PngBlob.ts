import { requireNonnull } from '.';

export interface PngBlob extends Blob {
  type: 'image/png';
}

export function isPngBlob(o: Blob | PngBlob | ImageBitmap | null | undefined): o is PngBlob {
  return o instanceof Blob && o.type === 'image/png';
}

export async function imageBitmapToPngBlob(img: ImageBitmap): Promise<PngBlob> {
  const canvas = new OffscreenCanvas(img.width, img.height);
  const context = requireNonnull(canvas.getContext('2d'));
  context.drawImage(img, 0, 0);
  return (await canvas.convertToBlob({ type: 'image/png' })) as PngBlob;
}

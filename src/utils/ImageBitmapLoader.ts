import { Png } from '../worker/proxies/Png';

export class ImageBitmapLoader {
  static async fromSplat3(file: File): Promise<ImageBitmap> {
    const png = await Png.loadFrom(file);
    return renderImage(png, convertSplat3);
  }

  static async fromSplat4(file: File): Promise<ImageBitmap> {
    const png = await Png.loadFrom(file);
    return renderImage(png, convertSplat4);
  }

  static async fromRad(file: File): Promise<ImageBitmap> {
    const png = await Png.loadFrom(file);
    return renderImage(png, convertRad);
  }
}

// splatX.png should convert the pixels which:
//   * black to transparent
//   * other to non-transparent
function convertSplat3(src: Uint8Array, dest: Uint8ClampedArray) {
  for (let i = 0; i < src.length; i += 4) {
    dest[i] = src[i];
    dest[i + 1] = src[i + 1];
    dest[i + 2] = src[i + 2];
    if (src[i] === 0 && src[i + 1] === 0 && src[i + 2] === 0) {
      dest[i + 3] = 0;
    } else {
      dest[i + 3] = 255;
    }
  }
}

// splat4.png should convert the pixels which:
//   * black to 100% transparent
//   * other to non-transparent
//   * swap green and blue
function convertSplat4(src: Uint8Array, dest: Uint8ClampedArray) {
  for (let i = 0; i < src.length; i += 4) {
    dest[i] = src[i];
    dest[i + 1] = src[i + 2];
    dest[i + 2] = src[i + 1];
    if (src[i] === 0 && src[i + 1] === 0 && src[i + 2] === 0) {
      dest[i + 3] = 0;
    } else {
      dest[i + 3] = 255;
    }
  }
}

// radioation.png should convert the pixels which:
//   * red to non-transparent
//   * other to transparent
function convertRad(src: Uint8Array, dest: Uint8ClampedArray) {
  for (let i = 0; i < src.length; i += 4) {
    dest[i] = src[i];
    dest[i + 1] = 0;
    dest[i + 2] = 0;
    if (src[i] !== 0) {
      dest[i + 3] = 255;
    } else {
      dest[i + 3] = 0;
    }
  }
}

type ConvertImageBitmap = (src: Uint8Array, dest: Uint8ClampedArray) => void;

function renderImage({ data, width, height }: Png, convertFunc: ConvertImageBitmap) {
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext('2d');
  if (!context) throw Error('Unexpected error: Canvas context not found');
  const imageData = context.getImageData(0, 0, width, height);
  convertFunc(new Uint8Array(data), imageData.data);
  context.putImageData(imageData, 0, 0);
  return createImageBitmap(canvas);
}

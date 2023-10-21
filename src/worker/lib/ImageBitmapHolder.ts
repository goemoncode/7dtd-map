import { requireNonnull } from '../../utils';
import { PngBlob, imageBitmapToPngBlob, isPngBlob } from '../../utils/PngBlob';

const IMG_AGE_MSEC = 10000;

export class ImageBitmapHolder {
  private blob: PngBlob | Promise<PngBlob>;
  private img?: ImageBitmap | null;
  private fallbackPromise: Promise<ImageBitmap> | null = null;
  private lastAccessAt = 0;

  constructor(private label: string, blobOrBitmap: PngBlob | ImageBitmap, private imgAge = IMG_AGE_MSEC) {
    if (isPngBlob(blobOrBitmap)) {
      this.blob = blobOrBitmap;
    } else {
      this.blob = imageBitmapToPngBlob(blobOrBitmap);
      this.setImg(blobOrBitmap);
    }
  }

  get blobOrNull() {
    return this.blob instanceof Blob ? this.blob : null;
  }

  async get(): Promise<ImageBitmap> {
    this.lastAccessAt = Date.now();
    return this.img ?? this.fallbackPromise ?? this.getFallback();
  }

  private async getFallback() {
    this.fallbackPromise = this.getImageBitmap();
    return this.fallbackPromise;
  }

  private async getImageBitmap() {
    console.debug('Fallback', this.label);
    const img = await createImageBitmap(await this.blob);
    this.setImg(img);
    this.fallbackPromise = null;
    return img;
  }

  private setImg(img: ImageBitmap) {
    this.img = img;
    setTimeout(() => this.expireImage(), this.imgAge);
  }

  private expireImage() {
    if (Date.now() - this.lastAccessAt > this.imgAge) {
      console.debug('Expire', this.label);
      requireNonnull(this.img).close();
      this.img = null;
    } else {
      setTimeout(() => this.expireImage(), this.imgAge);
    }
  }
}

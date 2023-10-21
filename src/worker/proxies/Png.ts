import PngParser from '../pngParser?worker';
import type { PngJsReturn } from '../pngParser';

export class Png implements PngJsReturn {
  width!: number;
  height!: number;
  data!: ArrayBuffer;

  static async loadFrom(blob: Blob): Promise<Png> {
    const buffer = await blob.arrayBuffer();
    const worker = new PngParser();
    worker.postMessage(buffer, [buffer]);
    const event: MessageEvent<PngJsReturn> = await new Promise((resolve, reject) => {
      worker.onmessage = resolve;
      worker.onerror = reject;
      worker.onmessageerror = reject;
    });
    worker.terminate();
    return Object.assign(new Png(), event.data);
  }
}

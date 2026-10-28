import type { PngJsReturn } from '../pngParser.ts';

export class Png implements PngJsReturn {
  width!: number;
  height!: number;
  data!: ArrayBuffer;

  static async loadFrom(blob: Blob): Promise<Png> {
    const buffer = await blob.arrayBuffer();
    const worker = new Worker(new URL('../pngParser.ts', import.meta.url), { type: 'module' });
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

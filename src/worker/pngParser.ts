import { PNG } from 'pngjs/browser';

export interface PngJsReturn {
  width: number;
  height: number;
  data: ArrayBuffer;
}

onmessage = async (event: MessageEvent<ArrayBuffer>) => {
  const png = await parsePng(event.data);
  // ArrayBufferLike から ArrayBuffer への型キャスト
  const m: PngJsReturn = {
    width: png.width,
    height: png.height,
    data: png.data.buffer as ArrayBuffer,
  };
  postMessage(m, [m.data]);
};

function parsePng(buffer: ArrayBuffer): Promise<PNG> {
  return new Promise((resolve, reject) => {
    // ArrayBuffer から Buffer への安全なキャスト
    new PNG().parse(buffer as unknown as Buffer, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
}

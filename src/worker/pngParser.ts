import { PNG } from 'pngjs/browser';

export interface PngJsReturn {
  width: number;
  height: number;
  data: ArrayBuffer;
}

onmessage = async (event: MessageEvent<ArrayBuffer>) => {
  const png = await parsePng(event.data);
  const m: PngJsReturn = {
    width: png.width,
    height: png.height,
    data: png.data.buffer,
  };
  postMessage(m, [m.data]);
};

function parsePng(buffer: ArrayBuffer): Promise<PNG> {
  return new Promise((resolve, reject) => {
    new PNG().parse(buffer as Buffer, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
}

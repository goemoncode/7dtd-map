import { GameCoords } from '.';

export class Dtm {
  constructor(public data: Uint8Array, public size: number = Math.sqrt(data.length)) {}

  getElevation(coords: GameCoords): number {
    // In-game coords with left-top offset
    const x = Math.floor(this.size / 2) + coords.x;
    const z = Math.floor(this.size / 2) - coords.z;
    return this.data[x + z * this.size];
  }

  static loadFromRaw(buffer: ArrayBuffer) {
    const src = new Uint8Array(buffer);
    const data = new Uint8Array(src.length / 2);
    for (let i = 0; i < data.length; i++) {
      // Higher 8 bits are a sub height in a block
      // Lower 8 bits are a height
      data[i] = src[i * 2 + 1];
    }
    return new Dtm(data);
  }

  static loadFromPng(buffer: ArrayBuffer) {
    const src = new Uint8Array(buffer);
    const data = new Uint8Array(src.length / 4);
    for (let i = 0; i < data.length; i++) {
      data[i] = src[i * 4];
    }
    return new Dtm(data);
  }
}

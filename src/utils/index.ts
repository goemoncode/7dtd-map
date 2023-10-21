export function requireNonnull<T>(t: T | undefined | null, message = `Unexpected state: ${t}`): T {
  if (t != null) return t;
  else throw Error(message);
}

export function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function waitAnimationFrame(): Promise<number> {
  return new Promise((r) => requestAnimationFrame(r));
}

export async function fetchJson<T>(path: string): Promise<T> {
  return await fetch(path).then((res) => res.json() as Promise<T>);
}

export interface GameMapSize {
  type: 'game';
  width: number;
  height: number;
}

export function gameMapSize(size: { width: number; height: number }): GameMapSize {
  const { width, height } = size;
  return { type: 'game', width, height };
}

export interface GameCoords {
  type: 'game';
  x: number;
  z: number;
}

export function gameCoords(coords: { x: number; z: number }): GameCoords {
  const { x, z } = coords;
  return { type: 'game', x, z };
}

export function calcDist(coords1: { x: number; z: number }, coords2: { x: number; z: number }) {
  return Math.round(Math.sqrt((coords1.x - coords2.x) ** 2 + (coords1.z - coords2.z) ** 2));
}

export interface ThreePlaneSize {
  type: 'threePlane';
  width: number;
  height: number;
}

export function threePlaneSize(width: number, height: number): ThreePlaneSize {
  return { type: 'threePlane', width, height };
}

export function shallowEqualLeft<T extends object>(o1: T | null | undefined, o2: T | null | undefined) {
  return o1 === o2 || (o1 && o2 && Object.entries(o1).every(([key, val]) => val === o2[key as keyof T]));
}

export function shallowEqualLeftStrict<T extends object>(o1: T | null | undefined, o2: T | null | undefined) {
  return (
    o1 === o2 ||
    (o1 && o2 && Object.keys(o1).length === Object.keys(o2).length && Object.entries(o1).every(([key, val]) => val === o2[key as keyof T]))
  );
}

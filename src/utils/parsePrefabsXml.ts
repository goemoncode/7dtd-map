export interface MapDecoration {
  name: string;
  x: number;
  z: number;
  position: { x: number; y: number; z: number };
  /**
   * 0: no need rotate
   * 1: rotate 90° left
   * 2: rotate 180° left
   * 3: rotate 270° left
   */
  rotation: number;
}

export function parsePrefabsXml(xml: string): MapDecoration[] {
  const dom = new DOMParser().parseFromString(xml, 'text/xml');
  return Array.from(dom.getElementsByTagName('decoration')).flatMap((e) => {
    const name = e.getAttribute('name');
    const [x, y, z] = e.getAttribute('position')?.split(',').map(Number) ?? [];
    if (!name || x === undefined || y === undefined || z === undefined) return [];
    const rotation = Number(e.getAttribute('rotation') ?? 0);
    return { name, x, z, rotation, position: { x, y, z } };
  });
}

export interface SpawnPoint {
  x: number;
  z: number;
}

export function parseSpawnPointsXml(xml: string): SpawnPoint[] {
  const dom = new DOMParser().parseFromString(xml, 'text/xml');
  return Array.from(dom.getElementsByTagName('spawnpoint')).flatMap((e) => {
    const position = e.getAttribute('position')?.split(',');
    if (!position || position.length !== 3) return [];
    return {
      x: parseInt(position[0]),
      z: parseInt(position[2]),
    };
  });
}

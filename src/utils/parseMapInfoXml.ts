export interface MapInfo {
  name?: string;
  heightMapSize: {
    width: number;
    height: number;
  };
  gameVersion?: string;
  randomGeneratedWorld?: boolean;
  generation?: { [key: string]: string };
}

export const biomeColors = new Map([
  [0xffffff, 'Snow'],
  [0x004000, 'Pine Forest'],
  [0xffe477, 'Desert'],
  [0xffa800, 'Wasteland'],
  [0xba00ff, 'Burnt Forest'],
]);

export function parseMapInfoXml(xml: string): MapInfo {
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  const { Name, HeightMapSize, GameVersion, RandomGeneratedWorld, ...props } = Array.from(doc.getElementsByTagName('property'))
    .filter((e) => e.hasAttribute('name') && e.hasAttribute('value'))
    .map((e) => ({ [e.getAttribute('name')!]: e.getAttribute('value')! }))
    .reduce((a, b) => Object.assign(a, b));
  const [width, height] = HeightMapSize.split(',').map(Number);
  const mapInfo: MapInfo = { heightMapSize: { width, height }, randomGeneratedWorld: RandomGeneratedWorld === 'true' };
  if (Name) mapInfo.name = Name;
  if (GameVersion) mapInfo.gameVersion = GameVersion;
  if (RandomGeneratedWorld) mapInfo.randomGeneratedWorld = RandomGeneratedWorld === 'true';
  const generation = Object.entries(props).filter(([name]) => name.startsWith('Generation.'));
  if (generation.length) {
    mapInfo.generation = generation.map(([name, value]) => ({ [name.slice(11)]: value })).reduce((a, b) => Object.assign(a, b), {});
  }
  return mapInfo;
}

import { useCallback } from 'react';
import { useAppSelector } from '../store';
import { selectMapId } from '../store/map';
import { MapLargeObjects, db } from '../store/db';
import { waitAnimationFrame } from '../utils';
import { Dtm } from '../utils/Dtm';
import { Png } from '../worker/proxies/Png';
import { imageBitmapToPngBlob, isPngBlob } from '../utils/PngBlob';
import { ImageBitmapLoader } from '../utils/ImageBitmapLoader';
import { parseMapInfoXml } from '../utils/parseMapInfoXml';
import { parsePrefabsXml } from '../utils/parsePrefabsXml';
import { parseSpawnPointsXml } from '../utils/parseSpawnPointsXml';

export function usePutFile(): (file: File) => Promise<MapLargeObjects> {
  const mapId = useAppSelector(selectMapId);

  return useCallback(
    async (file: File) => {
      await waitAnimationFrame();
      if (file.name === 'biomes.png' && isPngBlob(file)) {
        const biomes = await createImageBitmap(file);
        await db.putLargeObject(mapId, 'biomes', file);
        return { biomes };
      } else if (file.name.match(/splat3(_processed)?\.png/) && isPngBlob(file)) {
        const splat3 = await ImageBitmapLoader.fromSplat3(file);
        const blob = await imageBitmapToPngBlob(splat3);
        await db.setMapSize(mapId, splat3.width, splat3.height);
        await db.putLargeObject(mapId, 'splat3', blob);
        return { splat3 };
      } else if (file.name.match(/splat4(_processed)?\.png/) && isPngBlob(file)) {
        const splat4 = await ImageBitmapLoader.fromSplat4(file);
        const blob = await imageBitmapToPngBlob(splat4);
        await db.setMapSize(mapId, splat4.width, splat4.height);
        await db.putLargeObject(mapId, 'splat4', blob);
        return { splat4 };
      } else if (file.name === 'radiation.png' && isPngBlob(file)) {
        const radiation = await ImageBitmapLoader.fromRad(file);
        const blob = await imageBitmapToPngBlob(radiation);
        await db.setMapSize(mapId, radiation.width, radiation.height);
        await db.putLargeObject(mapId, 'radiation', blob);
        return { radiation };
      } else if (file.name === 'map_info.xml') {
        const xml = await file.text();
        const mapInfo = parseMapInfoXml(xml);
        const { width, height } = mapInfo.heightMapSize;
        await db.setMetadata(mapId, { width, height, info: mapInfo });
        return {};
      } else if (file.name === 'spawnpoints.xml') {
        const xml = await file.text();
        const spawnpoints = parseSpawnPointsXml(xml);
        await db.putLargeObject(mapId, 'spawnpoints', spawnpoints);
        return { spawnpoints };
      } else if (file.name === 'prefabs.xml') {
        const xml = await file.text();
        const prefabs = parsePrefabsXml(xml);
        await db.putLargeObject(mapId, 'prefabs', prefabs);
        return { prefabs };
      } else if (file.name === 'dtm.raw') {
        const raw = await file.arrayBuffer();
        const elevations = Dtm.loadFromRaw(raw).data;
        await db.putLargeObject(mapId, 'elevations', elevations);
        return { elevations };
      } else if (file.name === 'dtm.png' && isPngBlob(file)) {
        const png = await Png.loadFrom(file);
        const elevations = Dtm.loadFromPng(png.data).data;
        await db.putLargeObject(mapId, 'elevations', elevations);
        return { elevations };
      }
      return {};
    },
    [mapId]
  );
}

export function usePutFileList(): (files: FileList) => Promise<MapLargeObjects> {
  const putFile = usePutFile();

  return useCallback(
    async (files: FileList) => {
      if (files && files.length > 0) {
        const objects = await Promise.all(takeFiles(files).map((file) => putFile(file)));
        return objects.reduce((merged, o) => ({ ...merged, ...o }), {});
      } else {
        return {};
      }
    },
    [putFile]
  );
}

export function takeFiles(fileList: FileList): File[] {
  const files = new Map(Array.from(fileList).map((file) => [file.name, file]));
  if (files.has('splat3.png') && files.has('splat3_processed.png')) {
    files.delete('splat3.png');
  }
  if (files.has('splat4.png') && files.has('splat4_processed.png')) {
    files.delete('splat4.png');
  }
  if (files.has('dtm.raw') && files.has('dtm.png')) {
    files.delete('dtm.png');
  }
  return Array.from(files.values());
}

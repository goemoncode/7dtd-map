/// <reference lib="deno.ns" />

import { parse } from 'csv-parse/sync';
import { XMLParser } from 'fast-xml-parser';
import { basename, dirname, join, relative, resolve } from 'node:path';
import type { PrefabInfo } from '../store/db/types.ts';
import type { WorldDescriptor } from '../types/gameData.ts';

const GAME_APP_ID = '251570';
const WORLD_FILES = [
  'biomes.png',
  'splat3_processed.png',
  'splat3.png',
  'splat4_processed.png',
  'splat4.png',
  'radiation.png',
  'dtm.png',
  'dtm.raw',
  'map_info.xml',
  'spawnpoints.xml',
  'prefabs.xml',
];
const LOCALIZATION_LANGUAGES = [
  'english',
  'german',
  'spanish',
  'french',
  'italian',
  'japanese',
  'koreana',
  'polish',
  'brazilian',
  'russian',
  'turkish',
  'schinese',
  'tchinese',
] as const;

const XML_PARSER = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseAttributeValue: false,
  parseTagValue: false,
});

export interface GameDataStatus {
  path: string | null;
  ready: boolean;
  error?: string;
}

interface PrefabSource {
  key: string;
  directory: string;
  modName?: string;
}

interface CsvLocalization {
  Key?: string;
  File?: string;
  [language: string]: string | undefined;
}

export class GameDataApi {
  #configPath: string;
  #gamePath: string | null = null;
  #statusError: string | undefined;
  #prefabs: PrefabInfo[] | null = null;
  #prefabsPromise: Promise<PrefabInfo[]> | null = null;
  #prefabAssets = new Map<string, string>();
  #localizations: Map<string, Record<string, string>> | null = null;

  constructor(configPath: string) {
    this.#configPath = configPath;
  }

  async initialize() {
    let configuredPath: string | undefined;
    try {
      const contents = await Deno.readTextFile(this.#configPath);
      const config: unknown = JSON.parse(contents);
      if (isRecord(config) && typeof config.gamePath === 'string') {
        configuredPath = config.gamePath;
      } else {
        console.warn(`Ignoring invalid game-data settings at ${this.#configPath}.`);
      }
    } catch (error) {
      if (!(error instanceof Deno.errors.NotFound)) {
        if (error instanceof SyntaxError) {
          console.warn(`Ignoring malformed game-data settings at ${this.#configPath}.`, error);
        } else {
          throw error;
        }
      }
    }

    if (configuredPath) {
      try {
        this.#gamePath = await validateGamePath(configuredPath);
      } catch (error) {
        this.#statusError = error instanceof Error ? error.message : String(error);
      }
      return;
    }

    this.#gamePath = await findInstalledGame();
  }

  getStatus(): GameDataStatus {
    return { path: this.#gamePath, ready: this.#gamePath !== null, error: this.#statusError };
  }

  async configure(path: string) {
    if (!path.trim() || path.length > 32768) {
      throw new ApiError(400, 'Enter the full path to the 7 Days to Die installation folder.');
    }
    const gamePath = await validateGamePath(path.trim());
    await Deno.mkdir(dirnameOf(this.#configPath), { recursive: true });
    await Deno.writeTextFile(this.#configPath, JSON.stringify({ gamePath }));
    this.#gamePath = gamePath;
    this.#statusError = undefined;
    this.#prefabs = null;
    this.#prefabAssets.clear();
    this.#localizations = null;
    return this.getStatus();
  }

  async handle(request: Request) {
    const url = new URL(request.url);
    const parts = decodePathSegments(url.pathname);
    if (parts[0] !== 'api') return new Response('Not Found', { status: 404 });

    if (parts.length === 2 && parts[1] === 'game-data') {
      if (request.method === 'GET') return jsonResponse(this.getStatus());
      if (request.method === 'POST') {
        const body: unknown = await request.json();
        if (!isRecord(body) || typeof body.path !== 'string') {
          throw new ApiError(400, 'The game installation path is required.');
        }
        return jsonResponse(await this.configure(body.path));
      }
      return methodNotAllowed('GET, POST');
    }

    const isPrefabIndex = parts.length === 2 && parts[1] === 'prefabs';
    if (request.method !== 'GET' && request.method !== 'HEAD' && !(isPrefabIndex && request.method === 'POST')) {
      return methodNotAllowed(isPrefabIndex ? 'GET, HEAD, POST' : 'GET, HEAD');
    }
    if (!this.#gamePath) {
      throw new ApiError(409, this.#statusError ?? 'Set the 7 Days to Die installation folder first.');
    }

    if (isPrefabIndex) {
      if (request.method === 'POST') return jsonResponse(await this.refreshPrefabs());
      return jsonResponse(await this.getPrefabs());
    }
    if (parts.length === 3 && parts[1] === 'localization') {
      return jsonResponse(await this.getLocalization(parts[2]));
    }
    if (parts.length === 2 && parts[1] === 'worlds') {
      return jsonResponse(await this.getWorlds());
    }
    if (parts[1] === 'worlds' && parts.length === 5) {
      return await this.getWorldFile(parts[2], parts[3], parts[4], request.method === 'HEAD');
    }
    if (parts[1] === 'prefab-assets' && parts.length >= 3) {
      return await this.getPrefabAsset(parts.slice(2).join('/'), request.method === 'HEAD');
    }
    return new Response('Not Found', { status: 404 });
  }

  async #getSources(): Promise<PrefabSource[]> {
    const gamePath = this.#requireGamePath();
    const sources: PrefabSource[] = [{ key: 'base', directory: join(gamePath, 'Data', 'Prefabs') }];
    const modsPath = join(gamePath, 'Mods');
    try {
      for await (const entry of Deno.readDir(modsPath)) {
        if (!entry.isDirectory) continue;
        const modPath = join(modsPath, entry.name);
        const prefabPath = join(modPath, 'Prefabs');
        if (await isFile(join(modPath, 'ModInfo.xml')) && await isDirectory(prefabPath)) {
          sources.push({ key: `mods/${entry.name}`, directory: prefabPath, modName: entry.name });
        }
      }
    } catch (error) {
      if (!(error instanceof Deno.errors.NotFound)) throw error;
    }
    return sources;
  }

  async getPrefabs() {
    if (this.#prefabsPromise) return await this.#prefabsPromise;
    if (this.#prefabs) return this.#prefabs;
    this.#prefabsPromise = this.#scanPrefabData();
    try {
      return await this.#prefabsPromise;
    } finally {
      this.#prefabsPromise = null;
    }
  }

  async refreshPrefabs() {
    if (this.#prefabsPromise) return await this.#prefabsPromise;
    this.#prefabsPromise = this.#refreshPrefabData();
    try {
      return await this.#prefabsPromise;
    } finally {
      this.#prefabsPromise = null;
    }
  }

  async #refreshPrefabData() {
    const [prefabData, localizations] = await Promise.all([this.#buildPrefabData(), this.#readLocalizations()]);
    this.#prefabs = prefabData.prefabs;
    this.#prefabAssets = prefabData.assets;
    this.#localizations = localizations;
    return this.#prefabs;
  }

  async #scanPrefabData() {
    const data = await this.#buildPrefabData();
    this.#prefabs = data.prefabs;
    this.#prefabAssets = data.assets;
    return this.#prefabs;
  }

  async #buildPrefabData() {
    const sources = await this.#getSources();
    const parsed = await Promise.all(sources.map((source) => scanPrefabSource(source)));
    const merged = new Map<string, PrefabInfo>();
    for (const result of parsed) {
      for (const prefab of result.prefabs) merged.set(prefab.name, prefab);
    }
    const prefabs = Array.from(merged.values()).sort((a, b) => a.name.localeCompare(b.name));
    if (prefabs.length === 0) {
      throw new Error(`No readable prefab data was found under ${join(this.#requireGamePath(), 'Data', 'Prefabs')}.`);
    }
    return { prefabs, assets: new Map(parsed.flatMap((result) => Array.from(result.assets))) };
  }

  async getLocalization(language: string) {
    if (!LOCALIZATION_LANGUAGES.includes(language as (typeof LOCALIZATION_LANGUAGES)[number])) {
      throw new ApiError(404, `Unsupported localization language: ${language}`);
    }
    const data = await this.#getLocalizations();
    return { lang: language, labels: data.get(language) ?? {} };
  }

  async getWorlds() {
    const worlds: WorldDescriptor[] = [];
    const installedWorldsDirectory = join(this.#requireGamePath(), 'Data', 'Worlds');
    worlds.push(...await scanWorldDirectory(installedWorldsDirectory, 'installed'));
    const appDataPath = Deno.env.get('APPDATA');
    if (appDataPath) {
      const generatedWorldsDirectory = join(appDataPath, '7DaysToDie', 'GeneratedWorlds');
      worlds.push(...await scanWorldDirectory(generatedWorldsDirectory, 'generated'));
    }
    return worlds.sort((a, b) => a.name.localeCompare(b.name) || a.source.localeCompare(b.source));
  }

  async getWorldFile(source: string, worldName: string, fileName: string, head: boolean) {
    if (
      (source !== 'installed' && source !== 'generated') ||
      !WORLD_FILES.includes(fileName) ||
      !(await this.getWorlds()).some((world) => world.source === source && world.name === worldName)
    ) {
      throw new ApiError(404, 'World file not found.');
    }
    let worldDirectory: string;
    if (source === 'installed') {
      worldDirectory = join(this.#requireGamePath(), 'Data', 'Worlds');
    } else {
      const appDataPath = Deno.env.get('APPDATA');
      if (!appDataPath) throw new ApiError(404, 'Generated world files are not available.');
      worldDirectory = join(appDataPath, '7DaysToDie', 'GeneratedWorlds');
    }
    const worldPath = join(worldDirectory, worldName);
    const filePath = join(worldPath, fileName);
    if (!(await isFile(filePath))) throw new ApiError(404, 'World file not found.');
    return fileResponse(filePath, head);
  }

  async getPrefabAsset(assetKey: string, head: boolean) {
    const filePath = this.#prefabAssets.get(assetKey);
    if (!filePath) {
      await this.getPrefabs();
    }
    const resolved = this.#prefabAssets.get(assetKey);
    if (!resolved) throw new ApiError(404, 'Prefab file not found.');
    return fileResponse(resolved, head);
  }

  async #getLocalizations() {
    if (this.#localizations) return this.#localizations;
    this.#localizations = await this.#readLocalizations();
    return this.#localizations;
  }

  async #readLocalizations() {
    const configDirectory = join(this.#requireGamePath(), 'Data', 'Config');
    const files = [join(configDirectory, 'Localization.csv')];
    const modsDirectory = join(this.#requireGamePath(), 'Mods');
    try {
      for await (const entry of Deno.readDir(modsDirectory)) {
        if (!entry.isDirectory) continue;
        const modCsv = join(modsDirectory, entry.name, 'Config', 'Localization.csv');
        if (await isFile(modCsv)) files.push(modCsv);
      }
    } catch (error) {
      if (!(error instanceof Deno.errors.NotFound)) throw error;
    }

    const labelsByLanguage = new Map<string, Record<string, string>>(
      LOCALIZATION_LANGUAGES.map((language) => [language, {}]),
    );
    for (const file of files) {
      const contents = await Deno.readTextFile(file);
      const rows = parse(contents, { columns: true, skip_empty_lines: true, relax_column_count: true }) as CsvLocalization[];
      for (const row of rows) {
        if (!row.Key || (row.File !== 'blocks' && row.File !== 'POI')) continue;
        for (const language of LOCALIZATION_LANGUAGES) {
          const label = row[language];
          if (label) labelsByLanguage.get(language)![row.Key] = label;
        }
      }
    }
    return labelsByLanguage;
  }

  #requireGamePath() {
    if (!this.#gamePath) {
      throw new ApiError(409, this.#statusError ?? 'Set the 7 Days to Die installation folder first.');
    }
    return this.#gamePath;
  }
}

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function errorResponse(error: unknown) {
  if (error instanceof ApiError) {
    return jsonResponse({ error: error.message }, error.status);
  }
  console.error('The local game data request failed.', error);
  const message = error instanceof Error ? error.message : String(error);
  return jsonResponse({ error: message }, 500);
}

async function scanWorldDirectory(directory: string, source: WorldDescriptor['source']): Promise<WorldDescriptor[]> {
  const worlds: WorldDescriptor[] = [];
  try {
    for await (const entry of Deno.readDir(directory)) {
      if (!entry.isDirectory) continue;
      const worldPath = join(directory, entry.name);
      for (const file of WORLD_FILES) {
        if (await isFile(join(worldPath, file))) {
          worlds.push({ name: entry.name, source });
          break;
        }
      }
    }
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) throw error;
  }
  return worlds;
}

async function scanPrefabSource(source: PrefabSource) {
  const xmlFiles = await findFiles(source.directory, '.xml');
  const assets = new Map<string, string>();
  const prefabs: PrefabInfo[] = [];
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(8, xmlFiles.length) }, async () => {
    while (nextIndex < xmlFiles.length) {
      const xmlFile = xmlFiles[nextIndex++];
      const relativePath = relative(source.directory, xmlFile).replaceAll('\\', '/');
      const name = basename(xmlFile, '.xml');
      if (name.endsWith('_signs')) continue;
      const ttsPath = xmlFile.slice(0, -4) + '.tts';
      const nimPath = xmlFile.slice(0, -4) + '.blocks.nim';
      if (!(await isFile(ttsPath))) continue;

      const [properties, blockCounts] = await Promise.all([
        readPrefabProperties(xmlFile),
        readBlocksUsed(ttsPath, nimPath),
      ]);
      const [width, height, depth] = (properties.get('PrefabSize') ?? '').split(',').map(Number);
      const key = `${source.key}/${relativePath.slice(0, -4)}`;
      assets.set(`${key}.xml`, xmlFile);
      const imagePath = xmlFile.slice(0, -4) + '.jpg';
      if (await isFile(imagePath)) assets.set(`${key}.jpg`, imagePath);
      prefabs.push({
        name,
        modName: source.modName,
        group: relativePath.includes('/') ? relativePath.slice(0, relativePath.lastIndexOf('/')) : '',
        url: `/api/prefab-assets/${key.split('/').map(encodeURIComponent).join('/')}`,
        difficulty: Number(properties.get('DifficultyTier') ?? 0),
        width,
        height,
        depth,
        rotationToFaceNorth: Number(properties.get('RotationToFaceNorth') ?? 0),
        tags: properties.get('Tags') ?? '',
        blocks: blockCounts,
      });
    }
  });
  await Promise.all(workers);
  return { prefabs, assets };
}

async function findFiles(directory: string, extension: string): Promise<string[]> {
  const files: string[] = [];
  for await (const entry of Deno.readDir(directory)) {
    const path = join(directory, entry.name);
    if (entry.isDirectory) {
      files.push(...await findFiles(path, extension));
    } else if (entry.isFile && entry.name.toLowerCase().endsWith(extension)) {
      files.push(path);
    }
  }
  return files;
}

async function readPrefabProperties(xmlPath: string) {
  const parsed: unknown = XML_PARSER.parse(await Deno.readTextFile(xmlPath));
  if (!isRecord(parsed) || !isRecord(parsed.prefab)) {
    throw new Error(`Invalid prefab XML: ${xmlPath}`);
  }
  const rawProperties = parsed.prefab.property;
  const entries = Array.isArray(rawProperties) ? rawProperties : rawProperties ? [rawProperties] : [];
  const properties = new Map<string, string>();
  for (const entry of entries) {
    if (!isRecord(entry) || typeof entry['@_name'] !== 'string' || typeof entry['@_value'] !== 'string') continue;
    properties.set(entry['@_name'], entry['@_value']);
  }
  return properties;
}

async function readBlocksUsed(ttsPath: string, nimPath: string) {
  const [tts, nim] = await Promise.all([
    Deno.readFile(ttsPath),
    isFile(nimPath).then((exists) => exists ? Deno.readFile(nimPath) : null),
  ]);
  if (!nim) return {};
  const blockNames = readBlockNames(nim);
  const counts = readTtsBlockCounts(ttsPath, tts);
  const result: Record<string, number> = {};
  for (const [id, count] of counts) {
    const name = blockNames.get(id);
    if (id <= 2 || !name) continue;
    const colon = name.indexOf(':');
    const key = colon >= 1 ? `${name.slice(0, colon)}:VariantHelper` : name;
    result[key] = (result[key] ?? 0) + count;
  }
  return result;
}

function readBlockNames(data: Uint8Array) {
  if (data.byteLength < 8) throw new Error('The prefab block-name file is incomplete.');
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const version = view.getUint32(0, true);
  const count = view.getUint32(4, true);
  if (version !== 1 || count > (data.byteLength - 8) / 5) {
    throw new Error(`Unsupported prefab block-name file version: ${version}`);
  }
  const decoder = new TextDecoder();
  const names = new Map<number, string>();
  let offset = 8;
  for (let index = 0; index < count; index++) {
    if (offset + 5 > data.byteLength) throw new Error('The prefab block-name file is truncated.');
    const id = view.getUint32(offset, true);
    const length = data[offset + 4];
    offset += 5;
    if (offset + length > data.byteLength) throw new Error('The prefab block-name file is truncated.');
    names.set(id, decoder.decode(data.subarray(offset, offset + length)));
    offset += length;
  }
  return names;
}

function readTtsBlockCounts(path: string, data: Uint8Array) {
  if (data.byteLength < 14 || new TextDecoder().decode(data.subarray(0, 4)) !== 'tts\0') {
    throw new Error(`Invalid prefab TTS file: ${path}`);
  }
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const version = view.getUint32(4, true);
  const dimensions = [view.getUint16(8, true), view.getUint16(10, true), view.getUint16(12, true)];
  const blockCount = dimensions.reduce((product, dimension) => product * dimension, 1);
  if (![13, 15, 16, 17, 18, 19].includes(version) || 14 + blockCount * 4 > data.byteLength) {
    throw new Error(`Unsupported or truncated prefab TTS file: ${path}`);
  }
  const counts = new Map<number, number>();
  for (let offset = 14; offset < 14 + blockCount * 4; offset += 4) {
    const id = view.getInt32(offset, true) & 0x7fff;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}

async function findInstalledGame(): Promise<string | null> {
  const steamRoots = new Set<string>();
  const programFilesX86 = Deno.env.get('ProgramFiles(x86)');
  const programFiles = Deno.env.get('ProgramFiles');
  if (programFilesX86) steamRoots.add(join(programFilesX86, 'Steam'));
  if (programFiles) steamRoots.add(join(programFiles, 'Steam'));

  if (Deno.build.os === 'windows') {
    try {
      const output = await new Deno.Command('reg.exe', {
        args: ['query', 'HKCU\\Software\\Valve\\Steam', '/v', 'SteamPath'],
        stdout: 'piped',
        stderr: 'null',
      }).output();
      if (output.success) {
        const steamPath = new TextDecoder().decode(output.stdout).match(/SteamPath\s+REG_SZ\s+([^\r\n]+)/i)?.[1]?.trim();
        if (steamPath) steamRoots.add(steamPath.replaceAll('/', '\\'));
      }
    } catch (error) {
      if (!(error instanceof Deno.errors.NotFound)) throw error;
    }
  }

  const libraries = new Set(steamRoots);
  for (const steamRoot of steamRoots) {
    try {
      const vdf = await Deno.readTextFile(join(steamRoot, 'steamapps', 'libraryfolders.vdf'));
      for (const match of vdf.matchAll(/"path"\s+"((?:[^"\\]|\\.)+)"/g)) {
        const libraryPath = match[1].replaceAll('\\\\', '\\');
        libraries.add(libraryPath);
      }
    } catch (error) {
      if (!(error instanceof Deno.errors.NotFound)) throw error;
    }
  }

  for (const library of libraries) {
    const manifestPath = join(library, 'steamapps', `appmanifest_${GAME_APP_ID}.acf`);
    if (!(await isFile(manifestPath))) continue;
    const gamePath = join(library, 'steamapps', 'common', '7 Days To Die');
    try {
      return await validateGamePath(gamePath);
    } catch (error) {
      console.warn('Steam lists 7 Days to Die, but its game data could not be validated.', error);
    }
  }
  return null;
}

async function validateGamePath(path: string) {
  const resolvedPath = resolve(path);
  if (!(await isDirectory(join(resolvedPath, 'Data', 'Prefabs')))) {
    throw new ApiError(400, 'The selected folder does not contain Data\\Prefabs.');
  }
  if (!(await isFile(join(resolvedPath, 'Data', 'Config', 'Localization.csv')))) {
    throw new ApiError(400, 'The selected folder does not contain Data\\Config\\Localization.csv.');
  }
  if (!(await isDirectory(join(resolvedPath, 'Data', 'Worlds')))) {
    throw new ApiError(400, 'The selected folder does not contain Data\\Worlds.');
  }
  return await Deno.realPath(resolvedPath);
}

async function isFile(path: string) {
  try {
    return (await Deno.stat(path)).isFile;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) return false;
    throw error;
  }
}

async function isDirectory(path: string) {
  try {
    return (await Deno.stat(path)).isDirectory;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) return false;
    throw error;
  }
}

async function fileResponse(path: string, head: boolean) {
  const data = head ? null : await Deno.readFile(path);
  const extension = path.split('.').pop()?.toLowerCase();
  const contentType = extension === 'xml'
    ? 'application/xml; charset=utf-8'
    : extension === 'jpg'
    ? 'image/jpeg'
    : extension === 'png'
    ? 'image/png'
    : 'application/octet-stream';
  return new Response(data, { headers: { 'Content-Type': contentType } });
}

function decodePathSegments(pathname: string) {
  try {
    return pathname.split('/').filter(Boolean).map(decodeURIComponent);
  } catch (error) {
    if (error instanceof URIError) throw new ApiError(400, 'The request path is invalid.');
    throw error;
  }
}

function jsonResponse(data: unknown, status = 200) {
  return Response.json(data, { status });
}

function methodNotAllowed(allow: string) {
  return new Response(null, { status: 405, headers: { Allow: allow } });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function dirnameOf(path: string) {
  return dirname(path);
}

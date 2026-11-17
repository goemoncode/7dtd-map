import { Dropdown, Form, InputGroup } from 'react-bootstrap';
import clsx from 'clsx';
import { useAppSelector } from '../store/index.ts';
import { selectMapId } from '../store/map.ts';
import { db } from '../store/db/index.ts';
import { useLoading } from '../hooks/useLoading.ts';
import { usePutFileList } from '../hooks/usePutFile.ts';
import { mapRenderer, mapStatsUpdater, prefabsFilter } from '../worker/proxies/index.ts';
import { useQuery } from '@tanstack/react-query';
import { requestGameData, useGameData } from '../hooks/useGameData.ts';
import type { WorldDescriptor } from '../types/gameData.ts';

const PRESET_MAP_FILES = [
  ['biomes.png'],
  ['splat3_processed.png', 'splat3.png'],
  ['splat4_processed.png', 'splat4.png'],
  ['radiation.png'],
  ['dtm.png', 'dtm.raw'],
  ['map_info.xml'],
  ['spawnpoints.xml'],
  ['prefabs.xml'],
];

interface Props {
  disabled?: boolean;
}

export function MapLoadControl({ disabled }: Props) {
  const mapId = useAppSelector(selectMapId);
  const loading = useLoading();
  const putFileList = usePutFileList();
  const { data: gameData } = useGameData();
  const { data: worlds = [] } = useQuery({
    queryKey: ['worlds', gameData?.path],
    queryFn: async () => await requestGameData<WorldDescriptor[]>('/api/worlds'),
    enabled: gameData?.ready ?? false,
  });
  const installedWorlds = worlds.filter((world) => world.source === 'installed');
  const generatedWorlds = worlds.filter((world) => world.source === 'generated');

  return (
    <InputGroup>
      <Form.Label className={clsx('btn btn-outline-secondary flex-fill mb-0', { disabled })}>
        Select files...
        <Form.Control type='file' multiple onInput={handleInput} disabled={disabled} hidden />
      </Form.Label>
      <Dropdown>
        <Dropdown.Toggle variant='outline-secondary' title='' disabled={disabled || worlds.length === 0} />
        <Dropdown.Menu
          popperConfig={{
            strategy: 'fixed',
            modifiers: [
              { name: 'flip', options: { boundary: 'viewport', rootBoundary: 'viewport' } },
              { name: 'preventOverflow', options: { boundary: 'viewport', rootBoundary: 'viewport' } },
              {
                name: 'availableHeight',
                enabled: true,
                phase: 'beforeWrite',
                fn: ({ state }) => {
                  const reference = state.rects.reference;
                  const availableHeight = state.placement.startsWith('top')
                    ? reference.y
                    : window.innerHeight - reference.y - reference.height;
                  state.styles.popper.maxHeight = `${Math.max(0, availableHeight - 8)}px`;
                  state.styles.popper.overflowY = 'auto';
                },
              },
            ],
          }}
        >
          {installedWorlds.length > 0 && <Dropdown.Header>Installed Worlds</Dropdown.Header>}
          {installedWorlds.map((world) => (
            <Dropdown.Item
              key={`installed:${world.name}`}
              onClick={() => loadPresetMap(world)}
              disabled={disabled}
            >
              {world.name}
            </Dropdown.Item>
          ))}
          {generatedWorlds.length > 0 && <Dropdown.Header>Generated Worlds</Dropdown.Header>}
          {generatedWorlds.map((world) => (
            <Dropdown.Item
              key={`generated:${world.name}`}
              onClick={() => loadPresetMap(world)}
              disabled={disabled}
            >
              {world.name}
            </Dropdown.Item>
          ))}
        </Dropdown.Menu>
      </Dropdown>
    </InputGroup>
  );

  async function handleInput(event: React.ChangeEvent<HTMLInputElement>) {
    const { files } = event.target;
    if (files && files.length > 0) {
      loading(async () => {
        const { elevations, prefabs, ...args } = await putFileList(files);
        mapRenderer.updateTexture(args);
        if (args.biomes) {
          mapStatsUpdater.update(mapId);
        }
        if (elevations) {
          mapRenderer.sendEvent({ eventName: 'updateTerrain', mapElevations: elevations });
        }
        if (prefabs) {
          prefabsFilter.update({ prefabs });
        }
      });
    }
  }

  async function loadPresetMap(world: WorldDescriptor) {
    try {
      await loading(async () => {
        await db.setMapName(mapId, world.name);
        const files = await fetchPresetMapFiles(world);
        const { elevations = null, prefabs = [], ...args } = await putFileList(files);
        mapStatsUpdater.update(mapId);
        mapRenderer.updateTexture({ ...args, prefabs: [] });
        mapRenderer.sendEvent({ eventName: 'updateTerrain', mapElevations: elevations });
        prefabsFilter.update({ prefabs });
      });
    } catch (error) {
      alert(`Could not load ${world.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

async function fetchPresetMapFiles(world: WorldDescriptor): Promise<FileList> {
  const dt = new DataTransfer();
  for (const candidates of PRESET_MAP_FILES) {
    for (const fileName of candidates) {
      const url = `/api/worlds/${world.source}/${encodeURIComponent(world.name)}/${encodeURIComponent(fileName)}`;
      const file = await fetchAsFile(url);
      if (file) {
        dt.items.add(file);
        break;
      }
    }
  }
  if (dt.files.length === 0) throw new Error('No map files were found in this installed world.');
  return dt.files;
}

async function fetchAsFile(uri: string) {
  const res = await fetch(uri);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const blob = await res.blob();
  return new File([blob], basename(uri), { type: blob.type });
}

function basename(path: string) {
  return path.slice(path.lastIndexOf('/') + 1);
}

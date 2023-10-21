import { Dropdown, DropdownButton, Form, InputGroup } from 'react-bootstrap';
import clsx from 'clsx';
import { useAppSelector } from '../store';
import { selectMapId } from '../store/map';
import { db } from '../store/db';
import { useLoading } from '../hooks/useLoading';
import { usePutFileList } from '../hooks/usePutFile';
import { mapRenderer, mapStatsUpdater, prefabsFilter } from '../worker/proxies';

const PRESET_MAPS = ['Navezgane']; //, 'PREGEN6k', 'PREGEN8k', 'PREGEN10k'];
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

  return (
    <InputGroup>
      <Form.Label className={clsx('btn btn-outline-secondary flex-fill mb-0', { disabled })}>
        Select files...
        <Form.Control type="file" multiple onInput={handleInput} disabled={disabled} hidden />
      </Form.Label>
      <DropdownButton variant="outline-secondary" title="" disabled={disabled}>
        <Dropdown.Header>Presets</Dropdown.Header>
        {PRESET_MAPS.map((worldName) => (
          <Dropdown.Item key={worldName} onClick={() => loadPresetMap(worldName)} disabled={disabled}>
            {worldName}
          </Dropdown.Item>
        ))}
      </DropdownButton>
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

  async function loadPresetMap(worldName: string) {
    loading(async () => {
      await db.setMapName(mapId, worldName);
      const files = await fetchPresetMapFiles(worldName);
      const { elevations = null, prefabs = [], ...args } = await putFileList(files);
      mapStatsUpdater.update(mapId);
      mapRenderer.updateTexture({ ...args, prefabs: [] });
      mapRenderer.sendEvent({ eventName: 'updateTerrain', mapElevations: elevations });
      prefabsFilter.update({ prefabs });
    });
  }
}

async function fetchPresetMapFiles(worldName: string): Promise<FileList> {
  const dt = new DataTransfer();
  for (const candidates of PRESET_MAP_FILES) {
    for (const fileName of candidates) {
      const { VITE_WORLDS_URL } = import.meta.env;
      const url = `${VITE_WORLDS_URL}${worldName}/${fileName}`;
      const file = await fetchAsFile(url);
      if (file) {
        dt.items.add(file);
        break;
      }
    }
  }
  return dt.files;
}

async function fetchAsFile(uri: string) {
  try {
    console.time(`fetchAsFile: ${uri}`);
    const res = await fetch(uri);
    if (res.ok) {
      const blob = await res.blob();
      return new File([blob], basename(uri), { type: blob.type });
    } else {
      return null;
    }
  } catch (err) {
    console.error(err);
    return null;
  } finally {
    console.timeEnd(`fetchAsFile: ${uri}`);
  }
}

function basename(path: string) {
  return path.slice(path.lastIndexOf('/') + 1);
}

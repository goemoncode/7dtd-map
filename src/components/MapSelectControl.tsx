import { useEffect } from 'react';
import { Button, Form, InputGroup } from 'react-bootstrap';
import { BsPlusLg, BsTrash3 } from 'react-icons/bs';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAppDispatch, useAppSelector } from '../store';
import { selectMapId, setMapId } from '../store/map';
import { db } from '../store/db';

interface Props {
  disabled?: boolean;
}

export function MapSelectControl({ disabled }: Props) {
  const dispatch = useAppDispatch();
  const mapId = useAppSelector(selectMapId);
  const allMaps = useLiveQuery(() => db.Maps.toArray());
  const currentMap = useLiveQuery(() => db.Maps.get(mapId), [mapId]);

  useEffect(() => {
    if (allMaps) {
      if (allMaps.length > 0) {
        if (!currentMap) {
          dispatch(setMapId(allMaps[0].id));
        }
      } else {
        db.createNewMap();
      }
    }
  }, [allMaps, currentMap, dispatch]);

  return (
    <>
      <InputGroup className="w-100">
        <Form.Select value={mapId} onChange={handleChange} disabled={disabled}>
          {allMaps &&
            allMaps.map(({ id, name }) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
        </Form.Select>
        <Button variant="outline-secondary" title="Create new map" onClick={handleCreate} disabled={disabled}>
          <BsPlusLg />
        </Button>
        <Button variant="outline-secondary" title="Delete current map" onClick={handleDelete} disabled={disabled}>
          <BsTrash3 />
        </Button>
      </InputGroup>
      <Form.Control title="Map Name" type="text" value={currentMap?.name ?? ''} onInput={handleRename} disabled={disabled} />
    </>
  );

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    dispatch(setMapId(parseInt(event.currentTarget.value)));
  }

  async function handleCreate() {
    const newMap = await db.createNewMap();
    dispatch(setMapId(newMap.id));
  }

  async function handleDelete() {
    await db.deleteMap(mapId);
  }

  async function handleRename(event: React.FormEvent<HTMLInputElement>) {
    await db.setMapName(mapId, event.currentTarget.value);
  }
}

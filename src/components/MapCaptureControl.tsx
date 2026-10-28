import { Button } from 'react-bootstrap';
import { BsFillCameraFill } from 'react-icons/bs';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAppSelector } from '../store/index.ts';
import { selectMapId } from '../store/map.ts';
import { db } from '../store/db/index.ts';
import { useMapView } from '../hooks/useMapView.ts';

interface Props {
  disabled?: boolean;
}

export function MapCaptureControl({ disabled }: Props) {
  const mapId = useAppSelector(selectMapId);
  const mapView = useMapView();
  const currentMap = useLiveQuery(() => db.Maps.get(mapId), [mapId]);

  return (
    <Button className="w-100" disabled={disabled} onClick={handleClick}>
      <BsFillCameraFill className="me-3" />
      Capture as PNG
    </Button>
  );

  function handleClick() {
    if (currentMap && mapView && mapView.canvas) {
      const anchor = document.createElement('a');
      anchor.download = currentMap.name || '7dtd-map';
      anchor.href = mapView.canvas.toDataURL('image/png');
      anchor.click();
    }
  }
}

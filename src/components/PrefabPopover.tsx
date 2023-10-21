import { Badge, CloseButton, Popover, PopoverProps, Stack } from 'react-bootstrap';
import { BsGeoAltFill } from 'react-icons/bs';
import { MatchedPrefab } from '../worker/lib/PrefabsFilter';
import { FailSafeImage } from './shared/FailSafeImage';
import { DifficultyBanner } from './shared/DifficultyBanner';
import { Distance } from './shared/Distance';

interface Props extends Omit<PopoverProps, 'onClick'> {
  prefab: MatchedPrefab;
  onClick?: (prefab: MatchedPrefab) => void;
  onClose?: () => void;
}

export function PrefabPopover({ prefab, onClick, onClose }: Props) {
  return (
    <Popover placement="bottom">
      <Popover.Header as={Stack} direction="horizontal" className="py-1">
        <Stack className="overflow-hidden">
          <small className="fw-light text-body-secondary text-truncate">{prefab.name}</small>
          <span className="fw-bold text-truncate">{prefab.label || '-'}</span>
        </Stack>
        <CloseButton className="flex-shrink-0" onClick={onClose} />
      </Popover.Header>
      <Popover.Body className="d-overlap">
        <a
          href={`/prefab/#` + prefab.name}
          target="_blank"
          onClick={(event) => {
            event.preventDefault();
            onClick?.(prefab);
          }}
        >
          <FailSafeImage className="prefab-image" src={prefab.url + '.jpg'} />
        </a>
        <Stack direction="horizontal" className="p-2 pe-none align-items-start">
          <DifficultyBanner difficulty={prefab.difficulty} className="me-auto" />
          <Badge pill bg="secondary" className="fs-xs">
            <BsGeoAltFill className="me-2" />
            {Math.floor(prefab.x)}, {Math.floor(prefab.z)}
          </Badge>
        </Stack>
        {prefab.dist && (
          <Stack className="px-3 pe-none align-items-end justify-content-end">
            <Distance className="fw-bold px-3 bg-dark rounded-top" value={prefab.dist} />
          </Stack>
        )}
      </Popover.Body>
    </Popover>
  );
}

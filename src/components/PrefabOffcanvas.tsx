import { useRef, Suspense } from 'react';
import { Nav, Offcanvas, Stack, Tab, Table } from 'react-bootstrap';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAppDispatch, useAppSelector } from '../store';
import { prefabOffcanvasTabs, selectActiveTab, setActiveTab } from '../store/prefabs';
import { PrefabInfo, db } from '../store/db';
import { LabelMapper, useLabelMapper, usePrefabXml } from '../hooks/usePrefabs';
import { UseModalProps } from '../hooks/useModal';
import { MatchedPrefab } from '../worker/lib/PrefabsFilter';
import { FailSafeImage } from './shared/FailSafeImage';
import { DifficultyBanner } from './shared/DifficultyBanner';
import { LoadingSpinner } from './shared/LoadingSpinner';

interface Props extends UseModalProps {
  prefab?: MatchedPrefab;
}

export function PrefabOffcanvas({ prefab, ...props }: Props) {
  const dispatch = useAppDispatch();
  const activeTab = useAppSelector(selectActiveTab);
  const prefabInfo = useLiveQuery(() => db.Prefabs.get(prefab?.name ?? ''), [prefab]);
  const label = useLabelMapper();
  const tabContentRef = useRef<HTMLDivElement>(null);

  return (
    <Offcanvas placement="end" {...props}>
      <Offcanvas.Header closeButton className="mx-3 border-bottom">
        {prefab && (
          <Stack className="overflow-hidden">
            <div className="fw-light text-body-secondary text-truncate">{prefab.name}</div>
            <Offcanvas.Title className="lh-sm">{label(prefab.name) || '-'}</Offcanvas.Title>
          </Stack>
        )}
      </Offcanvas.Header>
      <Offcanvas.Body>
        {prefabInfo && (
          <Stack className="h-100">
            <div className="prefab-image d-overlap flex-shrink-0 mx-auto mb-3">
              <LoadingSpinner variant="light" className="z-n1 bg-secondary" />
              <FailSafeImage src={prefabInfo.url + '.jpg'} draggable="false" />
              <DifficultyBanner difficulty={prefabInfo.difficulty} className="p-2" />
            </div>
            <Tab.Container defaultActiveKey={activeTab} onSelect={handleSelect}>
              <Nav variant="tabs" fill>
                <Nav.Item>
                  <Nav.Link eventKey={prefabOffcanvasTabs[0]}>Properties</Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey={prefabOffcanvasTabs[1]}>Blocks Used</Nav.Link>
                </Nav.Item>
              </Nav>
              <Tab.Content className="overflow-auto thin-scrollbar outline-none h-100" tabIndex={0} ref={tabContentRef}>
                <Tab.Pane eventKey={prefabOffcanvasTabs[0]} className="position-relative h-100">
                  <Suspense fallback={<LoadingSpinner variant="secondary" />}>
                    <PrefabPropertiesTable prefab={prefabInfo} />
                  </Suspense>
                </Tab.Pane>
                <Tab.Pane eventKey={prefabOffcanvasTabs[1]}>
                  <PrefabBlocksUsedTable prefab={prefabInfo} label={label} />
                </Tab.Pane>
              </Tab.Content>
            </Tab.Container>
          </Stack>
        )}
      </Offcanvas.Body>
    </Offcanvas>
  );

  function handleSelect(eventKey: string | null) {
    dispatch(setActiveTab(eventKey));
    tabContentRef.current?.scrollTo({ top: 0 });
  }
}

interface PrefabPropertiesTableProps {
  prefab: PrefabInfo;
}

function PrefabPropertiesTable({ prefab }: PrefabPropertiesTableProps) {
  const properties = usePrefabXml(prefab);
  return (
    properties && (
      <Table size="sm" striped bordered className="lh-sm fs-sm mb-0">
        <thead>
          <tr>
            <th className="col-6">Name</th>
            <th className="col-6">Value</th>
          </tr>
        </thead>
        <tbody>
          {Array.from(properties).map(([key, value]) => (
            <tr key={key}>
              <td>
                <span className="text-break">{key}</span>
              </td>
              <td>
                <span className="text-break">{value}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    )
  );
}

interface PrefabBlocksUsedTableProps {
  prefab: PrefabInfo;
  label: LabelMapper;
}

function PrefabBlocksUsedTable({ prefab, label }: PrefabBlocksUsedTableProps) {
  return (
    <Table size="sm" striped bordered className="lh-sm fs-sm mb-0">
      <thead>
        <tr>
          <th className="col-5">Name</th>
          <th className="col-5">Label</th>
          <th className="col-2">Count</th>
        </tr>
      </thead>
      <tbody>
        {prefab.blocks &&
          Object.entries(prefab.blocks)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([name, count]) => (
              <tr key={name}>
                <td>
                  <span className="text-break">{name}</span>
                </td>
                <td>
                  <span className="text-break">{label(name) || <span className="text-muted">(none)</span>}</span>
                </td>
                <td className="text-end">
                  <span className="text-break">{count}</span>
                </td>
              </tr>
            ))}
      </tbody>
    </Table>
  );
}

import { Suspense } from 'react';
import { Offcanvas, Stack, Tab, Table, Tabs } from 'react-bootstrap';
import { useAppDispatch, useAppSelector } from '../store';
import { prefabOffcanvasTabs, selectActiveTab, setActiveTab } from '../store/prefabs';
import { usePrefabInfo, useLabelMapper, usePrefabXml } from '../hooks/usePrefabs';
import { UseModalProps } from '../hooks/useModal';
import { MatchedPrefab } from '../worker/lib/PrefabsFilter';
import { FailSafeImage } from './shared/FailSafeImage';
import { DifficultyBanner } from './shared/DifficultyBanner';
import { LoadingSpinner } from './shared/LoadingSpinner';

interface Props extends UseModalProps {
  prefab?: MatchedPrefab;
}

export function PrefabOffcanvas({ prefab, ...props }: Props) {
  const label = useLabelMapper();

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
      <Offcanvas.Body className="thin-scrollbar position-relative">
        <Suspense fallback={<LoadingSpinner />}>
          <PrefabInfoPanel prefab={prefab} />
        </Suspense>
      </Offcanvas.Body>
    </Offcanvas>
  );
}

interface PrefabInfoPanelProps {
  prefab?: MatchedPrefab;
}

function PrefabInfoPanel({ prefab }: PrefabInfoPanelProps) {
  const dispatch = useAppDispatch();
  const activeTab = useAppSelector(selectActiveTab);

  const prefabInfo = usePrefabInfo(prefab?.name);
  const properties = usePrefabXml(prefabInfo);
  const label = useLabelMapper();

  return (
    prefabInfo && (
      <Stack>
        <div className="mx-auto mb-3 d-overlap">
          <FailSafeImage src={prefabInfo.url + '.jpg'} />
          <DifficultyBanner difficulty={prefabInfo.difficulty} className="p-2" />
        </div>
        <Tabs defaultActiveKey={activeTab} fill onSelect={(eventKey) => dispatch(setActiveTab(eventKey))}>
          <Tab eventKey={prefabOffcanvasTabs[0]} title="Properties">
            {properties && (
              <Table size="sm" striped bordered className="lh-sm fs-sm">
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
            )}
          </Tab>
          <Tab eventKey={prefabOffcanvasTabs[1]} title="Blocks Used">
            <Table size="sm" striped bordered className="lh-sm fs-sm">
              <thead>
                <tr>
                  <th className="col-5">Name</th>
                  <th className="col-5">Label</th>
                  <th className="col-2">Count</th>
                </tr>
              </thead>
              <tbody>
                {prefabInfo.blocks &&
                  Object.entries(prefabInfo.blocks)
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
          </Tab>
        </Tabs>
      </Stack>
    )
  );
}

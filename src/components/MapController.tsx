import { Accordion, Button, Spinner } from 'react-bootstrap';
import { BsFillDatabaseFill, BsFillFlagFill, BsFillGearFill } from 'react-icons/bs';
import { useAppDispatch, useAppSelector } from '../store';
import { sidebarMenuTabs, selectActiveTab, setActiveTab } from '../store/session';
import { selectIsLoading, selectTerrainViewStatus, setIsTerrainViewOpen } from '../store/map';
import { useMapSize } from '../hooks/useMaps';
import { ShrinkyAccordionHeader } from './shared/ShrinkyAccordionHeader';
import { FormGroupRow } from './shared/FormGroupRow';
import { MapSelectControl } from './MapSelectControl';
import { MapLoadControl } from './MapLoadControl';
import { MapCaptureControl } from './MapCaptureControl';
import { MapPreferenceControl } from './MapPreferenceControl';
import { PrefabsFilterControl } from './PrefabsFilterControl';
import { PrefabsList } from './PrefabsList';
import TerrainSvg from '../assets/terrain.svg?react';

export function MapController() {
  const dispatch = useAppDispatch();
  const activeTab = useAppSelector(selectActiveTab);
  const isLoading = useAppSelector(selectIsLoading);
  const terrainViewStatus = useAppSelector(selectTerrainViewStatus);
  const [, mapSize] = useMapSize();

  return (
    <Accordion defaultActiveKey={activeTab} className="w-100 border" flush onSelect={(eventKey) => dispatch(setActiveTab(eventKey))}>
      <Accordion.Item eventKey={sidebarMenuTabs[0]}>
        <ShrinkyAccordionHeader icon={<BsFillDatabaseFill />}>Map Selection</ShrinkyAccordionHeader>
        <Accordion.Body>
          <FormGroupRow label="Select Map">
            <MapSelectControl disabled={isLoading} />
          </FormGroupRow>
          <FormGroupRow label="Load Map">
            <MapLoadControl disabled={isLoading} />
          </FormGroupRow>
          <FormGroupRow label="Download">
            <MapCaptureControl disabled={isLoading || !mapSize} />
          </FormGroupRow>
          <FormGroupRow label="Terrain View">
            <Button
              className="w-100"
              disabled={isLoading || !mapSize || !(terrainViewStatus === 'ready')}
              onClick={() => dispatch(setIsTerrainViewOpen(true))}
              data-terrain-view-status={terrainViewStatus}
            >
              {terrainViewStatus === 'busy' && <Spinner as="span" animation="border" size="sm" role="status" className="me-3" />}
              {terrainViewStatus !== 'busy' && <TerrainSvg className="me-3" />}
              Open Terrain View
            </Button>
          </FormGroupRow>
        </Accordion.Body>
      </Accordion.Item>
      <Accordion.Item eventKey={sidebarMenuTabs[1]}>
        <ShrinkyAccordionHeader icon={<BsFillGearFill />}>Map Preference</ShrinkyAccordionHeader>
        <Accordion.Body>
          <MapPreferenceControl disabled={isLoading} />
        </Accordion.Body>
      </Accordion.Item>
      <Accordion.Item eventKey={sidebarMenuTabs[2]}>
        <ShrinkyAccordionHeader icon={<BsFillFlagFill />}>Prefabs</ShrinkyAccordionHeader>
        <Accordion.Body>
          <PrefabsFilterControl disabled={isLoading} />
          <PrefabsList />
        </Accordion.Body>
      </Accordion.Item>
    </Accordion>
  );
}

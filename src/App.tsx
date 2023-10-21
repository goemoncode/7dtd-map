import { useState, useEffect, Suspense } from 'react';
import { shallowEqual } from 'react-redux';
import { useDebounce } from 'react-use';
import { ErrorBoundary } from 'react-error-boundary';
import { Button, Container, Navbar, Offcanvas } from 'react-bootstrap';
import { useAppSelector } from './store';
import { selectLanguage, selectTheme } from './store/local';
import { selectMapPreference } from './store/map';
import {
  selectBlocksUsedFilter,
  selectDifficultyFilter,
  selectPrefabTagsFilter,
  selectMarkerCoords,
  selectPrefabNameFilter,
} from './store/prefabs';
import { mapRenderer, prefabsFilter } from './worker/proxies';
import { useLocalization, usePrefabs } from './hooks/usePrefabs';
import { MapViewHandle, MapViewHandleProvider } from './hooks/useMapView';
import { FALLBACK_LANGUAGE } from './utils/language';
import NavbarIcon from './assets/navbar.svg?react';
import MapView from './components/MapView';
import { AppNav } from './components/AppNav';
import { ErrorPage } from './components/ErrorPage';
import { HowToUseModal } from './components/HowToUseModal';
import { MapController } from './components/MapController';
import { DragDropOverlay } from './components/DragDropOverlay';
import { LoadingSpinner } from './components/shared/LoadingSpinner';

function App() {
  const [navMenuShow, setNavMenuShow] = useState(false);
  const [mapViewHandle, setMapViewHandle] = useState<MapViewHandle | null>(null);

  const theme = useAppSelector(selectTheme);
  const language = useAppSelector(selectLanguage);
  const mapPreference = useAppSelector(selectMapPreference, shallowEqual);
  const markerCoords = useAppSelector(selectMarkerCoords, shallowEqual);
  const difficultyFilter = useAppSelector(selectDifficultyFilter, shallowEqual);
  const prefabNameFilter = useAppSelector(selectPrefabNameFilter);
  const prefabTagsFilter = useAppSelector(selectPrefabTagsFilter);
  const blocksUsedFilter = useAppSelector(selectBlocksUsedFilter);

  usePrefabs();

  const current = useLocalization(language);
  const fallback = useLocalization(FALLBACK_LANGUAGE);
  useEffect(() => current && fallback && prefabsFilter.update({ language: current.lang }), [current, fallback]);

  useEffect(() => mapRenderer.updateTexture({ preference: mapPreference }), [mapPreference]);
  useEffect(() => {
    mapRenderer.updateTexture({ markerCoords });
    prefabsFilter.update({ markerCoords });
  }, [markerCoords]);

  useEffect(() => prefabsFilter.update({ difficultyFilter }), [difficultyFilter]);
  useDebounce(() => prefabsFilter.update({ prefabNameFilter }), 100, [prefabNameFilter]);
  useDebounce(() => prefabsFilter.update({ blocksUsedFilter: blocksUsedFilter }), 100, [blocksUsedFilter]);
  useDebounce(() => prefabsFilter.update({ prefabTagsFilter: prefabTagsFilter }), 100, [prefabTagsFilter]);

  return (
    <>
      <header>
        <Navbar fixed="top" expand="md" bg={theme ?? 'dark'}>
          <Container fluid>
            <Navbar.Brand>7 Days to Die Map Renderer</Navbar.Brand>
            <Navbar.Collapse>
              <AppNav />
            </Navbar.Collapse>
            <Button variant="" className="d-md-none px-2" onClick={() => setNavMenuShow(!navMenuShow)}>
              <NavbarIcon />
            </Button>
          </Container>
        </Navbar>
      </header>
      <div className="bd-layout">
        <aside className="bd-sidebar thin-scrollbar">
          <Offcanvas responsive="md" placement="end" show={navMenuShow} onHide={() => setNavMenuShow(false)}>
            <Offcanvas.Header closeButton className="mx-3">
              <Offcanvas.Title>Menu</Offcanvas.Title>
              <Navbar className="ms-auto me-3">
                <AppNav />
              </Navbar>
            </Offcanvas.Header>
            <Offcanvas.Body className="thin-scrollbar p-0">
              <MapViewHandleProvider value={mapViewHandle}>
                <MapController />
              </MapViewHandleProvider>
            </Offcanvas.Body>
          </Offcanvas>
        </aside>
        <main className="bd-main">
          <MapView ref={setMapViewHandle} />
        </main>
        <DragDropOverlay />
        <HowToUseModal />
      </div>
    </>
  );
}

export default function Root() {
  return (
    <ErrorBoundary FallbackComponent={ErrorPage}>
      <Suspense fallback={<LoadingSpinner fullscreen>Starting...</LoadingSpinner>}>
        <App />
      </Suspense>
    </ErrorBoundary>
  );
}

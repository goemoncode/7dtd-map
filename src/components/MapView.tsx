import { CSSProperties, MouseEvent, RefAttributes, forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Button, Form } from 'react-bootstrap';
import { useDebounce, usePrevious } from 'react-use';
import { BsFlagFill, BsPlusCircle, BsPlusLg } from 'react-icons/bs';
import { animated, useSpring, useSprings } from '@react-spring/web';
import { createUseGesture, dragAction, wheelAction } from '@use-gesture/react';
import clsx from 'clsx';
import { useAppDispatch, useAppSelector } from '../store';
import { selectMapScale, setMapScale } from '../store/map';
import { selectMatched, selectActivePrefab, setCursorCoords, setMarkerCoords, setActivePrefab, selectCursorCoords } from '../store/prefabs';
import { db } from '../store/db';
import { mapRenderer, prefabsFilter } from '../worker/proxies';
import { gameCoords, gameMapSize } from '../utils';
import { rangeInputSettings, scaleUp } from '../utils/MapPreference';
import { useMapSize } from '../hooks/useMaps';
import { useModal } from '../hooks/useModal';
import { useLoading } from '../hooks/useLoading';
import { MapViewHandle } from '../hooks/useMapView';
import { useTileSearch } from '../hooks/useTileSearch';
import { useContextMenu } from '../hooks/useContextMenu';
import { MatchedPrefab } from '../worker/lib/PrefabsFilter';
import { LoadingOverlay } from './LoadingOverlay';
import { TerrainView } from './TerrainView';
import { MapMetadata } from './MapMetadata';
import { PrefabPopover } from './PrefabPopover';
import { PrefabOffcanvas } from './PrefabOffcanvas';
import { ContextMenu } from './shared/ContextMenu';
import { Distance } from './shared/Distance';
import ScopeSvg from '../assets/scope.svg?react';

const useGesture = createUseGesture([dragAction, wheelAction]);

interface Props {}

export function MapView(_: Props, refHandle: React.Ref<MapViewHandle>) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  const loading = useLoading();
  const dispatch = useAppDispatch();
  const [mapId, mapSize] = useMapSize();
  const [isDragging, setIsDragging] = useState(false);
  const mapScale = useAppSelector(selectMapScale);
  const prevScale = usePrevious(mapScale);
  const matched = useAppSelector(selectMatched);
  const search = useTileSearch(matched, mapSize?.width ?? 0);
  const cursorCoords = useAppSelector(selectCursorCoords);
  const activePrefab = useAppSelector(selectActivePrefab);
  const [offcanvasProps, showOffcanvas] = useModal(PrefabOffcanvas, {});
  const [contextMenuProps, handleContextMenu, handleMenuClick] = useContextMenu<HTMLDivElement>();

  const [containerOffset, setContainerOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [containerStyle, containerApi] = useSpring(() => ({
    x: 0,
    y: 0,
    onChange({ value: { x, y } }) {
      setContainerOffset({ x, y });
    },
  }));
  const [canvasStyle, canvasApi] = useSpring(() => ({
    scale: mapScale,
    width: mapSize?.width ?? 1,
    height: mapSize?.height ?? 1,
    left: -(mapSize?.width ?? 1) / 2,
    top: -(mapSize?.height ?? 1) / 2,
  }));
  const [popoverStyle, popoverApi] = useSpring(() => ({ x: 0, y: 0 }));

  const [prefabsAround, setPrefabsAround] = useState<MatchedPrefab[]>([]);
  const [springs] = useSprings(
    prefabsAround.length,
    (i) => {
      const { x, z, rotation } = prefabsAround[i];
      let { width: w = 1, depth: d = 1 } = prefabsAround[i];
      if (rotation % 2 !== 0) {
        [w, d] = [d, w];
      }
      const width = Math.max(w * mapScale, 10);
      const height = Math.max(d * mapScale, 10);
      return { x: x * mapScale, y: -z * mapScale, width, height, left: -width / 2, top: -height / 2, immediate: true };
    },
    [prefabsAround]
  );

  useDebounce(
    () => {
      const canvas = canvasRef.current;
      if (!canvas || !mapSize) return [];
      const { clientWidth, clientHeight } = document.documentElement;
      const rect = canvas.getBoundingClientRect();
      const left = -(mapSize.width / 2) - rect.left / mapScale;
      const top = mapSize.height / 2 + rect.top / mapScale;
      const right = mapSize.width / 2 - (rect.right - clientWidth) / mapScale;
      const bottom = -(mapSize.height / 2) + (rect.bottom - clientHeight) / mapScale;
      const center = gameCoords({ x: (right + left) / 2, z: (top + bottom) / 2 });
      const prefabs = search(center, 1000);
      setPrefabsAround(prefabs);
    },
    100,
    [search, containerOffset, mapScale]
  );

  useEffect(() => {
    return mapRenderer.addUpdateListener(({ eventName, status }) => {
      if (eventName === 'texture' && status === 'contextlost') {
        location.reload();
      }
    });
  }, [dispatch]);

  useEffect(() => {
    (async () => {
      const mapEntry = await db.Maps.get(mapId);
      if (mapEntry) {
        dispatch(setCursorCoords(null));
        dispatch(setActivePrefab(null));
        setPrefabsAround([]);
        containerApi.start({ x: 0, y: 0 });

        loading(async () => {
          const mapSize = mapEntry.width && mapEntry.height ? gameMapSize(mapEntry) : null;
          mapRenderer.updateTexture(null);
          const {
            elevations = null,
            prefabs = [],
            ...args
          } = await db.getLargeObjects(mapEntry.id, ['biomes', 'splat3', 'splat4', 'radiation', 'spawnpoints', 'prefabs', 'elevations']);
          mapRenderer.updateTexture({ mapSize, ...args, prefabs: [] });
          mapRenderer.sendEvent({ eventName: 'updateTerrain', mapElevations: elevations });
          prefabsFilter.update({ prefabs, markerCoords: null });
        });
      }
    })();
  }, [mapId, dispatch, loading, containerApi]);

  useEffect(() => {
    mapRenderer.updateTexture({ mapSize });
    canvasApi.set({
      width: mapSize?.width ?? 1,
      height: mapSize?.height ?? 1,
      left: -(mapSize?.width ?? 1) / 2,
      top: -(mapSize?.height ?? 1) / 2,
    });
  }, [mapSize, canvasApi]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !prevScale || prevScale === mapScale) return;
    const { width, height } = canvas.getBoundingClientRect();
    const scaleX = (x: number) => canvas.width * mapScale * (x / width);
    const scaleY = (y: number) => canvas.height * mapScale * (y / height);
    containerApi.set({ x: scaleX(containerStyle.x.get()), y: scaleY(containerStyle.y.get()) });
    canvasApi.set({ scale: mapScale });
    popoverApi.set({ x: scaleX(popoverStyle.x.get()), y: scaleY(popoverStyle.y.get()) });
  }, [prevScale, mapScale, containerApi, containerStyle.x, containerStyle.y, canvasApi, popoverApi, popoverStyle.x, popoverStyle.y]);

  useImperativeHandle(
    refHandle,
    () => ({
      canvas: canvasRef.current,
      focusOn: (prefab) => {
        containerApi.start({ x: -prefab.x * mapScale, y: prefab.z * mapScale });
        popoverApi.start({ x: prefab.x * mapScale, y: -prefab.z * mapScale });
        dispatch(setActivePrefab(prefab));
      },
    }),
    [containerApi, popoverApi, dispatch, mapScale]
  );

  useGesture(
    {
      onDrag({ offset: [x, y], tap, dragging, target }) {
        if ((target as HTMLElement).classList.contains('scale-changer')) return;
        if (!tap) {
          containerApi.set({ x, y });
          setIsDragging(dragging ?? false);
        } else {
          setIsDragging(false);
        }
      },
      onWheel({ delta: [, deltaY] }) {
        if (deltaY !== 0) {
          const newScale = scaleUp(mapScale, -deltaY);
          if (mapScale !== newScale) {
            dispatch(setMapScale(newScale));
          }
        }
      },
    },
    {
      target: viewportRef,
      drag: { from: () => [containerStyle.x.get(), containerStyle.y.get()], filterTaps: true },
    }
  );

  return (
    <>
      <div
        id="map-view"
        ref={viewportRef}
        data-bs-theme="dark"
        onMouseMove={handleMouseMove}
        onContextMenu={(event) => {
          if (getMouseCoords(event)) handleContextMenu(event);
        }}
      >
        <animated.div className="map-container" style={containerStyle}>
          <animated.canvas
            ref={canvasRef}
            style={canvasStyle}
            className={clsx({ dragging: isDragging })}
            onClick={() => dispatch(setActivePrefab(null))}
            onDoubleClick={handleDoubleClick}
          />
          {mapSize && (
            <animated.div style={canvasStyle} className="gridlines">
              <MapGrid {...mapSize} />
            </animated.div>
          )}
          {springs.map((style, i) => (
            <animated.div
              key={i}
              style={style}
              className="prefab-pointer"
              data-coords-x={prefabsAround[i].position.x}
              data-coords-z={prefabsAround[i].position.z}
              onClick={(event) => {
                event.stopPropagation();
                dispatch(setActivePrefab(prefabsAround[i]));
                popoverApi.set({ x: style.x.get(), y: style.y.get() });
              }}
            ></animated.div>
          ))}
          {activePrefab && (
            <animated.div className="prefab-popover" style={popoverStyle}>
              <PrefabPopover
                placement="bottom"
                prefab={activePrefab}
                onClick={() => showOffcanvas({ prefab: activePrefab })}
                onClose={() => dispatch(setActivePrefab(null))}
              />
            </animated.div>
          )}
        </animated.div>
        <BsPlusLg className="crosshair" />
        <ScopeSvg className="scope" style={{ '--scope-scale': mapScale } as CSSProperties} />
        <MapMetadata />
        <Button className="move-map-center" variant="dark" title="Move map center" onClick={() => containerApi.start({ x: 0, y: 0 })}>
          <BsPlusCircle className="mx-2 my-3" />
        </Button>
        {mapSize && (
          <div className="scale">
            <Distance as="label" className="fw-bold" value={Math.round(100 / mapScale)} fractionDigits={0} />
            <div className="ruler"></div>
          </div>
        )}
        <Form.Range
          className="scale-changer"
          {...rangeInputSettings.scale}
          title="Change the scale"
          value={mapScale}
          onInput={(event) => dispatch(setMapScale(event.currentTarget.valueAsNumber))}
        />
        {cursorCoords && (
          <div className="cursor-coords fs-sm fw-bold">
            {cursorCoords.x}, {cursorCoords.z}
          </div>
        )}
      </div>
      <LoadingOverlay />
      <TerrainView textureCanvas={canvasRef.current} />
      <PrefabOffcanvas {...offcanvasProps} />
      <ContextMenu {...contextMenuProps}>
        {(event) => (
          <ContextMenu.Menu>
            <ContextMenu.Item
              onClick={handleMenuClick(() => {
                const coords = getMouseCoords(event);
                if (coords) dispatch(setMarkerCoords(coords));
              })}
            >
              <BsFlagFill className="text-primary me-3" />
              Put a flag here
            </ContextMenu.Item>
          </ContextMenu.Menu>
        )}
      </ContextMenu>
    </>
  );

  function getMouseCoords(event: MouseEvent<HTMLDivElement>) {
    if (!mapSize) return null;
    const { clientWidth, clientHeight } = document.documentElement;
    const { pageX, pageY } = event.nativeEvent;
    const [x, z] = [pageX - clientWidth / 2 - containerOffset.x, -pageY + clientHeight / 2 + containerOffset.y];
    const coords = gameCoords({ x: Math.round(x / mapScale), z: Math.round(z / mapScale) });
    if (Math.abs(coords.x) <= mapSize.width / 2 && Math.abs(coords.z) <= mapSize.height / 2) {
      return coords;
    } else {
      return null;
    }
  }

  function handleMouseMove(event: MouseEvent<HTMLDivElement>) {
    dispatch(setCursorCoords(getMouseCoords(event)));
  }

  function handleDoubleClick(event: MouseEvent<HTMLCanvasElement>) {
    if (!mapSize || event.detail !== 2) return;
    const { clientWidth, clientHeight } = document.documentElement;
    const { clientX, clientY } = event;
    const [offsetX, offsetY] = [clientWidth / 2 - clientX, clientHeight / 2 - clientY];
    containerApi.start({ x: containerStyle.x.get() + offsetX, y: containerStyle.y.get() + offsetY });
  }
}

interface MapGridProps {
  width: number;
  height: number;
}

function MapGrid({ width, height }: MapGridProps) {
  const cols = useMemo(() => {
    const n = Math.ceil(width / 2000);
    return n % 2 ? n + 1 : n;
  }, [width]);
  const rows = useMemo(() => {
    const n = Math.ceil(height / 2000);
    return n % 2 ? n + 1 : n;
  }, [height]);
  const calcX = (i: number) => Math.round(((i % cols) - cols / 2) * (width / cols));
  const calcZ = (i: number) => Math.round((rows / 2 - Math.floor(i / cols)) * (height / rows));
  return (
    <div style={{ '--grid-cols': cols, '--grid-rows': rows } as CSSProperties}>
      {new Array(cols * rows).fill(0).map((_, i) => (
        <div key={i}>
          <span className="pa-lt">
            {calcX(i)},{calcZ(i)}
          </span>
          {(i + 1) % cols === 0 && (
            <span className="pa-rt">
              {width / 2},{calcZ(i)}
            </span>
          )}
          {i >= cols * (rows - 1) && (
            <span className="pa-lb">
              {calcX(i + cols)},{calcZ(i + cols)}
            </span>
          )}
          {i === cols * rows - 1 && (
            <span className="pa-rb">
              {width / 2},{-height / 2}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

export default forwardRef(MapView) as (props: Props & RefAttributes<MapViewHandle>) => JSX.Element;

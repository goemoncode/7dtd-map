import { useEffect, useRef } from 'react';
import { CloseButton } from 'react-bootstrap';
import { useWindowSize } from 'react-use';
import clsx from 'clsx';
import { useAppDispatch, useAppSelector } from '../store';
import { selectIsTerrainViewOpen, setIsTerrainViewOpen, setTerrainViewStatus } from '../store/map';
import { mapRenderer } from '../worker/proxies';
import { TerrainViewHud } from './TerrainViewHud';

interface Props {
  textureCanvas: HTMLCanvasElement | null;
}

export function TerrainView({ textureCanvas }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const dispatch = useAppDispatch();
  const { width, height } = useWindowSize();
  const isTerrainViewOpen = useAppSelector(selectIsTerrainViewOpen);

  useEffect(() => {
    mapRenderer.sendEvent({ eventName: 'resize', width, height });
  }, [isTerrainViewOpen, width, height]);

  useEffect(() => {
    return mapRenderer.addUpdateListener(({ eventName, status }) => {
      if (eventName === 'terrain') dispatch(setTerrainViewStatus(status));
    });
  }, [dispatch]);

  useEffect(() => {
    const terrainCanvas = canvasRef.current;
    if (terrainCanvas && textureCanvas && !mapRenderer.initialized) {
      mapRenderer.initialized = true;
      mapRenderer.sendEvent({
        eventName: 'init',
        textureCanvas: textureCanvas.transferControlToOffscreen(),
        terrainCanvas: terrainCanvas.transferControlToOffscreen(),
        devicePixelRatio,
      });
    }
  }, [textureCanvas]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (isTerrainViewOpen) {
      canvas.focus();
      mapRenderer.sendEvent({ eventName: 'renderTerrain', start: true });
    } else {
      mapRenderer.sendEvent({ eventName: 'renderTerrain', start: false });
      canvas.blur();
    }
  }, [isTerrainViewOpen]);

  return (
    <div id="terrain-view" className={clsx({ visible: isTerrainViewOpen })} data-bs-theme="dark">
      <canvas
        ref={canvasRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onWheel={handleWheel}
      ></canvas>
      <TerrainViewHud />
      <CloseButton onClick={() => dispatch(setIsTerrainViewOpen(false))} />
    </div>
  );

  function handleKeyDown({ code }: React.KeyboardEvent<HTMLCanvasElement>) {
    if (isTerrainViewOpen) {
      if (code === 'Escape') {
        dispatch(setIsTerrainViewOpen(false));
      } else {
        mapRenderer.sendEvent({ eventName: 'keydown', code });
      }
    }
  }

  function handleKeyUp({ code }: React.KeyboardEvent<HTMLCanvasElement>) {
    isTerrainViewOpen && mapRenderer.sendEvent({ eventName: 'keyup', code });
  }

  function handleMouseDown(event: React.MouseEvent<HTMLCanvasElement>) {
    const { button, buttons, movementX, movementY } = event;
    isTerrainViewOpen && mapRenderer.sendEvent({ eventName: 'mousedown', button, buttons, movementX, movementY });
  }

  function handleMouseMove(event: React.MouseEvent<HTMLCanvasElement>) {
    const { button, buttons, movementX, movementY } = event;
    isTerrainViewOpen && mapRenderer.sendEvent({ eventName: 'mousemove', button, buttons, movementX, movementY });
  }

  function handleWheel(event: React.WheelEvent<HTMLCanvasElement>) {
    const { deltaY } = event;
    isTerrainViewOpen && mapRenderer.sendEvent({ eventName: 'wheel', deltaY });
  }
}

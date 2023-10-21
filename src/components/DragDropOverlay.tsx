import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { selectMapId } from '../store/map';
import { setHowToUseVisible } from '../store/session';
import { useLoading } from '../hooks/useLoading';
import { usePutFileList } from '../hooks/usePutFile';
import { mapRenderer, mapStatsUpdater, prefabsFilter } from '../worker/proxies';

export function DragDropOverlay() {
  const dispatch = useAppDispatch();
  const mapId = useAppSelector(selectMapId);
  const loading = useLoading();
  const putFileList = usePutFileList();
  const [isDragovered, setIsDragovered] = useState(false);

  useEffect(() => {
    document.addEventListener('dragenter', handleDragEnter);
    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('dragleave', handleDragLeave);
    document.addEventListener('drop', handleDrop);

    return () => {
      document.removeEventListener('dragenter', handleDragEnter);
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('dragleave', handleDragLeave);
      document.removeEventListener('drop', handleDrop);
    };

    function handleDragEnter(event: DragEvent) {
      if (!event.dataTransfer?.types.includes('Files')) return;
      event.preventDefault();
      dispatch(setHowToUseVisible(false));
      setIsDragovered(true);
    }

    function handleDragOver(event: DragEvent) {
      if (!event.dataTransfer?.types.includes('Files')) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
      setIsDragovered(true);
    }

    function handleDragLeave(event: DragEvent) {
      // "dragleave" events raise even if the cursor moved on child nodes.
      // To avoid this case, we should check cursor positions.
      // Those are zero if the cursor moved out from the browser window.
      if (event.clientX !== 0 || event.clientY !== 0) return;
      event.preventDefault();
      setIsDragovered(false);
    }

    async function handleDrop(event: DragEvent) {
      if (!event.dataTransfer?.types.includes('Files')) return;
      event.preventDefault();
      setIsDragovered(false);

      const { files } = event.dataTransfer;
      if (files.length > 0) {
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
  }, [dispatch, loading, mapId, putFileList]);

  return (
    isDragovered && (
      <div id="dragdrop-overlay" data-bs-theme="dark">
        <div className="fs-5">
          <p>Drop world files:</p>
          <ul>
            <li>biomes.png</li>
            <li>splat3.png or splat3_processed.png</li>
            <li>splat4.png or splat4_processed.png</li>
            <li>radiation.png</li>
            <li>map_info.xml</li>
            <li>spawnpoints.xml</li>
            <li>prefabs.xml</li>
            <li>dtm.raw or dtm.png (Required if using Terrain View)</li>
          </ul>
          <p>The rest of files are ignored.</p>
        </div>
      </div>
    )
  );
}

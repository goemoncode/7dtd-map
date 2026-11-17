import { useEffect, useState } from 'react';
import { Alert, Button, Form, InputGroup, Modal, Spinner } from 'react-bootstrap';
import { BsFolder2Open } from 'react-icons/bs';
import { useForm } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { useAppDispatch, useAppSelector } from '../store/index.ts';
import { selectHowToUseVisible, setHowToUseVisible } from '../store/session.ts';
import { selectHasVisitedBefore, setHasVisitedBefore } from '../store/local.ts';
import { db } from '../store/db/index.ts';
import { saveGameDataPath, useGameData } from '../hooks/useGameData.ts';
import { useRefreshGameData } from '../hooks/usePrefabs.ts';

interface FormValues {
  path: string;
}

type FolderPickerStartResult = { taskId: string } | { error: string };
type FolderPickerStatus =
  | { status: 'pending' }
  | { status: 'complete'; path: string | null }
  | { status: 'error'; message: string };
type NativeFolderPicker = {
  start: (initialPath: string) => Promise<FolderPickerStartResult>;
  getStatus: (taskId: string) => Promise<FolderPickerStatus>;
};

export function HowToUseModal() {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const show = useAppSelector(selectHowToUseVisible);
  const hasVisitedBefore = useAppSelector(selectHasVisitedBefore);
  const { data: gameData, error: gameDataError, isLoading: isLoadingGameData } = useGameData();
  const refreshGameData = useRefreshGameData();
  const [rebuildError, setRebuildError] = useState<string | null>(null);
  const [isRebuilding, setIsRebuilding] = useState(false);
  const [isSelectingFolder, setIsSelectingFolder] = useState(false);
  const isDebugBuild = import.meta.env.MODE === 'desktop-debug';
  const {
    register,
    reset,
    handleSubmit,
    setError,
    clearErrors,
    getValues,
    setValue,
    formState: { isSubmitting, errors },
  } = useForm<FormValues>({ defaultValues: { path: '' } });

  useEffect(() => {
    if (!hasVisitedBefore) {
      dispatch(setHowToUseVisible(true));
      dispatch(setHasVisitedBefore(true));
    }
  }, [dispatch, hasVisitedBefore]);

  useEffect(() => {
    reset({ path: gameData?.path ?? '' });
  }, [reset, show, gameData?.path]);

  useEffect(() => {
    if (!isLoadingGameData && gameData && !gameData.ready) {
      dispatch(setHowToUseVisible(true));
    }
  }, [dispatch, gameData, isLoadingGameData]);

  return (
    <Modal dialogClassName='custom-dialog' show={show} onHide={() => dispatch(setHowToUseVisible(false))}>
      <Modal.Header closeButton>
        <Modal.Title>💡 7 Days to Die Data</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>
          The desktop app reads prefab, block, localization, and world data directly from your local 7 Days to Die installation. Steam
          installations are detected automatically when possible.
        </p>
        {gameDataError && <Alert variant='danger'>{gameDataError.message}</Alert>}
        {gameData?.error && <Alert variant='danger'>{gameData.error}</Alert>}
        {gameData?.ready && (
          <Alert variant='success' className='text-break'>
            Game data folder: {gameData.path}
          </Alert>
        )}
        {refreshGameData.isError && <Alert variant='danger'>{refreshGameData.error.message}</Alert>}
        {refreshGameData.isSuccess && (
          <Alert variant='success'>
            Updated {refreshGameData.data.prefabs.length.toLocaleString()} prefabs and their block data.
          </Alert>
        )}
        {rebuildError && <Alert variant='danger'>{rebuildError}</Alert>}
        {!gameData?.ready && !gameData?.error && (
          <Alert variant='info'>Select the game installation folder containing the Data directory.</Alert>
        )}
        <Form noValidate onSubmit={handleSubmit(handleApply)}>
          <Form.Label htmlFor='game-data-path'>Game installation folder</Form.Label>
          <InputGroup className='mb-3' hasValidation>
            <Form.Control
              id='game-data-path'
              type='text'
              placeholder='C:\Program Files (x86)\Steam\steamapps\common\7 Days To Die'
              autoComplete='off'
              {...register('path', { required: 'Enter the game installation folder.' })}
              readOnly={isSubmitting}
              isInvalid={!!errors.path}
            />
            {hasNativeFolderPicker() && (
              <Button
                type='button'
                variant='outline-secondary'
                title='Browse for game installation folder'
                aria-label='Browse for game installation folder'
                onClick={() => void handleSelectFolder()}
                disabled={isSubmitting || isSelectingFolder}
              >
                {isSelectingFolder ? <Spinner size='sm' /> : <BsFolder2Open />}
              </Button>
            )}
            <Button type='submit' disabled={isSubmitting || isSelectingFolder}>
              {isSubmitting ? <Spinner size='sm' /> : 'Save'}
            </Button>
            <Form.Control.Feedback type='invalid'>{errors.path?.message}</Form.Control.Feedback>
          </InputGroup>
          <Form.Text className='d-block mb-3'>
            To find the folder in Steam, open the game properties and choose{' '}
            <strong>Installed Files → Browse</strong>. The preset list includes worlds under <code>Data\Worlds</code>{' '}
            and generated worlds under <code>%APPDATA%\7DaysToDie\GeneratedWorlds</code>.
          </Form.Text>
        </Form>
        <div className='d-flex justify-content-end mb-3'>
          <Button
            variant='outline-primary'
            onClick={() => refreshGameData.mutate()}
            disabled={!gameData?.ready || refreshGameData.isPending || isSubmitting}
          >
            {refreshGameData.isPending && <Spinner size='sm' className='me-2' />}
            {refreshGameData.isPending ? 'Updating game data...' : 'Refresh game data'}
          </Button>
        </div>
        {isDebugBuild && (
          <Alert variant='warning'>
            <p>
              Rebuilding the database deletes all saved maps and locally stored map data. Game data will be loaded again after the app
              restarts.
            </p>
            <div className='d-flex justify-content-end'>
              <Button
                variant='outline-danger'
                onClick={() => void handleRebuildDatabase()}
                disabled={isRebuilding || refreshGameData.isPending || isSubmitting}
              >
                {isRebuilding && <Spinner size='sm' className='me-2' />}
                {isRebuilding ? 'Rebuilding database...' : 'Rebuild database'}
              </Button>
            </div>
          </Alert>
        )}
      </Modal.Body>
    </Modal>
  );

  async function handleApply({ path }: FormValues) {
    try {
      await saveGameDataPath(path);
      await queryClient.invalidateQueries({ queryKey: ['game-data'] });
      await queryClient.invalidateQueries({ queryKey: ['prefabs'] });
      await queryClient.invalidateQueries({ queryKey: ['l10n'] });
      dispatch(setHowToUseVisible(false));
    } catch (error) {
      setError('path', { message: error instanceof Error ? error.message : String(error) });
    }
  }

  async function handleSelectFolder() {
    const folderPicker = getNativeFolderPicker();
    if (!folderPicker) return;
    setIsSelectingFolder(true);
    try {
      const startResult = await folderPicker.start(getValues('path'));
      if ('error' in startResult) throw new Error(startResult.error);
      let status: FolderPickerStatus;
      do {
        await new Promise((resolve) => setTimeout(resolve, 150));
        status = await folderPicker.getStatus(startResult.taskId);
      } while (status.status === 'pending');
      if (status.status === 'error') throw new Error(status.message);
      const selectedPath = status.path;
      if (selectedPath) {
        setValue('path', selectedPath, { shouldDirty: true, shouldValidate: true });
        clearErrors('path');
      }
    } catch (error) {
      setError('path', { message: error instanceof Error ? error.message : String(error) });
    } finally {
      setIsSelectingFolder(false);
    }
  }

  async function handleRebuildDatabase() {
    const confirmed = window.confirm(
      'Delete the entire local database? All saved maps and their loaded map data will be permanently lost.',
    );
    if (!confirmed) return;

    setIsRebuilding(true);
    setRebuildError(null);
    try {
      await db.delete();
      window.location.reload();
    } catch (error) {
      setIsRebuilding(false);
      setRebuildError(`Could not rebuild the database: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  function getNativeFolderPicker() {
    const nativeWindow = window as Window & {
      selectGameFolder?: (initialPath: string) => Promise<FolderPickerStartResult>;
      getGameFolderSelection?: (taskId: string) => Promise<FolderPickerStatus>;
    };
    if (!nativeWindow.selectGameFolder || !nativeWindow.getGameFolderSelection) return undefined;
    return {
      start: nativeWindow.selectGameFolder,
      getStatus: nativeWindow.getGameFolderSelection,
    } satisfies NativeFolderPicker;
  }

  function hasNativeFolderPicker() {
    return !!getNativeFolderPicker();
  }
}

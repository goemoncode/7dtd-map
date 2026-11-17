/// <reference lib="deno.ns" />

import type { Webview } from '@webview/webview';
import type { WindowsHostWindow } from './WindowsHostWindow.ts';

type FolderPickerStatus =
  | { status: 'pending' }
  | { status: 'complete'; path: string | null }
  | { status: 'error'; message: string };

type FolderPickerTask = {
  resultPath: string;
  process: Deno.ChildProcess;
};

export interface DesktopWebviewFunctions {
  desktopReady: () => boolean;
  selectGameFolder: (initialPath: unknown) => { taskId: string } | { error: string };
  getGameFolderSelection: (taskId: unknown) => FolderPickerStatus;
}

export class DesktopWebviewBindings {
  private readonly folderPickerTasks = new Map<string, FolderPickerTask>();
  readonly functions: DesktopWebviewFunctions;

  constructor(
    private readonly hostWindow: WindowsHostWindow,
    private readonly folderPickerScriptPath: string,
  ) {
    this.functions = {
      desktopReady: () => {
        this.hostWindow.show();
        return true;
      },
      selectGameFolder: (initialPath) => this.selectGameFolder(initialPath),
      getGameFolderSelection: (taskId) => this.getGameFolderSelection(taskId),
    };
  }

  close(): void {
    for (const task of this.folderPickerTasks.values()) {
      try {
        task.process.kill();
      } catch (error) {
        console.error('Could not stop the folder picker process.', error);
      }
      try {
        Deno.removeSync(task.resultPath);
      } catch (error) {
        if (!(error instanceof Deno.errors.NotFound)) {
          console.error('Could not remove the folder picker result file.', error);
        }
      }
    }
    this.folderPickerTasks.clear();
  }

  private selectGameFolder(initialPath: unknown): { taskId: string } | { error: string } {
    if (typeof initialPath !== 'string') return { error: 'The initial folder path must be a string.' };
    try {
      const taskId = crypto.randomUUID();
      const resultPath = Deno.makeTempFileSync({ prefix: '7dtd-map-folder-picker-', suffix: '.json' });
      try {
        const process = startWindowsFolderPicker(
          initialPath,
          this.hostWindow.handle,
          resultPath,
          this.folderPickerScriptPath,
        );
        this.folderPickerTasks.set(taskId, { resultPath, process });
        return { taskId };
      } catch (error) {
        Deno.removeSync(resultPath);
        throw error;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Could not start the game folder picker.', error);
      return { error: message };
    }
  }

  private getGameFolderSelection(taskId: unknown): FolderPickerStatus {
    if (typeof taskId !== 'string') return { status: 'error', message: 'The folder picker task ID must be a string.' };
    const task = this.folderPickerTasks.get(taskId);
    if (!task) return { status: 'error', message: 'The folder picker task could not be found.' };
    try {
      const result = Deno.readTextFileSync(task.resultPath);
      if (!result) return { status: 'pending' };
      const parsed: unknown = JSON.parse(result);
      if (!isFolderPickerStatus(parsed) || parsed.status === 'pending') {
        throw new Error('The folder picker returned an invalid result.');
      }
      this.folderPickerTasks.delete(taskId);
      Deno.removeSync(task.resultPath);
      return parsed;
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) return { status: 'pending' };
      this.folderPickerTasks.delete(taskId);
      try {
        Deno.removeSync(task.resultPath);
      } catch (cleanupError) {
        console.error('Could not remove the folder picker result file.', cleanupError);
      }
      const message = error instanceof Error ? error.message : String(error);
      console.error('Could not read the game folder picker result.', error);
      return { status: 'error', message };
    }
  }
}

export function bindWebviewFunctions(
  webview: Pick<Webview, 'bind'>,
  functions: DesktopWebviewFunctions,
): void {
  for (const name of Object.keys(functions) as Array<keyof DesktopWebviewFunctions & string>) {
    webview.bind(name, functions[name]);
  }
}

function isFolderPickerStatus(value: unknown): value is FolderPickerStatus {
  if (typeof value !== 'object' || value === null || !('status' in value)) return false;
  const status = value as Record<string, unknown>;
  return status.status === 'pending' ||
    (status.status === 'complete' && (status.path === null || typeof status.path === 'string')) ||
    (status.status === 'error' && typeof status.message === 'string');
}

function startWindowsFolderPicker(
  initialPath: string,
  ownerWindow: Deno.PointerValue,
  resultPath: string,
  scriptPath: string,
): Deno.ChildProcess {
  const ownerHandle = Deno.UnsafePointer.value(ownerWindow);
  if (ownerHandle === null) throw new Error('Could not get the desktop window handle for the folder picker.');
  const command = new Deno.Command('powershell.exe', {
    args: [
      '-NoLogo',
      '-NoProfile',
      '-NonInteractive',
      '-STA',
      '-WindowStyle',
      'Hidden',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      scriptPath,
    ],
    env: {
      SEVEN_DAYS_TO_DIE_INITIAL_PATH: initialPath,
      SEVEN_DAYS_TO_DIE_OWNER_HANDLE: ownerHandle.toString(),
      SEVEN_DAYS_TO_DIE_RESULT_PATH: resultPath,
    },
    stdin: 'null',
    stdout: 'null',
    stderr: 'null',
  });
  const process = command.spawn();
  process.unref();
  return process;
}

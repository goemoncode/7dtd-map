/// <reference lib="deno.ns" />

const desktopDistUrl = new URL('../../dist-desktop/', import.meta.url);
await Deno.stat(new URL('index.html', desktopDistUrl));
const desktopDistPath = await Deno.realPath(desktopDistUrl);

interface WindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface DesktopAppState {
  windowBounds: WindowBounds;
}

function isWindowBounds(value: unknown): value is WindowBounds {
  if (typeof value !== 'object' || value === null) return false;
  const bounds = value as Record<string, unknown>;
  return typeof bounds.x === 'number' && Number.isSafeInteger(bounds.x) &&
    typeof bounds.y === 'number' && Number.isSafeInteger(bounds.y) &&
    typeof bounds.width === 'number' && Number.isSafeInteger(bounds.width) && bounds.width >= 320 &&
    typeof bounds.height === 'number' && Number.isSafeInteger(bounds.height) && bounds.height >= 240;
}

function getWindowBounds(value: unknown): WindowBounds | null {
  if (typeof value !== 'object' || value === null) return null;
  const state = value as Record<string, unknown>;
  return isWindowBounds(state.windowBounds) ? state.windowBounds : null;
}

// Keep WebView's Windows loader DLL inside the generated desktop output directory.
await Deno.chdir(desktopDistPath);

const nativeLibraryUrl = new URL('native/', desktopDistUrl);
const bundledLibraries = await Promise.all(
  ['webview.dll', 'WebView2Loader.dll'].map(async (filename) => {
    try {
      await Deno.stat(new URL(filename, nativeLibraryUrl));
      return true;
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) return false;
      throw error;
    }
  }),
);
if (bundledLibraries.some(Boolean) && !bundledLibraries.every(Boolean)) {
  throw new Error('The bundled WebView native libraries are incomplete.');
}
if (bundledLibraries.every(Boolean)) {
  Deno.env.set('PLUGIN_URL', nativeLibraryUrl.href);
}

const serverWorker = new Worker(new URL('./server.worker.ts', import.meta.url), { type: 'module' });

try {
  const serverUrl = await new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timed out while starting the desktop web server.')), 10_000);

    serverWorker.onmessage = ({ data }: MessageEvent<{ type: string; url?: string; message?: string }>) => {
      clearTimeout(timeout);
      if (data.type === 'ready' && data.url) {
        resolve(data.url);
      } else {
        reject(new Error(data.message ?? 'The desktop web server failed to start.'));
      }
    };
    serverWorker.onerror = (event) => {
      clearTimeout(timeout);
      reject(new Error(event.message));
    };
    serverWorker.postMessage({ distUrl: desktopDistUrl.href });
  });

  const { SizeHint, Webview } = await import('@webview/webview');
  if (Deno.build.os === 'windows') {
    const appDataPath = Deno.env.get('APPDATA');
    if (!appDataPath) {
      throw new Error('Could not locate the Windows roaming application data directory.');
    }
    const stateDirectory = `${appDataPath}\\7dtd-map`;
    const statePath = `${stateDirectory}\\app-state.json`;
    Deno.mkdirSync(stateDirectory, { recursive: true });

    let savedBounds: WindowBounds | null = null;
    try {
      const stateContents = Deno.readTextFileSync(statePath);
      try {
        const parsed: unknown = JSON.parse(stateContents);
        savedBounds = getWindowBounds(parsed);
        if (!savedBounds) console.warn(`Ignoring invalid saved desktop state at ${statePath}.`);
      } catch (error) {
        if (!(error instanceof SyntaxError)) throw error;
        console.warn(`Ignoring malformed saved desktop state at ${statePath}.`, error);
      }
    } catch (error) {
      if (!(error instanceof Deno.errors.NotFound)) throw error;
    }

    const user32 = Deno.dlopen('user32.dll', {
      AdjustWindowRectEx: { parameters: ['buffer', 'u32', 'i32', 'u32'], result: 'i32' },
      CreateWindowExW: {
        parameters: [
          'u32',
          'pointer',
          'pointer',
          'u32',
          'i32',
          'i32',
          'i32',
          'i32',
          'pointer',
          'pointer',
          'pointer',
          'pointer',
        ],
        result: 'pointer',
      },
      DefWindowProcW: { parameters: ['pointer', 'u32', 'pointer', 'pointer'], result: 'pointer' },
      DestroyWindow: { parameters: ['pointer'], result: 'i32' },
      FindWindowExW: { parameters: ['pointer', 'pointer', 'pointer', 'pointer'], result: 'pointer' },
      GetClientRect: { parameters: ['pointer', 'buffer'], result: 'i32' },
      GetWindowRect: { parameters: ['pointer', 'buffer'], result: 'i32' },
      GetSystemMetrics: { parameters: ['i32'], result: 'i32' },
      PostQuitMessage: { parameters: ['i32'], result: 'void' },
      RegisterClassExW: { parameters: ['buffer'], result: 'u16' },
      SetWindowPos: { parameters: ['pointer', 'pointer', 'i32', 'i32', 'i32', 'i32', 'u32'], result: 'i32' },
      ShowWindow: { parameters: ['pointer', 'i32'], result: 'i32' },
      UpdateWindow: { parameters: ['pointer'], result: 'i32' },
    });
    const kernel32 = Deno.dlopen('kernel32.dll', {
      GetLastError: { parameters: [], result: 'u32' },
      GetModuleHandleW: { parameters: ['pointer'], result: 'pointer' },
    });
    const ole32 = Deno.dlopen('ole32.dll', {
      CoInitializeEx: { parameters: ['pointer', 'u32'], result: 'i32' },
      CoUninitialize: { parameters: [], result: 'void' },
    });
    const coInitResult = ole32.symbols.CoInitializeEx(null, 0x2);
    if (coInitResult < 0) {
      ole32.close();
      kernel32.close();
      user32.close();
      throw new Error(`Could not initialize COM for the WebView (HRESULT 0x${(coInitResult >>> 0).toString(16)}).`);
    }

    const toWideString = (value: string) => {
      const result = new Uint16Array(value.length + 1);
      for (let i = 0; i < value.length; i++) result[i] = value.charCodeAt(i);
      return result;
    };
    const className = toWideString('7dtd-map-window');
    const classNamePointer = Deno.UnsafePointer.of(className);
    const childClassNameBuffer = toWideString('webview_widget');
    const childClassName = Deno.UnsafePointer.of(childClassNameBuffer);

    const instance = kernel32.symbols.GetModuleHandleW(null);
    if (instance === null) {
      ole32.symbols.CoUninitialize();
      ole32.close();
      kernel32.close();
      user32.close();
      throw new Error('Could not get the desktop application module handle.');
    }

    let hostWindow: Deno.PointerValue = null;
    const resizeChild = (width: number, height: number) => {
      if (hostWindow === null) return false;
      // The WebView handle is the host HWND; its internal widget is a separate child window.
      const childWindow = user32.symbols.FindWindowExW(hostWindow, null, childClassName, null);
      if (childWindow === null || width <= 0 || height <= 0) return false;
      return user32.symbols.SetWindowPos(childWindow, null, 0, 0, width, height, 0x0014) !== 0;
    };
    const wndProc = new Deno.UnsafeCallback(
      { parameters: ['pointer', 'u32', 'pointer', 'pointer'], result: 'pointer' },
      (window, message, wParam, lParam) => {
        if (message === 0x0005 && lParam !== null) {
          const dimensions = Deno.UnsafePointer.value(lParam);
          resizeChild(Number(dimensions & 0xffffn), Number((dimensions >> 16n) & 0xffffn));
          return null;
        }
        if (message === 0x0010) {
          const windowBounds = new Uint8Array(16);
          if (window !== null && user32.symbols.GetWindowRect(window, windowBounds)) {
            const rect = new DataView(windowBounds.buffer);
            try {
              Deno.writeTextFileSync(
                statePath,
                JSON.stringify(
                  {
                    windowBounds: {
                      x: rect.getInt32(0, true),
                      y: rect.getInt32(4, true),
                      width: rect.getInt32(8, true) - rect.getInt32(0, true),
                      height: rect.getInt32(12, true) - rect.getInt32(4, true),
                    },
                  } satisfies DesktopAppState,
                ),
              );
            } catch (error) {
              console.error('Could not save the desktop window bounds.', error);
            }
          } else {
            console.error('Could not read the desktop window bounds before closing.');
          }
          if (window !== null) user32.symbols.DestroyWindow(window);
          return null;
        }
        if (message === 0x0002) {
          user32.symbols.PostQuitMessage(0);
          return null;
        }
        return user32.symbols.DefWindowProcW(window, message, wParam, lParam);
      },
    );
    const windowClass = new Uint8Array(80);
    const classView = new DataView(windowClass.buffer);
    classView.setUint32(0, windowClass.byteLength, true);
    classView.setUint32(4, 0x0003, true);
    classView.setBigUint64(8, Deno.UnsafePointer.value(wndProc.pointer), true);
    classView.setBigUint64(24, Deno.UnsafePointer.value(instance), true);
    classView.setBigUint64(48, 6n, true);
    classView.setBigUint64(64, Deno.UnsafePointer.value(classNamePointer), true);

    try {
      if (user32.symbols.RegisterClassExW(windowClass) === 0) {
        throw new Error(`Could not register the desktop window class (Win32 error ${kernel32.symbols.GetLastError()}).`);
      }

      const style = 0x00cf0000;
      const outerBounds = new Uint8Array(16);
      new DataView(outerBounds.buffer).setInt32(8, 960, true);
      new DataView(outerBounds.buffer).setInt32(12, 640, true);
      if (!user32.symbols.AdjustWindowRectEx(outerBounds, style, 0, 0)) {
        throw new Error(`Could not calculate the desktop window size (Win32 error ${kernel32.symbols.GetLastError()}).`);
      }
      const bounds = new DataView(outerBounds.buffer);
      const defaultWidth = bounds.getInt32(8, true) - bounds.getInt32(0, true);
      const defaultHeight = bounds.getInt32(12, true) - bounds.getInt32(4, true);
      const virtualLeft = user32.symbols.GetSystemMetrics(76);
      const virtualTop = user32.symbols.GetSystemMetrics(77);
      const virtualWidth = user32.symbols.GetSystemMetrics(78);
      const virtualHeight = user32.symbols.GetSystemMetrics(79);
      const width = Math.min(savedBounds?.width ?? defaultWidth, virtualWidth);
      const height = Math.min(savedBounds?.height ?? defaultHeight, virtualHeight);
      const x = Math.max(
        virtualLeft,
        Math.min(
          savedBounds?.x ?? Math.floor(virtualLeft + (virtualWidth - width) / 2),
          virtualLeft + virtualWidth - width,
        ),
      );
      const y = Math.max(
        virtualTop,
        Math.min(
          savedBounds?.y ?? Math.floor(virtualTop + (virtualHeight - height) / 2),
          virtualTop + virtualHeight - height,
        ),
      );
      hostWindow = user32.symbols.CreateWindowExW(
        0,
        classNamePointer,
        Deno.UnsafePointer.of(toWideString('7 Days to Die Map Renderer')),
        style,
        x,
        y,
        width,
        height,
        null,
        null,
        instance,
        null,
      );
      if (hostWindow === null) {
        throw new Error(`Could not create the hidden desktop window (Win32 error ${kernel32.symbols.GetLastError()}).`);
      }

      const webview = new Webview(false, { width: 960, height: 640, hint: SizeHint.NONE }, hostWindow);
      const positionFlags = 0x0010;
      if (!user32.symbols.SetWindowPos(hostWindow, null, x, y, width, height, positionFlags)) {
        throw new Error(`Could not size the desktop window (Win32 error ${kernel32.symbols.GetLastError()}).`);
      }
      const clientRectBuffer = new Uint8Array(16);
      if (!user32.symbols.GetClientRect(hostWindow, clientRectBuffer)) {
        throw new Error(`Could not read the desktop window client area (Win32 error ${kernel32.symbols.GetLastError()}).`);
      }
      const clientRect = new DataView(clientRectBuffer.buffer);
      if (
        !resizeChild(
          clientRect.getInt32(8, true) - clientRect.getInt32(0, true),
          clientRect.getInt32(12, true) - clientRect.getInt32(4, true),
        )
      ) {
        throw new Error('Could not size the embedded WebView.');
      }
      webview.title = '7 Days to Die Map Renderer';
      webview.bind('desktopReady', () => {
        if (hostWindow !== null) {
          user32.symbols.ShowWindow(hostWindow, 5);
          user32.symbols.UpdateWindow(hostWindow);
        }
        return true;
      });
      webview.navigate(serverUrl);
      webview.run();
    } finally {
      if (hostWindow !== null) user32.symbols.DestroyWindow(hostWindow);
      wndProc.close();
      ole32.symbols.CoUninitialize();
      ole32.close();
      kernel32.close();
      user32.close();
    }
  } else {
    const webview = new Webview(false, { width: 960, height: 640, hint: SizeHint.NONE });
    webview.title = '7 Days to Die Map Renderer';
    webview.navigate(serverUrl);
    webview.run();
  }
} finally {
  serverWorker.terminate();
}

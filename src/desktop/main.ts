/// <reference lib="deno.ns" />

import { WindowsHostWindow } from './WindowsHostWindow.ts';
import { bindWebviewFunctions, DesktopWebviewBindings } from './WebviewBindings.ts';
import { startViteDevServer, stopViteDevServer } from './viteDevServer.ts';

const desktopDistUrl = new URL('../../dist-desktop/', import.meta.url);
await Deno.stat(new URL('index.html', desktopDistUrl));
const desktopDistPath = await Deno.realPath(desktopDistUrl);
const enableWebviewDevTools = Deno.env.get('7DTD_MAP_DEBUG') === '1';

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
let viteDevServer: Awaited<ReturnType<typeof startViteDevServer>> | null = null;

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
  let viteDevServerUrl: string | null = null;
  if (Deno.env.get('7DTD_MAP_HMR') === '1') {
    viteDevServer = await startViteDevServer();
    viteDevServerUrl = viteDevServer.url;
  }

  const { SizeHint, Webview } = await import('@webview/webview');
  const webviewUrl = viteDevServerUrl ?? serverUrl;
  if (Deno.build.os === 'windows') {
    const appDataPath = Deno.env.get('APPDATA');
    if (!appDataPath) {
      throw new Error('Could not locate the Windows roaming application data directory.');
    }

    const folderPickerScriptPath = await Deno.realPath(new URL('folder-picker.ps1', desktopDistUrl));
    const hostWindowOptions = {
      className: '7dtd-map-window',
      childWindowClassName: 'webview_widget',
      stateFilePath: `${appDataPath}\\7dtd-map\\app-state.json`,
      title: '7 Days to Die Map Renderer',
      initialWidth: 960,
      initialHeight: 640,
    } as const;
    const hostWindow = WindowsHostWindow.create(hostWindowOptions);
    const bindings = new DesktopWebviewBindings(hostWindow, folderPickerScriptPath);
    try {
      const webview = new Webview(
        enableWebviewDevTools,
        { width: hostWindowOptions.initialWidth, height: hostWindowOptions.initialHeight, hint: SizeHint.NONE },
        hostWindow.handle,
      );
      hostWindow.resizeWebview();
      webview.title = hostWindowOptions.title;
      bindWebviewFunctions(webview, bindings.functions);
      webview.navigate(webviewUrl);
      webview.run();
    } finally {
      bindings.close();
      hostWindow.close();
    }
  } else {
    const webview = new Webview(enableWebviewDevTools, { width: 960, height: 640, hint: SizeHint.NONE });
    webview.title = '7 Days to Die Map Renderer';
    webview.navigate(webviewUrl);
    webview.run();
  }
} finally {
  try {
    if (viteDevServer) await stopViteDevServer(viteDevServer.process);
  } finally {
    serverWorker.terminate();
  }
}

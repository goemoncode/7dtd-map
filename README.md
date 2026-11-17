# 7 Days to Die Map Renderer

Desktop map renderer for 7 Days to Die. Prefab, block, localization, and preset-world data is read from the local game installation; the app
no longer downloads game data from 7dtd-tools or another external data source.

## Development (Deno)

This project runs on [Deno](https://deno.com/) (Deno 2.x+).

```bash
deno install
deno task build
deno task check
deno task lint
deno task fmt
```

## Windows desktop app (Deno WebView)

Install [Deno 2](https://deno.com/), the Microsoft Edge WebView2 Runtime, and 7 Days to Die, then run:

```bash
deno task desktop
```

This builds the desktop assets into `dist-desktop/` and opens the app in a native WebView window. The app detects Steam libraries and uses
the installed game files directly. If automatic detection fails, open the help dialog and set the folder that contains `Data\Prefabs`,
`Data\Config\Localization.csv`, and `Data\Worlds`. The selected path is stored in `%APPDATA%\7dtd-map\game-data.json`. On Windows, use the
folder button beside the path field to open the native folder picker. The map-load dropdown lists both installed worlds from `Data\Worlds`
and user-generated worlds from `%APPDATA%\7DaysToDie\GeneratedWorlds`.

### Debug in VS Code

Select **Desktop: Debug** in the Run and Debug view and press **F5**. VS Code builds the app with source maps, starts a Vite development
server, and launches `src/desktop/main.ts` under the Deno debugger. Changes to React and SCSS files are applied through HMR; changes to the
Deno desktop process require restarting the debug session. The WebView developer tools are enabled only for this launch; use the WebView's
developer-tools shortcut to inspect the UI. To debug the frontend in a browser, start the app with **Desktop: Debug** first, then select
**Web UI: Attach to desktop**. The browser configuration attaches to the Vite development server.

The equivalent terminal command is `deno task desktop:debug`; it also starts the HMR server. To debug the main process manually, run
`deno run --inspect-brk=127.0.0.1:9229 --unstable-ffi -A src/desktop/debug.ts` after building with `deno task desktop:debug:build`, then
attach VS Code to `127.0.0.1:9229`.

The debug build's **Rebuild database** action deletes the IndexedDB database, including saved maps and loaded map data, and recreates it
when the app reloads. If a database from a newer schema is found, the debug build asks before deleting it so it can start with the current
schema.

To create a single-file Windows executable, run:

```bash
deno task desktop:exe
```

The self-contained executable is written to `release/7dtd-map.exe`; it includes the app assets and WebView native libraries, so Deno is not
required on the target PC. It opens at 960x640 after the page finishes loading; the window stays hidden during startup to avoid exposing the
WebView's intermediate size. The window position and size are saved on close to `%APPDATA%\7dtd-map\app-state.json` and restored on the next
launch. If a saved position no longer fits the current display layout, it is brought back on screen. It runs as a GUI application without
opening a command prompt. The Microsoft Edge WebView2 Runtime is still required. Building the executable requires an internet connection to
download the pinned WebView libraries. On first launch, Deno extracts its embedded files to its per-user application data directory. The app
uses a fixed local port to preserve browser storage between launches; if that port is already in use, the app reports an error instead of
opening an unrelated local service.

## Credits

- Inspired by the original logic of [kui/7dtd-map](https://github.com/kui/7dtd-map).

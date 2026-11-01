# 7 Days to Die Map Renderer

Map renderer for 7 Days to Die.

- https://goemoncode.github.io/7dtd-map/

## External prefab data

The app reads `manifest.json` beside the prefab `index.json`. For schema version 1, it uses `dataVersion` to refresh its IndexedDB cache and
verifies downloaded JSON against the manifest's SHA-256 checksums. If the manifest is unavailable (for example, for an older custom data
source), the app continues to load the JSON files directly. When a refresh fails, the last successfully cached data remains available. The
Reset action clears this cache.

## Development (Deno)

This project runs on [Deno](https://deno.com/) (Deno 2.x+).

```bash
# 依存関係のインストール / キャッシュ
deno install

# 開発サーバーの起動
deno task dev

# プロダクションビルド
deno task build

# プレビューサーバーの起動
deno task preview

# 型チェック
deno task check

# コードの静的解析 (Linter)
deno task lint

# フォーマット
deno task fmt
```

## Windows desktop app (Deno WebView)

Install [Deno 2](https://deno.com/) and the Microsoft Edge WebView2 Runtime, then run:

```bash
deno task desktop
```

This builds the desktop assets into `dist-desktop/` and opens the app in a native WebView window. The desktop build is separate from the
website build, so it does not change the GitHub Pages output in `dist/`. The first launch needs an internet connection to download the
WebView native library.

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

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

## Credits

- Inspired by the original logic of [kui/7dtd-map](https://github.com/kui/7dtd-map).
